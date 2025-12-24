import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          id,
          name
        ),
        sales_items (
          id,
          quantity,
          unit_price,
          subtotal,
          finished_products (
            id,
            name
          )
        )
      `)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { customer_id, sale_date, items, notes, is_cash_paid, discount_type, discount_value } = body;
    const isCashPaid = is_cash_paid === true || is_cash_paid === 'true';

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unit_price) * parseInt(item.quantity));
    }, 0);

    // Calculate discount
    let discountAmount = 0;
    if (discount_type && discount_type !== 'none' && discount_value) {
      const discountVal = parseFloat(discount_value) || 0;
      if (discount_type === 'percentage') {
        discountAmount = (subtotal * discountVal) / 100;
      } else {
        discountAmount = Math.min(discountVal, subtotal);
      }
    }

    // Calculate total
    const totalAmount = subtotal - discountAmount;

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer_id || null,
        sale_date: sale_date || new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        subtotal: subtotal,
        discount_type: discount_type || null,
        discount_value: discount_value ? parseFloat(discount_value) : null,
        discount_amount: discountAmount,
        notes: notes || null,
        is_cash_paid: is_cash_paid || false,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items and update inventory
    const consumeBatchStock = async (finishedProductId: string, quantity: number) => {
      let remaining = quantity;
      const { data: batches } = await supabase
        .from('batch_tracking')
        .select('id, quantity_remaining, status')
        .eq('finished_product_id', finishedProductId)
        .gt('quantity_remaining', 0)
        .order('production_date', { ascending: true })
        .order('created_at', { ascending: true });

      for (const batch of batches || []) {
        if (remaining <= 0) break;
        const deduction = Math.min(batch.quantity_remaining, remaining);
        const newQuantity = Math.max(batch.quantity_remaining - deduction, 0);
        remaining -= deduction;
        const updatedStatus = newQuantity <= 0 ? 'depleted' : batch.status || 'active';

        await supabase
          .from('batch_tracking')
          .update({ quantity_remaining: newQuantity, status: updatedStatus })
          .eq('id', batch.id);
      }

      if (remaining > 0) {
        console.warn(`Batch depletion shortfall: ${remaining} units of ${finishedProductId} could not be consumed`);
      }
    };

    const saleItems = [];
    for (const item of items) {
      // Check inventory - create record if it doesn't exist
      const { data: inventory, error: invError } = await supabase
        .from('finished_product_inventory')
        .select('quantity')
        .eq('finished_product_id', item.finished_product_id)
        .single();

      // If inventory record doesn't exist, create it with 0 quantity
      let available = 0;
      if (invError && invError.code === 'PGRST116') {
        // Record doesn't exist, create it
        const { error: createError } = await supabase
          .from('finished_product_inventory')
          .insert({
            finished_product_id: item.finished_product_id,
            quantity: 0,
          });
        if (createError) throw createError;
        available = 0;
      } else if (inventory) {
        available = inventory.quantity || 0;
      }

      const requested = parseInt(item.quantity);

      // Validate negative inventory
      if (requested <= 0) {
        await supabase.from('sales').delete().eq('id', sale.id);
        return NextResponse.json(
          { error: `Invalid quantity for product. Quantity must be greater than 0.` },
          { status: 400 }
        );
      }

      if (available < requested) {
        // Rollback sale
        await supabase.from('sales').delete().eq('id', sale.id);
        return NextResponse.json(
          { error: `Insufficient inventory for product. Available: ${available}, Requested: ${requested}` },
          { status: 400 }
        );
      }

      // Create sale item
      const subtotal = parseFloat(item.unit_price) * requested;
      const { data: saleItem, error: itemError } = await supabase
        .from('sales_items')
        .insert({
          sale_id: sale.id,
          finished_product_id: item.finished_product_id,
          quantity: requested,
          unit_price: parseFloat(item.unit_price),
          subtotal,
        })
        .select()
        .single();

      if (itemError) throw itemError;
      saleItems.push(saleItem);

      // Update batch tracking before inventory snapshot
      await consumeBatchStock(item.finished_product_id, requested);

      // Update inventory (deduct)
      await supabase
        .from('finished_product_inventory')
        .upsert({
          finished_product_id: item.finished_product_id,
          quantity: available - requested,
        }, {
          onConflict: 'finished_product_id'
        });
    }

    if (customer_id) {
      const { data: ledgerEntries } = await supabase
        .from('customer_ledger')
        .select('balance, id')
        .eq('customer_id', customer_id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1);

      const currentBalance = ledgerEntries?.[0]?.balance || 0;
      const saleBalance = currentBalance + totalAmount;
      const baseNotes = (notes || '').trim();
      const saleNote = isCashPaid
        ? baseNotes
          ? `${baseNotes} (Cash sale)`
          : 'Cash sale'
        : baseNotes || null;

      await supabase
        .from('customer_ledger')
        .insert({
          customer_id,
          sale_id: sale.id,
          transaction_type: 'sale',
          amount: totalAmount,
          balance: saleBalance,
          transaction_date: sale_date || new Date().toISOString().split('T')[0],
          notes: saleNote,
        });

      if (isCashPaid) {
        const paymentBalance = saleBalance - totalAmount;
        const paymentNote = baseNotes
          ? `${baseNotes} (Cash settlement)`
          : 'Cash settlement';
        await supabase
          .from('customer_ledger')
          .insert({
            customer_id,
            sale_id: sale.id,
            transaction_type: 'payment',
            amount: totalAmount,
            balance: paymentBalance,
            transaction_date: sale_date || new Date().toISOString().split('T')[0],
            notes: paymentNote,
          });
      }
    }

    return NextResponse.json({ ...sale, sales_items: saleItems });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


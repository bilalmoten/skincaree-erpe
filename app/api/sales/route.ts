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
      .order('sale_date', { ascending: false });

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

    const { customer_id, sale_date, items, notes } = body;

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unit_price) * parseInt(item.quantity));
    }, 0);

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id: customer_id || null,
        sale_date: sale_date || new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        notes: notes || null,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Create sale items and update inventory
    const saleItems = [];
    for (const item of items) {
      // Check inventory
      const { data: inventory } = await supabase
        .from('finished_product_inventory')
        .select('quantity')
        .eq('finished_product_id', item.finished_product_id)
        .single();

      const available = inventory?.quantity || 0;
      const requested = parseInt(item.quantity);

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

      // Update inventory (deduct)
      await supabase
        .from('finished_product_inventory')
        .upsert({
          finished_product_id: item.finished_product_id,
          quantity: available - requested,
        });
    }

    // Add to customer ledger if customer exists
    if (customer_id) {
      // Get current balance
      const { data: ledgerEntries } = await supabase
        .from('customer_ledger')
        .select('balance')
        .eq('customer_id', customer_id)
        .order('created_at', { ascending: false })
        .limit(1);

      const currentBalance = ledgerEntries?.[0]?.balance || 0;
      const newBalance = currentBalance + totalAmount;

      await supabase
        .from('customer_ledger')
        .insert({
          customer_id,
          sale_id: sale.id,
          transaction_type: 'sale',
          amount: totalAmount,
          balance: newBalance,
          transaction_date: sale_date || new Date().toISOString().split('T')[0],
        });
    }

    return NextResponse.json({ ...sale, sales_items: saleItems });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


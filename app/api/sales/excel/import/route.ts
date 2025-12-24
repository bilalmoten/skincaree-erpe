import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const [{ data: customers }, { data: products }] = await Promise.all([
      supabase.from('customers').select('id, name'),
      supabase.from('finished_products').select('id, name'),
    ]);

    const customerMap = new Map(customers?.map((c: any) => [c.name.toLowerCase(), c.id]) || []);
    const productMap = new Map(products?.map((p: any) => [p.name.toLowerCase(), p.id]) || []);

    const imported = [];
    const errors = [];

    // Group items by customer and date
    const groupedSales = new Map();

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const key = `${row.customer_name}-${row.sale_date}-${row.notes}`;
      
      if (!groupedSales.has(key)) {
        groupedSales.set(key, {
          customer_name: row.customer_name,
          sale_date: row.sale_date || new Date().toISOString().split('T')[0],
          is_cash_paid: row.is_cash_paid === 'true' || row.is_cash_paid === true,
          notes: row.notes || 'Imported from Excel',
          items: []
        });
      }
      
      const productId = productMap.get(row.product_name?.toLowerCase());
      if (!productId) {
        errors.push(`Row ${i + 2}: Product "${row.product_name}" not found`);
        continue;
      }

      groupedSales.get(key).items.push({
        finished_product_id: productId,
        quantity: parseInt(row.quantity),
        unit_price: parseFloat(row.unit_price),
      });
    }

    for (const sale of groupedSales.values()) {
      if (sale.items.length === 0) continue;

      let customerId = customerMap.get(sale.customer_name?.toLowerCase());
      if (!customerId && sale.customer_name) {
        // Create customer if doesn't exist? (Consistent with customer import?)
        // Let's just fail if customer not found to be safe.
        errors.push(`Customer "${sale.customer_name}" not found. Please create customer first.`);
        continue;
      }

      const totalAmount = sale.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customerId,
          sale_date: sale.sale_date,
          total_amount: totalAmount,
          subtotal: totalAmount,
          is_cash_paid: sale.is_cash_paid,
          notes: sale.notes,
        })
        .select()
        .single();

      if (saleError) {
        errors.push(`Error creating sale for ${sale.customer_name}: ${saleError.message}`);
        continue;
      }

      for (const item of sale.items) {
        await supabase
          .from('sales_items')
          .insert({
            sale_id: newSale.id,
            finished_product_id: item.finished_product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price,
          });

        // Update inventory
        const { data: currentInv } = await supabase
          .from('finished_product_inventory')
          .select('quantity')
          .eq('finished_product_id', item.finished_product_id)
          .single();
        
        await supabase
          .from('finished_product_inventory')
          .upsert({
            finished_product_id: item.finished_product_id,
            quantity: (currentInv?.quantity || 0) - item.quantity,
          });
      }

      // Add to ledger if not cash paid
      if (!sale.is_cash_paid && customerId) {
        const { data: lastLedger } = await supabase
          .from('customer_ledger')
          .select('balance')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const currentBalance = (lastLedger?.balance || 0) + totalAmount;

        await supabase
          .from('customer_ledger')
          .insert({
            customer_id: customerId,
            sale_id: newSale.id,
            transaction_type: 'sale',
            amount: totalAmount,
            balance: currentBalance,
            transaction_date: sale.sale_date,
            notes: sale.notes,
          });
      }

      imported.push(newSale);
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


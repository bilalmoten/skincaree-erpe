import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          quantity,
          unit_price,
          subtotal,
          raw_materials (
            name,
            unit
          )
        )
      `)
      .order('purchase_date', { ascending: false });

    if (error) throw error;

    const exportData = orders?.flatMap((order) => 
      order.purchase_order_items.map((item: any) => ({
        'Order ID': order.id.slice(0, 8),
        'Supplier': order.supplier_name || 'N/A',
        'Date': order.purchase_date,
        'Material': item.raw_materials?.name || 'Unknown',
        'Quantity': item.quantity,
        'Unit': item.raw_materials?.unit || '',
        'Unit Price': item.unit_price,
        'Subtotal': item.subtotal,
        'Total Order Amount': order.total_amount,
        'Notes': order.notes || '',
      }))
    ) || [];

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="purchases.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


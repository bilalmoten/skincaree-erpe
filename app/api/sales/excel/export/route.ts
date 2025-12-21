import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customers (
          name
        ),
        sales_items (
          quantity,
          unit_price,
          subtotal,
          finished_products (
            name
          )
        )
      `)
      .order('sale_date', { ascending: false });

    if (error) throw error;

    // Flatten data for Excel
    const excelData: any[] = [];
    data.forEach((sale: any) => {
      sale.sales_items?.forEach((item: any) => {
        excelData.push({
          sale_date: sale.sale_date,
          customer_name: sale.customers?.name || '',
          product_name: item.finished_products?.name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          total_amount: sale.total_amount,
          notes: sale.notes || '',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="sales.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


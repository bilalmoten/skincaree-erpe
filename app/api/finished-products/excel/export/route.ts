import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('finished_products')
      .select(`
        *,
        finished_product_inventory (
          quantity
        ),
        formulations (
          name
        )
      `)
      .order('name');

    if (error) throw error;

    // Format data for Excel
    const excelData = data.map((product: any) => ({
      name: product.name,
      sku: product.sku || '',
      price: product.price,
      formulation_name: product.formulations?.name || '',
      quantity: product.finished_product_inventory?.[0]?.quantity || 0,
      notes: product.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Finished Products');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="finished_products.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


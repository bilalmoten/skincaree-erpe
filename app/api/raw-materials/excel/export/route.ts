import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('raw_materials')
      .select(`
        *,
        raw_material_inventory (
          quantity
        )
      `)
      .order('name');

    if (error) throw error;

    // Format data for Excel
    const excelData = data.map((item: any) => ({
      name: item.name,
      unit: item.unit,
      supplier: item.supplier || '',
      last_price: item.last_price || '',
      quantity: item.raw_material_inventory?.[0]?.quantity || 0,
      notes: item.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Materials');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="raw_materials.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('formulations')
      .select(`
        *,
        formulation_ingredients (
          quantity,
          unit,
          raw_materials (
            name
          )
        )
      `)
      .order('name');

    if (error) throw error;

    // Format data for Excel
    const excelData = data.map((formulation: any) => {
      const ingredients = formulation.formulation_ingredients
        ?.map((ing: any) => 
          `${ing.raw_materials?.name}:${ing.quantity}:${ing.unit}`
        )
        .join(', ') || '';
      
      return {
        name: formulation.name,
        description: formulation.description || '',
        batch_size: formulation.batch_size,
        ingredients: ingredients,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Formulations');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="formulations.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


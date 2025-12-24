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

    const { data: formulations } = await supabase
      .from('formulations')
      .select('id, name');

    const formulationMap = new Map(
      formulations?.map((f: any) => [f.name.toLowerCase(), f.id]) || []
    );

    const imported = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.name || !row.unit) {
          errors.push(`Row ${i + 2}: Missing required fields (name, unit)`);
          continue;
        }

        let formulationId = null;
        if (row.formulation_name) {
          formulationId = formulationMap.get(row.formulation_name.toLowerCase());
          if (!formulationId) {
            errors.push(`Row ${i + 2}: Formulation "${row.formulation_name}" not found`);
            continue;
          }
        }

        const { data: bulkProduct, error: bulkError } = await supabase
          .from('bulk_products')
          .insert({
            name: row.name,
            formulation_id: formulationId,
            unit: row.unit,
            notes: row.notes || null,
          })
          .select()
          .single();

        if (bulkError) {
          errors.push(`Row ${i + 2}: ${bulkError.message}`);
          continue;
        }

        // Initialize inventory
        await supabase
          .from('bulk_product_inventory')
          .upsert({
            bulk_product_id: bulkProduct.id,
            quantity: 0,
          }, {
            onConflict: 'bulk_product_id'
          });

        imported.push(bulkProduct);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
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


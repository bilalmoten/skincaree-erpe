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

    const materials = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.name || !row.unit) {
          errors.push(`Row ${i + 2}: Missing required fields (name, unit)`);
          continue;
        }

        // Insert raw material
        const { data: material, error: materialError } = await supabase
          .from('raw_materials')
          .insert({
            name: row.name,
            unit: row.unit,
            supplier: row.supplier || null,
            last_price: row.last_price ? parseFloat(row.last_price) : null,
            notes: row.notes || null,
          })
          .select()
          .single();

        if (materialError) {
          errors.push(`Row ${i + 2}: ${materialError.message}`);
          continue;
        }

        // Initialize inventory
        await supabase
          .from('raw_material_inventory')
          .insert({
            raw_material_id: material.id,
            quantity: row.quantity ? parseFloat(row.quantity) : 0,
          });

        materials.push(material);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: materials.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


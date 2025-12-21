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

    const formulations = [];
    const errors = [];

    // First, get all raw materials to map names to IDs
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, name');

    const materialMap = new Map(
      rawMaterials?.map((m: any) => [m.name.toLowerCase(), m.id]) || []
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.name || !row.batch_size) {
          errors.push(`Row ${i + 2}: Missing required fields (name, batch_size)`);
          continue;
        }

        // Parse ingredients (assuming format: "material1:quantity1:unit1,material2:quantity2:unit2")
        const ingredients = [];
        if (row.ingredients) {
          const ingredientList = row.ingredients.split(',').map((s: string) => s.trim());
          for (const ingStr of ingredientList) {
            const parts = ingStr.split(':').map((s: string) => s.trim());
            if (parts.length >= 2) {
              const materialName = parts[0].toLowerCase();
              const materialId = materialMap.get(materialName);
              
              if (!materialId) {
                errors.push(`Row ${i + 2}: Raw material "${parts[0]}" not found`);
                continue;
              }

              ingredients.push({
                raw_material_id: materialId,
                quantity: parseFloat(parts[1]) || 0,
                unit: parts[2] || 'g',
              });
            }
          }
        }

        // Insert formulation
        const { data: formulation, error: formulationError } = await supabase
          .from('formulations')
          .insert({
            name: row.name,
            description: row.description || null,
            batch_size: parseFloat(row.batch_size),
          })
          .select()
          .single();

        if (formulationError) {
          errors.push(`Row ${i + 2}: ${formulationError.message}`);
          continue;
        }

        // Insert ingredients
        if (ingredients.length > 0) {
          const ingredientData = ingredients.map((ing: any) => ({
            formulation_id: formulation.id,
            raw_material_id: ing.raw_material_id,
            quantity: ing.quantity,
            unit: ing.unit,
          }));

          await supabase
            .from('formulation_ingredients')
            .insert(ingredientData);
        }

        formulations.push(formulation);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: formulations.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


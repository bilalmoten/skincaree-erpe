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

    const { data: existingCategories } = await supabase
      .from('material_categories')
      .select('id, name, type');

    const categoryMap = new Map(
      existingCategories?.map((c: any) => [`${c.name.toLowerCase()}-${c.type}`, c.id]) || []
    );

    const imported = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.name || !row.type) {
          errors.push(`Row ${i + 2}: Missing required fields (name, type)`);
          continue;
        }

        const type = row.type.toLowerCase().replace(' ', '_');
        const validTypes = ['ingredient', 'packaging', 'bulk_product', 'finished_good'];
        if (!validTypes.includes(type)) {
          errors.push(`Row ${i + 2}: Invalid type "${row.type}". Must be one of: ${validTypes.join(', ')}`);
          continue;
        }

        let parentId = null;
        if (row.parent_name) {
          parentId = categoryMap.get(`${row.parent_name.toLowerCase()}-${type}`);
          if (!parentId) {
            // Check if we just imported it in this run
            // (Simple implementation: only allow existing parents or parents imported before)
          }
        }

        const { data: category, error: categoryError } = await supabase
          .from('material_categories')
          .insert({
            name: row.name,
            type: type,
            parent_id: parentId,
          })
          .select()
          .single();

        if (categoryError) {
          errors.push(`Row ${i + 2}: ${categoryError.message}`);
          continue;
        }

        categoryMap.set(`${category.name.toLowerCase()}-${category.type}`, category.id);
        imported.push(category);
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


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

    // Get formulations for mapping
    const { data: formulations } = await supabase
      .from('formulations')
      .select('id, name');

    const formulationMap = new Map(
      formulations?.map((f: any) => [f.name.toLowerCase(), f.id]) || []
    );

    const products = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.name || !row.price) {
          errors.push(`Row ${i + 2}: Missing required fields (name, price)`);
          continue;
        }

        let formulationId = null;
        if (row.formulation_name) {
          formulationId = formulationMap.get(row.formulation_name.toLowerCase()) || null;
        }

        // Insert finished product
        const { data: product, error: productError } = await supabase
          .from('finished_products')
          .insert({
            name: row.name,
            sku: row.sku || null,
            price: parseFloat(row.price),
            formulation_id: formulationId,
            notes: row.notes || null,
          })
          .select()
          .single();

        if (productError) {
          errors.push(`Row ${i + 2}: ${productError.message}`);
          continue;
        }

        // Initialize inventory
        await supabase
          .from('finished_product_inventory')
          .insert({
            finished_product_id: product.id,
            quantity: row.quantity ? parseInt(row.quantity) : 0,
          });

        products.push(product);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: products.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


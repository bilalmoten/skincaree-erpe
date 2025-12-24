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

    const [{ data: bulkProducts }, { data: finishedProducts }] = await Promise.all([
      supabase.from('bulk_products').select('id, name'),
      supabase.from('finished_products').select('id, name'),
    ]);

    const bulkMap = new Map(bulkProducts?.map((p: any) => [p.name.toLowerCase(), p.id]) || []);
    const finishedMap = new Map(finishedProducts?.map((p: any) => [p.name.toLowerCase(), p.id]) || []);

    const imported = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.bulk_product_name || !row.finished_product_name || !row.bulk_quantity_used || !row.finished_units_produced) {
          errors.push(`Row ${i + 2}: Missing required fields`);
          continue;
        }

        const bulkId = bulkMap.get(row.bulk_product_name.toLowerCase());
        const finishedId = finishedMap.get(row.finished_product_name.toLowerCase());

        if (!bulkId) {
          errors.push(`Row ${i + 2}: Bulk product "${row.bulk_product_name}" not found`);
          continue;
        }
        if (!finishedId) {
          errors.push(`Row ${i + 2}: Finished product "${row.finished_product_name}" not found`);
          continue;
        }

        const { data: run, error: runError } = await supabase
          .from('packaging_runs')
          .insert({
            bulk_product_id: bulkId,
            finished_product_id: finishedId,
            bulk_quantity_used: parseFloat(row.bulk_quantity_used),
            finished_units_produced: parseInt(row.finished_units_produced),
            packaging_date: row.packaging_date || new Date().toISOString().split('T')[0],
            notes: row.notes || null,
          })
          .select()
          .single();

        if (runError) {
          errors.push(`Row ${i + 2}: ${runError.message}`);
          continue;
        }

        // Update bulk inventory
        const { data: bulkInv } = await supabase
          .from('bulk_product_inventory')
          .select('quantity')
          .eq('bulk_product_id', bulkId)
          .single();
        
        await supabase
          .from('bulk_product_inventory')
          .upsert({
            bulk_product_id: bulkId,
            quantity: (bulkInv?.quantity || 0) - parseFloat(row.bulk_quantity_used),
          });

        // Update finished product inventory
        const { data: finishedInv } = await supabase
          .from('finished_product_inventory')
          .select('quantity')
          .eq('finished_product_id', finishedId)
          .single();
        
        await supabase
          .from('finished_product_inventory')
          .upsert({
            finished_product_id: finishedId,
            quantity: (finishedInv?.quantity || 0) + parseInt(row.finished_units_produced),
          });

        imported.push(run);
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


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

    const runs = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.formulation_name || !row.batch_size) {
          errors.push(`Row ${i + 2}: Missing required fields (formulation_name, batch_size)`);
          continue;
        }

        const formulationId = formulationMap.get(row.formulation_name.toLowerCase());
        if (!formulationId) {
          errors.push(`Row ${i + 2}: Formulation "${row.formulation_name}" not found`);
          continue;
        }

        // Get formulation with ingredients
        const { data: formulation, error: formError } = await supabase
          .from('formulations')
          .select(`
            batch_size,
            formulation_ingredients (
              raw_material_id,
              quantity,
              unit
            )
          `)
          .eq('id', formulationId)
          .single();

        if (formError || !formulation) {
          errors.push(`Row ${i + 2}: Error fetching formulation`);
          continue;
        }

        const baseBatchSize = formulation.batch_size || 1;
        const batchSize = parseFloat(row.batch_size);
        const multiplier = batchSize / baseBatchSize;

        // Check inventory and create production run (simplified - same logic as POST route)
        // For bulk import, we'll skip inventory checks to speed things up
        // You can add validation if needed

        const productionDate = row.production_date || new Date().toISOString().split('T')[0];

        // Create production run
        const { data: productionRun, error: runError } = await supabase
          .from('production_runs')
          .insert({
            formulation_id: formulationId,
            batch_size: batchSize,
            production_date: productionDate,
            notes: row.notes || null,
          })
          .select()
          .single();

        if (runError) {
          errors.push(`Row ${i + 2}: ${runError.message}`);
          continue;
        }

        // Record materials used
        if (formulation.formulation_ingredients) {
          for (const ing of formulation.formulation_ingredients) {
            const quantityUsed = ing.quantity * multiplier;

            await supabase
              .from('production_materials_used')
              .insert({
                production_run_id: productionRun.id,
                raw_material_id: ing.raw_material_id,
                quantity_used: quantityUsed,
              });

            // Update inventory - fetch current quantity
            const { data: currentInventory } = await supabase
              .from('raw_material_inventory')
              .select('quantity')
              .eq('raw_material_id', ing.raw_material_id)
              .single();

            const newQuantity = (currentInventory?.quantity || 0) - quantityUsed;

            await supabase
              .from('raw_material_inventory')
              .upsert({
                raw_material_id: ing.raw_material_id,
                quantity: newQuantity,
              }, {
                onConflict: 'raw_material_id'
              });
          }
        }

        // Update finished product inventory
        const { data: finishedProducts } = await supabase
          .from('finished_products')
          .select('id')
          .eq('formulation_id', formulationId);

        if (finishedProducts && finishedProducts.length > 0) {
          for (const product of finishedProducts) {
            const { data: currentInventory } = await supabase
              .from('finished_product_inventory')
              .select('quantity')
              .eq('finished_product_id', product.id)
              .single();

            const currentQty = currentInventory?.quantity || 0;
            const producedQty = Math.floor(batchSize);

            await supabase
              .from('finished_product_inventory')
              .upsert({
                finished_product_id: product.id,
                quantity: currentQty + producedQty,
              }, {
                onConflict: 'finished_product_id'
              });
          }
        }

        runs.push(productionRun);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: runs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


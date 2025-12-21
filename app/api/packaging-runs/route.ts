import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data: packagingRuns, error } = await supabase
      .from('packaging_runs')
      .select(`
        *,
        bulk_products:bulk_product_id (
          id,
          name,
          unit
        ),
        finished_products:finished_product_id (
          id,
          name,
          sku
        ),
        packaging_materials_used (
          id,
          quantity_used,
          raw_materials:raw_material_id (
            id,
            name,
            unit
          )
        )
      `)
      .order('packaging_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(packagingRuns || []);
  } catch (error: any) {
    console.error('Error fetching packaging runs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { bulk_product_id, finished_product_id, bulk_quantity_used, finished_units_produced, packaging_date, notes, packaging_materials } = body;

    // Validate bulk product has enough inventory
    const { data: bulkInventory, error: inventoryError } = await supabase
      .from('bulk_product_inventory')
      .select('quantity')
      .eq('bulk_product_id', bulk_product_id)
      .single();

    if (inventoryError) throw inventoryError;
    if (!bulkInventory || bulkInventory.quantity < parseFloat(bulk_quantity_used)) {
      return NextResponse.json(
        { error: 'Insufficient bulk product inventory' },
        { status: 400 }
      );
    }

    // Create packaging run
    const { data: packagingRun, error: runError } = await supabase
      .from('packaging_runs')
      .insert({
        bulk_product_id,
        finished_product_id,
        bulk_quantity_used: parseFloat(bulk_quantity_used),
        finished_units_produced: parseInt(finished_units_produced),
        packaging_date: packaging_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (runError) throw runError;

    // Insert packaging materials used
    if (packaging_materials && packaging_materials.length > 0) {
      const materialsData = packaging_materials.map((mat: any) => ({
        packaging_run_id: packagingRun.id,
        raw_material_id: mat.raw_material_id,
        quantity_used: parseFloat(mat.quantity_used),
      }));

      const { error: materialsError } = await supabase
        .from('packaging_materials_used')
        .insert(materialsData);

      if (materialsError) throw materialsError;

      // Deduct packaging materials from inventory
      for (const mat of packaging_materials) {
        const { error: deductError } = await supabase.rpc('decrement_raw_material_inventory', {
          material_id: mat.raw_material_id,
          quantity: parseFloat(mat.quantity_used),
        });

        if (deductError) {
          // Fallback to direct update if RPC doesn't exist
          const { data: currentInv } = await supabase
            .from('raw_material_inventory')
            .select('quantity')
            .eq('raw_material_id', mat.raw_material_id)
            .single();

          if (currentInv) {
            await supabase
              .from('raw_material_inventory')
              .upsert({
                raw_material_id: mat.raw_material_id,
                quantity: Math.max(0, currentInv.quantity - parseFloat(mat.quantity_used)),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'raw_material_id',
              });
          }
        }
      }
    }

    // Deduct bulk product inventory
    const newBulkQuantity = bulkInventory.quantity - parseFloat(bulk_quantity_used);
    await supabase
      .from('bulk_product_inventory')
      .update({ quantity: newBulkQuantity, updated_at: new Date().toISOString() })
      .eq('bulk_product_id', bulk_product_id);

    // Add finished product inventory
    const { data: finishedInv } = await supabase
      .from('finished_product_inventory')
      .select('quantity')
      .eq('finished_product_id', finished_product_id)
      .single();

    const currentFinishedQty = finishedInv?.quantity || 0;
    await supabase
      .from('finished_product_inventory')
      .upsert({
        finished_product_id,
        quantity: currentFinishedQty + parseInt(finished_units_produced),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'finished_product_id',
      });

    return NextResponse.json(packagingRun);
  } catch (error: any) {
    console.error('Error creating packaging run:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


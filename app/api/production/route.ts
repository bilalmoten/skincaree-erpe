import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get production runs - order by date and created_at to ensure latest first
    const { data: runs, error: runsError } = await supabase
      .from('production_runs')
      .select('*')
      .order('production_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (runsError) throw runsError;

    if (!runs || runs.length === 0) {
      return NextResponse.json([]);
    }

    // Get formulations
    const formulationIds = [...new Set(runs.map((r: any) => r.formulation_id))];
    const { data: formulations } = await supabase
      .from('formulations')
      .select('id, name')
      .in('id', formulationIds);

    const formulationMap = new Map();
    if (formulations) {
      formulations.forEach((f: any) => {
        formulationMap.set(f.id, f.name);
      });
    }

    // Get materials used for each run
    const runIds = runs.map((r: any) => r.id);
    const { data: materialsUsed } = await supabase
      .from('production_materials_used')
      .select('production_run_id, quantity_used, raw_material_id')
      .in('production_run_id', runIds);

    // Get raw material names
    const materialIds = [...new Set(materialsUsed?.map((m: any) => m.raw_material_id) || [])];
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, name, unit')
      .in('id', materialIds);

    const materialMap = new Map();
    if (rawMaterials) {
      rawMaterials.forEach((m: any) => {
        materialMap.set(m.id, { name: m.name, unit: m.unit });
      });
    }

    // Get finished products for formulations with units_per_batch
    const { data: finishedProducts } = await supabase
      .from('finished_products')
      .select('id, name, formulation_id, units_per_batch')
      .in('formulation_id', formulationIds);

    const productsByFormulation = new Map();
    if (finishedProducts) {
      finishedProducts.forEach((p: any) => {
        if (!productsByFormulation.has(p.formulation_id)) {
          productsByFormulation.set(p.formulation_id, []);
        }
        productsByFormulation.get(p.formulation_id).push({ 
          id: p.id, 
          name: p.name,
          units_per_batch: p.units_per_batch || 1
        });
      });
    }

    // Combine everything
    const runsWithDetails = runs.map((run: any) => {
      const runMaterials = materialsUsed?.filter((m: any) => m.production_run_id === run.id) || [];
      const materialsWithNames = runMaterials.map((m: any) => {
        const material = materialMap.get(m.raw_material_id);
        return {
          id: m.id,
          quantity_used: m.quantity_used,
          raw_materials: material || { id: m.raw_material_id, name: 'Unknown', unit: '' }
        };
      });

      // Calculate finished products produced
      const linkedProducts = productsByFormulation.get(run.formulation_id) || [];
      const finishedProductsProduced = linkedProducts.map((p: any) => {
        const unitsPerBatch = p.units_per_batch || 1;
        const producedUnits = Math.floor(run.batch_size * unitsPerBatch);
        return {
          id: p.id,
          name: p.name,
          quantity_produced: producedUnits,
          batch_size: run.batch_size,
          units_per_batch: unitsPerBatch
        };
      });

      return {
        ...run,
        formulations: {
          id: run.formulation_id,
          name: formulationMap.get(run.formulation_id) || 'Unknown'
        },
        production_materials_used: materialsWithNames,
        finished_products: linkedProducts.map((p: any) => ({ id: p.id, name: p.name })),
        finished_products_produced: finishedProductsProduced
      };
    });

    return NextResponse.json(runsWithDetails);
  } catch (error: any) {
    console.error('Error fetching production runs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { formulation_id, finished_product_id, batch_size, production_date, notes } = body;

    // Get formulation with ingredients
    const { data: formulation, error: formError } = await supabase
      .from('formulations')
      .select(`
        *,
        formulation_ingredients (
          raw_material_id,
          quantity,
          unit
        )
      `)
      .eq('id', formulation_id)
      .single();

    if (formError) throw formError;

    if (!formulation.formulation_ingredients || formulation.formulation_ingredients.length === 0) {
      throw new Error('Formulation has no ingredients');
    }

    // Validate finished product if provided
    if (finished_product_id) {
      const { data: product, error: productError } = await supabase
        .from('finished_products')
        .select('id, name')
        .eq('id', finished_product_id)
        .single();

      if (productError || !product) {
        throw new Error('Invalid finished product selected');
      }
    }

    // Calculate materials needed based on batch size
    const baseBatchSize = formulation.batch_size || 1;
    const multiplier = parseFloat(batch_size) / baseBatchSize;

    // Check inventory availability - fetch all inventory first
    const { data: allInventory } = await supabase
      .from('raw_material_inventory')
      .select('raw_material_id, quantity');

    const inventoryMap = new Map();
    if (allInventory) {
      allInventory.forEach((inv: any) => {
        inventoryMap.set(inv.raw_material_id, inv.quantity);
      });
    }

    const materialChecks = formulation.formulation_ingredients.map((ing: any) => {
      const required = ing.quantity * multiplier;
      const available = inventoryMap.get(ing.raw_material_id) || 0;

      return {
        raw_material_id: ing.raw_material_id,
        required,
        available,
        sufficient: available >= required,
      };
    });

    const insufficient = materialChecks.filter((check) => !check.sufficient);
    if (insufficient.length > 0) {
      return NextResponse.json(
        {
          error: 'Insufficient inventory',
          details: insufficient.map((check) => ({
            material_id: check.raw_material_id,
            required: check.required,
            available: check.available,
          })),
        },
        { status: 400 }
      );
    }

    // Create production run
    const { data: productionRun, error: runError } = await supabase
      .from('production_runs')
      .insert({
        formulation_id,
        batch_size: parseFloat(batch_size),
        production_date: production_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (runError) throw runError;

    // Record materials used and update inventory
    const materialsUsed = [];
    for (const ing of formulation.formulation_ingredients) {
      const quantityUsed = ing.quantity * multiplier;

      // Insert production material used
      const { data: materialUsed, error: matError } = await supabase
        .from('production_materials_used')
        .insert({
          production_run_id: productionRun.id,
          raw_material_id: ing.raw_material_id,
          quantity_used: quantityUsed,
        })
        .select()
        .single();

      if (matError) throw matError;
      materialsUsed.push(materialUsed);

      // Update raw material inventory (deduct) - use proper upsert
      const currentQuantity = inventoryMap.get(ing.raw_material_id) || 0;
      const newQuantity = currentQuantity - quantityUsed;

      await supabase
        .from('raw_material_inventory')
        .upsert({
          raw_material_id: ing.raw_material_id,
          quantity: newQuantity,
        }, {
          onConflict: 'raw_material_id'
        });
    }

    // Update finished product inventory
    // Calculate finished units based on batch_size and units_per_batch
    let finishedProductResult = null;
    
    if (finished_product_id) {
      // Use the selected finished product
      const { data: product } = await supabase
        .from('finished_products')
        .select('id, name, units_per_batch')
        .eq('id', finished_product_id)
        .single();

      if (product) {
        const unitsPerBatch = product.units_per_batch || 1;
        // Calculate: batch_size (e.g., 1kg) * units_per_batch (e.g., 20) = finished units
        const producedUnits = Math.floor(parseFloat(batch_size) * unitsPerBatch);

        const { data: currentInventory } = await supabase
          .from('finished_product_inventory')
          .select('quantity')
          .eq('finished_product_id', finished_product_id)
          .single();

        const currentQty = currentInventory?.quantity || 0;

        await supabase
          .from('finished_product_inventory')
          .upsert({
            finished_product_id: finished_product_id,
            quantity: currentQty + producedUnits,
          }, {
            onConflict: 'finished_product_id'
          });

        finishedProductResult = {
          id: finished_product_id,
          name: product.name,
          quantity_produced: producedUnits,
          batch_size: parseFloat(batch_size),
          units_per_batch: unitsPerBatch
        };
      }
    } else {
      // Auto-update all products linked to this formulation
      const { data: finishedProducts } = await supabase
        .from('finished_products')
        .select('id, name, units_per_batch')
        .eq('formulation_id', formulation_id);

      if (finishedProducts && finishedProducts.length > 0) {
        const results = [];
        
        for (const product of finishedProducts) {
          const unitsPerBatch = product.units_per_batch || 1;
          const producedUnits = Math.floor(parseFloat(batch_size) * unitsPerBatch);

          const { data: currentInventory } = await supabase
            .from('finished_product_inventory')
            .select('quantity')
            .eq('finished_product_id', product.id)
            .single();

          const currentQty = currentInventory?.quantity || 0;

          await supabase
            .from('finished_product_inventory')
            .upsert({
              finished_product_id: product.id,
              quantity: currentQty + producedUnits,
            }, {
              onConflict: 'finished_product_id'
            });

          results.push({
            id: product.id,
            name: product.name,
            quantity_produced: producedUnits,
            batch_size: parseFloat(batch_size),
            units_per_batch: unitsPerBatch
          });
        }

        finishedProductResult = results;
      }
    }

    return NextResponse.json({ 
      ...productionRun, 
      production_materials_used: materialsUsed,
      finished_products_produced: finishedProductResult
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


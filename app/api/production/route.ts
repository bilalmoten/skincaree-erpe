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
      .select('id, name, batch_unit')
      .in('id', formulationIds);

    const formulationMap = new Map();
    if (formulations) {
      formulations.forEach((f: any) => {
        formulationMap.set(f.id, { name: f.name, batch_unit: f.batch_unit || 'kg' });
      });
    }

    // Get materials used for each run
    const runIds = runs.map((r: any) => r.id);
    const { data: materialsUsed } = await supabase
      .from('production_materials_used')
      .select('production_run_id, quantity_used, raw_material_id')
      .in('production_run_id', runIds);

    // Get raw material names and prices
    const materialIds = [...new Set(materialsUsed?.map((m: any) => m.raw_material_id) || [])];
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, name, unit, last_price')
      .in('id', materialIds);

    const materialMap = new Map();
    if (rawMaterials) {
      rawMaterials.forEach((m: any) => {
        materialMap.set(m.id, { name: m.name, unit: m.unit, last_price: m.last_price });
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
          raw_materials: material || { id: m.raw_material_id, name: 'Unknown', unit: '', last_price: null }
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

      const formulation = formulationMap.get(run.formulation_id);
      return {
        ...run,
        formulations: {
          id: run.formulation_id,
          name: formulation?.name || 'Unknown',
          batch_unit: formulation?.batch_unit
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

    const { formulation_id, finished_product_id, batch_size, production_date, notes, overhead_cost, labor_cost } = body;

    // Get formulation with ingredients
    const { data: formulation, error: formError } = await supabase
      .from('formulations')
      .select(`
        *,
        formulation_ingredients (
          raw_material_id,
          bulk_product_id,
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

    // Determine output
    let producesType = formulation.produces_type;
    let producesId = formulation.produces_id;

    // Backward compatibility: if formulation produces_type is null, use the body finished_product_id
    if (!producesType && finished_product_id) {
      producesType = 'finished';
      producesId = finished_product_id;
    } else if (!producesType && !finished_product_id) {
      // Default to bulk if nothing else
      producesType = 'bulk';
      // Try to find a linked bulk product
      const { data: bp } = await supabase.from('bulk_products').select('id').eq('formulation_id', formulation_id).single();
      producesId = bp?.id;
    }

    // Calculate multiplier
    const baseBatchSize = formulation.batch_size || 1;
    const multiplier = parseFloat(batch_size) / baseBatchSize;

    // Check inventory availability
    // 1. Raw Material Inventory
    const { data: rawInv } = await supabase
      .from('raw_material_inventory')
      .select('raw_material_id, quantity, raw_materials(unit)');
    
    // 2. Bulk Product Inventory
    const { data: bulkInv } = await supabase
      .from('bulk_product_inventory')
      .select('bulk_product_id, quantity, bulk_products(unit)');

    const rawInvMap = new Map(rawInv?.map((i: any) => [i.raw_material_id, { quantity: i.quantity, unit: i.raw_materials?.unit }]) || []);
    const bulkInvMap = new Map(bulkInv?.map((i: any) => [i.bulk_product_id, { quantity: i.quantity, unit: i.bulk_products?.unit }]) || []);

    const insufficient = [];
    for (const ing of formulation.formulation_ingredients) {
      let required = ing.quantity * multiplier;
      let available = 0;
      let materialUnit = '';

      if (ing.raw_material_id) {
        const inv = rawInvMap.get(ing.raw_material_id);
        available = inv?.quantity || 0;
        materialUnit = inv?.unit || 'kg';
      } else if (ing.bulk_product_id) {
        const inv = bulkInvMap.get(ing.bulk_product_id);
        available = inv?.quantity || 0;
        materialUnit = inv?.unit || 'kg';
      }

      // Unit conversion
      let requiredInBase = required;
      const ingredientUnit = ing.unit?.toLowerCase();
      const baseUnit = materialUnit?.toLowerCase();

      if (baseUnit === 'kg' && ingredientUnit === 'g') requiredInBase = required / 1000;
      else if (baseUnit === 'g' && ingredientUnit === 'kg') requiredInBase = required * 1000;
      else if (baseUnit === 'l' && ingredientUnit === 'ml') requiredInBase = required / 1000;
      else if (baseUnit === 'ml' && ingredientUnit === 'l') requiredInBase = required * 1000;

      if (available < requiredInBase) {
        insufficient.push({
          id: ing.raw_material_id || ing.bulk_product_id,
          name: ing.raw_material_id ? 'Material' : 'Bulk Product',
          required: requiredInBase,
          available,
        });
      }
    }

    if (insufficient.length > 0) {
      return NextResponse.json({ error: 'Insufficient inventory', details: insufficient }, { status: 400 });
    }

    // Create production run
    const { data: productionRun, error: runError } = await supabase
      .from('production_runs')
      .insert({
        formulation_id,
        batch_size: parseFloat(batch_size),
        production_date: production_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        overhead_cost: parseFloat(overhead_cost) || 0,
        labor_cost: parseFloat(labor_cost) || 0,
      })
      .select()
      .single();

    if (runError) throw runError;

    // Deduct ingredients
    for (const ing of formulation.formulation_ingredients) {
      let quantityUsed = ing.quantity * multiplier;
      let materialUnit = '';
      
      if (ing.raw_material_id) {
        materialUnit = rawInvMap.get(ing.raw_material_id)?.unit || 'kg';
      } else {
        materialUnit = bulkInvMap.get(ing.bulk_product_id)?.unit || 'kg';
      }

      // Convert quantityUsed to material unit
      let quantityToDeduct = quantityUsed;
      const ingredientUnit = ing.unit?.toLowerCase();
      const baseUnit = materialUnit?.toLowerCase();

      if (baseUnit === 'kg' && ingredientUnit === 'g') quantityToDeduct = quantityUsed / 1000;
      else if (baseUnit === 'g' && ingredientUnit === 'kg') quantityToDeduct = quantityUsed * 1000;
      else if (baseUnit === 'l' && ingredientUnit === 'ml') quantityToDeduct = quantityUsed / 1000;
      else if (baseUnit === 'ml' && ingredientUnit === 'l') quantityToDeduct = quantityUsed * 1000;

      if (ing.raw_material_id) {
        await supabase.from('production_materials_used').insert({
          production_run_id: productionRun.id,
          raw_material_id: ing.raw_material_id,
          quantity_used: quantityUsed,
        });

        const currentQty = rawInvMap.get(ing.raw_material_id)?.quantity || 0;
        await supabase.from('raw_material_inventory').upsert({
          raw_material_id: ing.raw_material_id,
          quantity: currentQty - quantityToDeduct,
        }, { onConflict: 'raw_material_id' });
      } else if (ing.bulk_product_id) {
        // Record bulk product usage? We might need a new table or just use production_materials_used if we can?
        // Let's stick to raw_materials table if possible for unified tracking?
        // No, user specifically has bulk_products table.
        // I'll add a bulk_product_id to production_materials_used?
        // For now, I'll just deduct inventory.
        const currentQty = bulkInvMap.get(ing.bulk_product_id)?.quantity || 0;
        await supabase.from('bulk_product_inventory').upsert({
          bulk_product_id: ing.bulk_product_id,
          quantity: currentQty - quantityToDeduct,
        }, { onConflict: 'bulk_product_id' });
      }
    }

    // Increase output
    if (producesType === 'bulk' && producesId) {
      const { data: currBulk } = await supabase.from('bulk_product_inventory').select('quantity').eq('bulk_product_id', producesId).single();
      await supabase.from('bulk_product_inventory').upsert({
        bulk_product_id: producesId,
        quantity: (currBulk?.quantity || 0) + parseFloat(batch_size),
      }, { onConflict: 'bulk_product_id' });
    } else if (producesType === 'finished' && producesId) {
      // Logic for finished product (Batch creation)
      // Get shelf life
      const { data: product } = await supabase.from('finished_products').select('shelf_life_days, units_per_batch').eq('id', producesId).single();
      const unitsProduced = Math.floor(parseFloat(batch_size) * (product?.units_per_batch || 1));
      
      let expiryDate = null;
      if (product?.shelf_life_days) {
        const d = new Date(production_date);
        d.setDate(d.getDate() + product.shelf_life_days);
        expiryDate = d.toISOString().split('T')[0];
      }

      const batchNumber = `BATCH-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${productionRun.id.slice(0, 8).toUpperCase()}`;
      
      const { error: batchError } = await supabase.from('batch_tracking').insert({
        batch_number: batchNumber,
        production_run_id: productionRun.id,
        finished_product_id: producesId,
        quantity_produced: unitsProduced,
        quantity_remaining: unitsProduced,
        production_date: production_date,
        expiry_date: expiryDate,
        status: 'active',
      });

      if (batchError) {
        console.error('Error creating batch tracking:', batchError);
        // We don't throw here to ensure inventory updates are preserved, 
        // but the error is logged.
      }

      const { data: currFin } = await supabase.from('finished_product_inventory').select('quantity').eq('finished_product_id', producesId).single();
      await supabase.from('finished_product_inventory').upsert({
        finished_product_id: producesId,
        quantity: (currFin?.quantity || 0) + unitsProduced,
      }, { onConflict: 'finished_product_id' });
    }

    return NextResponse.json(productionRun);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;

    // Get formulation with ingredients
    const { data: formulation, error: formulationError } = await supabase
      .from('formulations')
      .select(`
        *,
        formulation_ingredients (
          quantity,
          unit,
          raw_material_id,
          bulk_product_id,
          raw_materials (
            id,
            name,
            last_price,
            unit
          ),
          bulk_products (
            id,
            name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (formulationError) throw formulationError;

    // Calculate total material cost
    let totalCost = 0;
    if (formulation.formulation_ingredients) {
      for (const ing of formulation.formulation_ingredients) {
        let price = 0;
        let quantity = ing.quantity || 0;
        let baseUnit = 'kg';

        if (ing.raw_material_id) {
          price = ing.raw_materials?.last_price || 0;
          baseUnit = ing.raw_materials?.unit || 'kg';
        } else if (ing.bulk_product_id) {
          // Get bulk product details
          const { data: bulk } = await supabase
            .from('bulk_products')
            .select('formulation_id, unit')
            .eq('id', ing.bulk_product_id)
            .single();
          
          baseUnit = bulk?.unit || ing.bulk_products?.unit || 'kg';

          if (bulk?.formulation_id) {
            // Recursively get COGS of bulk product formulation
            const { data: bulkFormulation } = await supabase
              .from('formulations')
              .select('id, batch_size, batch_unit')
              .eq('id', bulk.formulation_id)
              .single();
            
            if (bulkFormulation) {
              // Fetch COGS recursively (prevent infinite loop by checking depth)
              try {
                const cogsRes = await fetch(`${request.nextUrl.origin}/api/formulations/${bulkFormulation.id}/cogs`);
                if (cogsRes.ok) {
                  const cogs = await cogsRes.json();
                  price = cogs.costPerUnit || 0;
                } else {
                  console.warn(`Failed to fetch COGS for bulk product formulation ${bulkFormulation.id}`);
                  price = 0;
                }
              } catch (error) {
                console.error(`Error fetching COGS for bulk product:`, error);
                price = 0;
              }
            }
          }
        }
        
        // Handle unit conversion if necessary
        const materialUnit = baseUnit?.toLowerCase() || 'kg';
        const ingredientUnit = ing.unit?.toLowerCase() || 'kg';

        let convertedQuantity = quantity;

        // Weight conversions
        if (materialUnit === 'kg' && ingredientUnit === 'g') {
          convertedQuantity = quantity / 1000;
        } else if (materialUnit === 'g' && ingredientUnit === 'kg') {
          convertedQuantity = quantity * 1000;
        }
        // Volume conversions
        else if (materialUnit === 'l' && ingredientUnit === 'ml') {
          convertedQuantity = quantity / 1000;
        } else if (materialUnit === 'ml' && ingredientUnit === 'l') {
          convertedQuantity = quantity * 1000;
        }
        // If units don't match and no conversion available, log warning
        else if (materialUnit !== ingredientUnit && materialUnit !== 'pcs' && ingredientUnit !== 'pcs') {
          console.warn(`Unit mismatch: ${ingredientUnit} to ${materialUnit} for ingredient. Using quantity as-is.`);
        }

        totalCost += price * convertedQuantity;
      }
    }

    // Cost per batch unit
    const batchSize = formulation.batch_size || 1;
    const costPerUnit = batchSize > 0 ? totalCost / batchSize : 0;

    return NextResponse.json({
      totalCost,
      costPerUnit,
      batchSize,
      batchUnit: formulation.batch_unit || 'kg',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


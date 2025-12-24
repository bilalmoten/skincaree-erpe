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
          raw_material_id,
          raw_materials (
            id,
            name,
            last_price
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
          // Try to get cost from bulk product's formulation COGS
          // This is a simple non-recursive check
          const { data: bulk } = await supabase
            .from('bulk_products')
            .select('formulation_id, unit')
            .eq('id', ing.bulk_product_id)
            .single();
          
          baseUnit = bulk?.unit || 'kg';

          if (bulk?.formulation_id) {
            // Get cost of that formulation
            const { data: bulkForm } = await supabase
              .from('formulations')
              .select('id')
              .eq('id', bulk.formulation_id)
              .single();
            
            if (bulkForm) {
              const res = await fetch(`${request.nextUrl.origin}/api/formulations/${bulkForm.id}/cogs`);
              if (res.ok) {
                const cogs = await res.json();
                price = cogs.costPerUnit || 0;
              }
            }
          }
        }
        
        // Handle unit conversion if necessary
        const materialUnit = baseUnit.toLowerCase();
        const ingredientUnit = ing.unit?.toLowerCase();

        if (materialUnit === 'kg' && ingredientUnit === 'g') {
          quantity = quantity / 1000;
        } else if (materialUnit === 'g' && ingredientUnit === 'kg') {
          quantity = quantity * 1000;
        } else if (materialUnit === 'l' && ingredientUnit === 'ml') {
          quantity = quantity / 1000;
        } else if (materialUnit === 'ml' && ingredientUnit === 'l') {
          quantity = quantity * 1000;
        }

        totalCost += price * quantity;
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


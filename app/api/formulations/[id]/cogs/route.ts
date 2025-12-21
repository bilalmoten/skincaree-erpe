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
      formulation.formulation_ingredients.forEach((ing: any) => {
        const price = ing.raw_materials?.last_price || 0;
        const quantity = ing.quantity || 0;
        totalCost += price * quantity;
      });
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


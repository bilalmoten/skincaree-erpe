import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;

    // Get production run with materials used
    const { data: run, error: runError } = await supabase
      .from('production_runs')
      .select(`
        *,
        production_materials_used (
          quantity_used,
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

    if (runError) throw runError;

    // Calculate total material cost
    let totalCost = 0;
    if (run.production_materials_used) {
      run.production_materials_used.forEach((mat: any) => {
        const price = mat.raw_materials?.last_price || 0;
        const quantity = mat.quantity_used || 0;
        totalCost += price * quantity;
      });
    }

    return NextResponse.json({
      totalCost,
      batchSize: run.batch_size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const raw_material_id = searchParams.get('raw_material_id');

    if (raw_material_id) {
      // Get cost history for a specific material
      const { data: costHistory, error } = await supabase
        .from('cost_history')
        .select(`
          *,
          purchase_orders:purchase_order_id (
            id,
            purchase_date,
            supplier_name
          )
        `)
        .eq('raw_material_id', raw_material_id)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      // Get current average and last purchase cost
      const { data: material } = await supabase
        .from('raw_materials')
        .select('average_cost, last_purchase_cost')
        .eq('id', raw_material_id)
        .single();

      return NextResponse.json({
        costHistory: costHistory || [],
        currentAverageCost: material?.average_cost || 0,
        lastPurchaseCost: material?.last_purchase_cost || 0,
      });
    }

    // Get all cost history
    const { data: costHistory, error } = await supabase
      .from('cost_history')
      .select(`
        *,
        raw_materials:raw_material_id (
          id,
          name,
          unit
        ),
        purchase_orders:purchase_order_id (
          id,
          purchase_date,
          supplier_name
        )
      `)
      .order('purchase_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json(costHistory || []);
  } catch (error: any) {
    console.error('Error fetching cost tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


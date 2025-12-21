import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const finished_product_id = searchParams.get('finished_product_id');

    let query = supabase
      .from('batch_tracking')
      .select(`
        *,
        production_runs:production_run_id (
          id,
          production_date,
          batch_size
        ),
        finished_products:finished_product_id (
          id,
          name,
          sku
        )
      `)
      .order('production_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (finished_product_id) {
      query = query.eq('finished_product_id', finished_product_id);
    }

    const { data: batches, error } = await query;

    if (error) throw error;

    return NextResponse.json(batches || []);
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


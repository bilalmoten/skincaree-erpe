import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('production_runs')
      .select(`
        *,
        formulations (
          name
        ),
        production_materials_used (
          quantity_used,
          raw_materials (
            name,
            unit
          )
        )
      `)
      .order('production_date', { ascending: false });

    if (startDate) {
      query = query.gte('production_date', startDate);
    }
    if (endDate) {
      query = query.lte('production_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate summary
    const totalRuns = data.length;
    const totalBatchSize = data.reduce((sum, run) => sum + run.batch_size, 0);

    return NextResponse.json({
      summary: {
        totalRuns,
        totalBatchSize,
      },
      runs: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


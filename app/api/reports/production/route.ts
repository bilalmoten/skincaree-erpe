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

    // Production by formulation
    const formulationStats: Record<string, { name: string; runs: number; totalBatchSize: number }> = {};
    data.forEach((run: any) => {
      const formulationName = run.formulations?.name || 'Unknown';
      if (!formulationStats[formulationName]) {
        formulationStats[formulationName] = { name: formulationName, runs: 0, totalBatchSize: 0 };
      }
      formulationStats[formulationName].runs += 1;
      formulationStats[formulationName].totalBatchSize += run.batch_size;
    });

    return NextResponse.json({
      summary: {
        totalRuns,
        totalBatchSize,
      },
      runs: data,
      byFormulation: Object.values(formulationStats).sort((a, b) => b.totalBatchSize - a.totalBatchSize),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


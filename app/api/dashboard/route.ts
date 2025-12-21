import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Recent sales (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentSales } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const recentRevenue = recentSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

    // Total customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // Low stock items (finished products with quantity < 10)
    const { data: lowStock } = await supabase
      .from('finished_product_inventory')
      .select(`
        quantity,
        finished_products (
          name,
          min_stock_level
        )
      `)
      .lt('quantity', 10);

    // Expiring products removed - batch tracking simplified to just use IDs

    // Recent production runs with formulation details
    const { data: recentProduction } = await supabase
      .from('production_runs')
      .select(`
        *,
        formulations (
          name,
          batch_unit
        )
      `)
      .order('production_date', { ascending: false })
      .limit(5);

    return NextResponse.json({
      recentRevenue,
      customerCount: customerCount || 0,
      lowStock: lowStock || [],
      recentProduction: recentProduction || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


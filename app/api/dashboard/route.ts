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

    // Valuation calculations
    // 1. Raw Materials Valuation
    const { data: rawMaterials } = await supabase.from('raw_materials').select('id, last_price');
    const { data: rawInventory } = await supabase.from('raw_material_inventory').select('raw_material_id, quantity');
    
    const rawInvMap = new Map(rawInventory?.map(i => [i.raw_material_id, i.quantity]) || []);
    const rawMaterialValuation = rawMaterials?.reduce((sum, rm) => {
      const qty = rawInvMap.get(rm.id) || 0;
      return sum + (Number(qty) * (Number(rm.last_price) || 0));
    }, 0) || 0;

    // 2. Finished Products Valuation (at Sale Price)
    const { data: finishedProducts } = await supabase.from('finished_products').select('id, price');
    const { data: finishedInventory } = await supabase.from('finished_product_inventory').select('finished_product_id, quantity');
    
    const finInvMap = new Map(finishedInventory?.map(i => [i.finished_product_id, i.quantity]) || []);
    const finishedProductValuation = finishedProducts?.reduce((sum, fp) => {
      const qty = finInvMap.get(fp.id) || 0;
      return sum + (Number(qty) * (Number(fp.price) || 0));
    }, 0) || 0;

    return NextResponse.json({
      recentRevenue,
      customerCount: customerCount || 0,
      lowStock: lowStock || [],
      recentProduction: recentProduction || [],
      valuations: {
        rawMaterials: rawMaterialValuation,
        finishedProducts: finishedProductValuation,
        totalValuation: rawMaterialValuation + finishedProductValuation
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


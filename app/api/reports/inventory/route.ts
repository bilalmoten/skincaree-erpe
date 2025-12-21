import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Raw materials inventory
    const { data: rawMaterials, error: rawError } = await supabase
      .from('raw_materials')
      .select(`
        *,
        raw_material_inventory (
          quantity
        )
      `)
      .order('name');

    if (rawError) throw rawError;

    // Finished products inventory
    const { data: finishedProducts, error: finishedError } = await supabase
      .from('finished_products')
      .select(`
        *,
        finished_product_inventory (
          quantity
        )
      `)
      .order('name');

    if (finishedError) throw finishedError;

    // Calculate totals
    const rawMaterialsTotal = rawMaterials.reduce((sum, material) => {
      const qty = material.raw_material_inventory?.[0]?.quantity || 0;
      const value = qty * (material.last_price || 0);
      return sum + value;
    }, 0);

    const finishedProductsTotal = finishedProducts.reduce((sum, product) => {
      const qty = product.finished_product_inventory?.[0]?.quantity || 0;
      return sum + (qty * product.price);
    }, 0);

    return NextResponse.json({
      summary: {
        rawMaterialsCount: rawMaterials.length,
        rawMaterialsValue: rawMaterialsTotal,
        finishedProductsCount: finishedProducts.length,
        finishedProductsValue: finishedProductsTotal,
      },
      rawMaterials,
      finishedProducts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { module } = await req.json();

  try {
    if (!module) {
      return NextResponse.json({ error: 'Module is required' }, { status: 400 });
    }

    if (module === 'full') {
      // Full system reset - careful with order due to FK constraints
      const tables = [
        'customer_ledger',
        'sales_items',
        'sales',
        'production_materials_used',
        'production_runs',
        'packaging_materials_used',
        'packaging_runs',
        'batch_tracking',
        'bulk_product_inventory',
        'bulk_products',
        'formulation_ingredients',
        'formulation_ingredients',
        'finished_product_inventory',
        'finished_products',
        'raw_material_inventory',
        'purchase_order_items',
        'purchase_orders',
        'raw_materials',
        'material_categories',
        'customers',
        'formulations'
      ];

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && error.code !== 'PGRST116') { // Ignore if table doesn't exist or empty
          console.error(`Error resetting ${table}:`, error);
        }
      }
      
      return NextResponse.json({ message: 'Full system reset successful' });
    }

    if (module === 'sales') {
      // Reset sales and ledger
      await supabase.from('customer_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sales_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ message: 'Sales and ledger reset successful' });
    }

    if (module === 'production') {
      // Reset production, packaging, and batches
      await supabase.from('production_materials_used').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('production_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('packaging_materials_used').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('packaging_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('batch_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ message: 'Production and packaging reset successful' });
    }

    if (module === 'inventory') {
      // Reset inventory levels but keep products/materials
      await supabase.from('raw_material_inventory').update({ quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('finished_product_inventory').update({ quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bulk_product_inventory').update({ quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ message: 'Inventory levels reset successful' });
    }

    return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
  } catch (error: any) {
    console.error('System reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerClient();

  const tables = [
    'material_categories',
    'raw_materials',
    'raw_material_inventory',
    'formulations',
    'formulation_ingredients',
    'finished_products',
    'finished_product_inventory',
    'production_runs',
    'production_materials_used',
    'quality_tests',
    'customers',
    'sales',
    'sales_items',
    'customer_ledger',
    'purchase_orders',
    'purchase_order_items',
    'cost_history',
    'bulk_products',
    'bulk_product_inventory',
    'packaging_runs',
    'packaging_materials_used',
    'batch_tracking'
  ];

  try {
    const backupData: Record<string, any[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error && error.code !== 'PGRST116') {
        console.error(`Error backing up ${table}:`, error);
        backupData[table] = []; // Continue with empty if table missing
      } else {
        backupData[table] = data || [];
      }
    }

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="skincare-erp-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


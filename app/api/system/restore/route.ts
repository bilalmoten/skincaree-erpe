import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const backupData = await req.json();

  const tables = [
    'material_categories',
    'customers',
    'raw_materials',
    'formulations',
    'finished_products',
    'bulk_products',
    'raw_material_inventory',
    'finished_product_inventory',
    'bulk_product_inventory',
    'formulation_ingredients',
    'purchase_orders',
    'purchase_order_items',
    'cost_history',
    'production_runs',
    'production_materials_used',
    'quality_tests',
    'packaging_runs',
    'packaging_materials_used',
    'batch_tracking',
    'sales',
    'sales_items',
    'customer_ledger'
  ];

  try {
    // 1. Delete all existing data first (respecting FK constraints)
    // We reverse the table list for deletion
    const reversedTables = [...tables].reverse();
    for (const table of reversedTables) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error && error.code !== 'PGRST116') {
        console.error(`Error clearing ${table} for restore:`, error);
      }
    }

    // 2. Insert data in the correct order (respecting FK constraints)
    for (const table of tables) {
      const tableData = backupData[table];
      if (tableData && tableData.length > 0) {
        // Handle chunks to avoid large request errors
        const chunkSize = 100;
        for (let i = 0; i < tableData.length; i += chunkSize) {
          const chunk = tableData.slice(i, i + chunkSize);
          const { error } = await supabase.from(table).insert(chunk);
          if (error) {
            console.error(`Error restoring ${table} (chunk ${i}):`, error);
            throw new Error(`Failed to restore table ${table}: ${error.message}`);
          }
        }
      }
    }

    return NextResponse.json({ message: 'System restoration successful' });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


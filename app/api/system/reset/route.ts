import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const ZERO_ID = '00000000-0000-0000-0000-000000000000';

const isMissingRelationError = (error: any) => {
  const code = error?.code;
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  return (
    code === 'PGRST116' || // relation missing / empty
    code === 'PGRST117' || // relation missing / empty
    code === 'PGRST205' || // schema cache miss
    code === '42P01' || // undefined table
    code === '42704' || // undefined object
    code === '42703' || // undefined column
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { module } = await req.json();

  const deleteTable = async (table: string) => {
    const { error } = await supabase.from(table).delete().neq('id', ZERO_ID);
    if (!error) {
      return;
    }
    if (isMissingRelationError(error)) {
      console.warn(`Skipping delete for ${table}: ${error.message || 'relation missing'}`);
      return;
    }
    console.error(`Error deleting ${table}:`, error);
    throw error;
  };

  const zeroInventory = async (table: string) => {
    const { error } = await supabase
      .from(table)
      .update({ quantity: 0 })
      .neq('id', ZERO_ID);
    if (!error) {
      return;
    }
    if (isMissingRelationError(error)) {
      console.warn(`Skipping inventory zeroing for ${table}: ${error.message || 'relation missing'}`);
      return;
    }
    console.error(`Error resetting inventory on ${table}:`, error);
    throw error;
  };

  // Delete order respects FK constraints: children first, parents last
  const fullResetTables = [
    'customer_ledger',
    'sales_items',
    'sales',
    'packaging_materials_used',
    'packaging_runs',
    'production_materials_used',
    'quality_tests',
    'production_runs',
    'batch_tracking',
    'purchase_order_items',
    'cost_history',
    'purchase_orders',
    'finished_product_inventory',
    'finished_products',
    'bulk_product_inventory',
    'bulk_products',
    'formulation_ingredients',
    'formulations',
    'raw_material_inventory',
    'raw_materials',
    'material_categories',
    'customers',
  ];

  const moduleHandlers: Record<string, () => Promise<string>> = {
    sales: async () => {
      await deleteTable('customer_ledger');
      await deleteTable('sales_items');
      await deleteTable('sales');
      return 'Sales and ledger reset successful';
    },
    production: async () => {
      await deleteTable('quality_tests');
      await deleteTable('production_materials_used');
      await deleteTable('production_runs');
      await deleteTable('packaging_materials_used');
      await deleteTable('packaging_runs');
      await deleteTable('batch_tracking');
      return 'Production, packaging, and batch tracking cleared';
    },
    inventory: async () => {
      await zeroInventory('raw_material_inventory');
      await zeroInventory('finished_product_inventory');
      await zeroInventory('bulk_product_inventory');
      return 'Inventory levels reset to zero';
    },
    formulations: async () => {
      const { error: detachError } = await supabase
        .from('bulk_products')
        .update({ formulation_id: null })
        .neq('id', ZERO_ID);
      if (detachError) {
        if (!isMissingRelationError(detachError)) {
          console.error('Error detaching bulk products from formulations:', detachError);
          throw detachError;
        }
        console.warn('Skipping bulk product detach (table or column missing).');
      }
      await deleteTable('formulation_ingredients');
      await deleteTable('formulations');
      return 'Formulations and ingredient mappings cleared';
    },
    raw_materials: async () => {
      await deleteTable('production_materials_used');
      await deleteTable('packaging_materials_used');
      await deleteTable('formulation_ingredients');
      await deleteTable('purchase_order_items');
      await deleteTable('cost_history');
      await deleteTable('raw_material_inventory');
      await deleteTable('raw_materials');
      return 'Raw materials, inventories, and usage logs cleared';
    },
    finished_products: async () => {
      await deleteTable('sales_items');
      await deleteTable('batch_tracking');
      await deleteTable('packaging_materials_used');
      await deleteTable('packaging_runs');
      await deleteTable('finished_product_inventory');
      await deleteTable('finished_products');
      return 'Finished products and related inventory removed';
    },
    bulk_products: async () => {
      await deleteTable('packaging_materials_used');
      await deleteTable('packaging_runs');
      await deleteTable('bulk_product_inventory');
      await deleteTable('bulk_products');
      return 'Bulk products and packaging prep history cleared';
    },
    purchases: async () => {
      await deleteTable('cost_history');
      await deleteTable('purchase_order_items');
      await deleteTable('purchase_orders');
      return 'Purchase orders, line items, and cost history cleared';
    },
    customers: async () => {
      await deleteTable('customer_ledger');
      await deleteTable('customers');
      return 'Customers and ledger cleared';
    },
    full: async () => {
      for (const table of fullResetTables) {
        await deleteTable(table);
      }
      return 'Full system reset successful';
    },
  };

  try {
    if (!module) {
      return NextResponse.json({ error: 'Module is required' }, { status: 400 });
    }

    const handler = moduleHandlers[module];
    if (!handler) {
      return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
    }

    const message = await handler();
    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('System reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


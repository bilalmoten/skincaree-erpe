import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get all finished products
    const { data: products, error: productsError } = await supabase
      .from('finished_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;

    if (!products || products.length === 0) {
      return NextResponse.json([]);
    }

    // Get all inventory records
    const productIds = products.map((p: any) => p.id);
    const { data: inventory } = await supabase
      .from('finished_product_inventory')
      .select('finished_product_id, quantity')
      .in('finished_product_id', productIds);

    // Get formulations
    const formulationIds = [...new Set(products.map((p: any) => p.formulation_id).filter(Boolean))];
    const { data: formulations } = await supabase
      .from('formulations')
      .select('id, name')
      .in('id', formulationIds);

    // Create maps
    const inventoryMap = new Map();
    if (inventory) {
      inventory.forEach((inv: any) => {
        inventoryMap.set(inv.finished_product_id, inv.quantity);
      });
    }

    const formulationMap = new Map();
    if (formulations) {
      formulations.forEach((f: any) => {
        formulationMap.set(f.id, { id: f.id, name: f.name });
      });
    }

    // Combine products with inventory and formulations
    const productsWithDetails = products.map((product: any) => {
      const qty = inventoryMap.get(product.id) ?? 0;
      return {
        ...product,
        finished_product_inventory: [
          {
            id: '',
            quantity: qty
          }
        ],
        formulations: product.formulation_id ? formulationMap.get(product.formulation_id) : null
      };
    });

    return NextResponse.json(productsWithDetails);
  } catch (error: any) {
    console.error('Error fetching finished products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { name, sku, price, formulation_id, units_per_batch, shelf_life_days, category_id, notes } = body;

    // Insert finished product
    const { data: product, error: productError } = await supabase
      .from('finished_products')
      .insert({
        name,
        sku: sku || null,
        price: parseFloat(price),
        formulation_id: formulation_id || null,
        units_per_batch: units_per_batch ? parseFloat(units_per_batch) : 1,
        shelf_life_days: shelf_life_days ? parseInt(shelf_life_days) : null,
        category_id: category_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (productError) throw productError;

    // Initialize inventory (use upsert to avoid errors if it already exists)
    const { error: inventoryError } = await supabase
      .from('finished_product_inventory')
      .upsert({
        finished_product_id: product.id,
        quantity: 0,
      }, {
        onConflict: 'finished_product_id'
      });

    if (inventoryError) throw inventoryError;

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


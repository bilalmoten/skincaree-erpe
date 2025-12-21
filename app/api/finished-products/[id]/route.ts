import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    
    // Get the finished product
    const { data: product, error: productError } = await supabase
      .from('finished_products')
      .select('*')
      .eq('id', id)
      .single();

    if (productError) throw productError;

    // Get the inventory record separately
    const { data: inventory, error: inventoryError } = await supabase
      .from('finished_product_inventory')
      .select('id, quantity')
      .eq('finished_product_id', id)
      .single();

    // Combine the data
    const productWithInventory = {
      ...product,
      finished_product_inventory: inventory ? [inventory] : [{ id: '', quantity: 0 }]
    };

    return NextResponse.json(productWithInventory);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    const body = await request.json();

    const { name, sku, price, formulation_id, units_per_batch, shelf_life_days, category_id, notes } = body;

    const { data, error } = await supabase
      .from('finished_products')
      .update({
        name,
        sku: sku || null,
        price: parseFloat(price),
        formulation_id: formulation_id || null,
        units_per_batch: units_per_batch ? parseFloat(units_per_batch) : 1,
        shelf_life_days: shelf_life_days ? parseInt(shelf_life_days) : null,
        category_id: category_id || null,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;

    const { error } = await supabase
      .from('finished_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


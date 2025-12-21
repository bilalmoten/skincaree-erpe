import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data: bulkProducts, error } = await supabase
      .from('bulk_products')
      .select(`
        *,
        formulations:formulation_id (
          id,
          name,
          batch_unit
        ),
        bulk_product_inventory (
          quantity,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(bulkProducts || []);
  } catch (error: any) {
    console.error('Error fetching bulk products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { name, formulation_id, unit, notes } = body;

    // Insert bulk product
    const { data: bulkProduct, error: bulkProductError } = await supabase
      .from('bulk_products')
      .insert({
        name,
        formulation_id: formulation_id || null,
        unit,
        notes: notes || null,
      })
      .select()
      .single();

    if (bulkProductError) throw bulkProductError;

    // Create initial inventory entry
    const { error: inventoryError } = await supabase
      .from('bulk_product_inventory')
      .insert({
        bulk_product_id: bulkProduct.id,
        quantity: 0,
      });

    if (inventoryError) throw inventoryError;

    return NextResponse.json(bulkProduct);
  } catch (error: any) {
    console.error('Error creating bulk product:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


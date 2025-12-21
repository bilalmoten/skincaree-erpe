import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    const body = await request.json();

    const { quantity, operation } = body; // operation: 'add' or 'subtract'

    // Get current inventory
    const { data: currentInventory, error: fetchError } = await supabase
      .from('bulk_product_inventory')
      .select('quantity')
      .eq('bulk_product_id', id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    const currentQty = currentInventory?.quantity || 0;
    const newQuantity = operation === 'subtract' 
      ? Math.max(0, currentQty - parseFloat(quantity))
      : currentQty + parseFloat(quantity);

    // Upsert inventory
    const { data, error } = await supabase
      .from('bulk_product_inventory')
      .upsert({
        bulk_product_id: id,
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'bulk_product_id',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating bulk product inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('bulk_product_inventory')
      .select('*')
      .eq('bulk_product_id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data || { quantity: 0 });
  } catch (error: any) {
    console.error('Error fetching bulk product inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    
    // Get the raw material
    const { data: material, error: materialError } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('id', id)
      .single();

    if (materialError) throw materialError;

    // Get the inventory record
    const { data: inventory, error: inventoryError } = await supabase
      .from('raw_material_inventory')
      .select('id, quantity')
      .eq('raw_material_id', id)
      .single();

    // Combine the data
    const materialWithInventory = {
      ...material,
      raw_material_inventory: inventory ? [inventory] : [{ id: '', quantity: 0 }]
    };

    return NextResponse.json(materialWithInventory);
  } catch (error: any) {
    console.error('Error fetching raw material:', error);
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

    const { name, unit, supplier, last_price, notes } = body;

    const { data, error } = await supabase
      .from('raw_materials')
      .update({
        name,
        unit,
        supplier: supplier || null,
        last_price: last_price ? parseFloat(last_price) : null,
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
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


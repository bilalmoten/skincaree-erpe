import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    const body = await request.json();

    const { quantity, price, purchase_date, notes } = body;

    // Get current inventory
    const { data: currentInventory } = await supabase
      .from('raw_material_inventory')
      .select('quantity')
      .eq('raw_material_id', id)
      .single();

    const currentQty = currentInventory?.quantity || 0;
    const newQty = currentQty + parseFloat(quantity);

    // Update inventory
    const { error: inventoryError } = await supabase
      .from('raw_material_inventory')
      .upsert({
        raw_material_id: id,
        quantity: newQty,
      });

    if (inventoryError) throw inventoryError;

    // Update last price
    if (price) {
      const { error: priceError } = await supabase
        .from('raw_materials')
        .update({ last_price: parseFloat(price) })
        .eq('id', id);

      if (priceError) throw priceError;
    }

    return NextResponse.json({ success: true, newQuantity: newQty });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get all raw materials
    const { data: materials, error: materialsError } = await supabase
      .from('raw_materials')
      .select('id, name, unit, last_price')
      .order('name');

    if (materialsError) throw materialsError;

    if (!materials || materials.length === 0) {
      return NextResponse.json([]);
    }

    // Get all inventory records
    const { data: inventory, error: inventoryError } = await supabase
      .from('raw_material_inventory')
      .select('raw_material_id, quantity');

    if (inventoryError) throw inventoryError;

    // Create a map of material_id -> quantity
    const inventoryMap = new Map();
    if (inventory) {
      inventory.forEach((inv: any) => {
        inventoryMap.set(inv.raw_material_id, inv.quantity);
      });
    }

    // Combine materials with their inventory
    const materialsWithInventory = materials.map((material: any) => {
      const quantity = inventoryMap.get(material.id) ?? 0;
      return {
        ...material,
        raw_material_inventory: [
          {
            quantity: quantity
          }
        ]
      };
    });

    return NextResponse.json(materialsWithInventory);
  } catch (error: any) {
    console.error('Error fetching purchases data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { raw_material_id, quantity, price, purchase_date, notes } = body;

    // Get current inventory
    const { data: currentInventory } = await supabase
      .from('raw_material_inventory')
      .select('quantity')
      .eq('raw_material_id', raw_material_id)
      .single();

    const currentQty = currentInventory?.quantity || 0;
    const newQty = currentQty + parseFloat(quantity);

    // Update inventory (upsert to handle missing records)
    const { error: inventoryError } = await supabase
      .from('raw_material_inventory')
      .upsert({
        raw_material_id: raw_material_id,
        quantity: newQty,
      }, {
        onConflict: 'raw_material_id'
      });

    if (inventoryError) throw inventoryError;

    // Update last price
    if (price) {
      const { error: priceError } = await supabase
        .from('raw_materials')
        .update({ last_price: parseFloat(price) })
        .eq('id', raw_material_id);

      if (priceError) throw priceError;
    }

    return NextResponse.json({ success: true, newQuantity: newQty });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


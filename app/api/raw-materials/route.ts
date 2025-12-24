import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // First, get all raw materials with categories
    const { data: materials, error: materialsError } = await supabase
      .from('raw_materials')
      .select('*, material_categories(name)')
      .order('created_at', { ascending: false });

    if (materialsError) throw materialsError;

    if (!materials || materials.length === 0) {
      return NextResponse.json([]);
    }

    // Then, get all inventory records
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
            id: '',
            quantity: quantity
          }
        ]
      };
    });

    return NextResponse.json(materialsWithInventory);
  } catch (error: any) {
    console.error('Error fetching raw materials:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { name, unit, supplier, last_price, notes, category_id } = body;

    // Insert raw material
    const { data: material, error: materialError } = await supabase
      .from('raw_materials')
      .insert({
        name,
        unit,
        supplier: supplier || null,
        last_price: last_price ? parseFloat(last_price) : null,
        notes: notes || null,
        category_id: category_id || null,
      })
      .select()
      .single();

    if (materialError) throw materialError;

    // Initialize inventory (use upsert to avoid errors if it already exists)
    const { error: inventoryError } = await supabase
      .from('raw_material_inventory')
      .upsert({
        raw_material_id: material.id,
        quantity: 0,
      }, {
        onConflict: 'raw_material_id'
      });

    if (inventoryError) throw inventoryError;

    return NextResponse.json(material);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


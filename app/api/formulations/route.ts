import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get all formulations
    const { data: formulations, error: formulationsError } = await supabase
      .from('formulations')
      .select('*')
      .order('created_at', { ascending: false });

    if (formulationsError) throw formulationsError;

    if (!formulations || formulations.length === 0) {
      return NextResponse.json([]);
    }

    // Get all formulation ingredients
    const formulationIds = formulations.map((f: any) => f.id);
    const { data: ingredients } = await supabase
      .from('formulation_ingredients')
      .select('id, formulation_id, raw_material_id, bulk_product_id, quantity, unit')
      .in('formulation_id', formulationIds);

    // Get raw material names
    const materialIds = [...new Set(ingredients?.filter(i => i.raw_material_id).map((i: any) => i.raw_material_id) || [])];
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, name, unit')
      .in('id', materialIds);

    // Get bulk product names
    const bulkIds = [...new Set(ingredients?.filter(i => i.bulk_product_id).map((i: any) => i.bulk_product_id) || [])];
    const { data: bulkProducts } = await supabase
      .from('bulk_products')
      .select('id, name, unit')
      .in('id', bulkIds);

    const materialMap = new Map(rawMaterials?.map(m => [m.id, m]) || []);
    const bulkMap = new Map(bulkProducts?.map(b => [b.id, b]) || []);

    // Group ingredients by formulation
    const ingredientsByFormulation = new Map();
    if (ingredients) {
      ingredients.forEach((ing: any) => {
        if (!ingredientsByFormulation.has(ing.formulation_id)) {
          ingredientsByFormulation.set(ing.formulation_id, []);
        }
        
        if (ing.raw_material_id) {
          const material = materialMap.get(ing.raw_material_id);
          ingredientsByFormulation.get(ing.formulation_id).push({
            id: ing.id,
            quantity: ing.quantity,
            unit: ing.unit,
            raw_material_id: ing.raw_material_id,
            type: 'material',
            name: material?.name || 'Unknown',
          });
        } else if (ing.bulk_product_id) {
          const bulk = bulkMap.get(ing.bulk_product_id);
          ingredientsByFormulation.get(ing.formulation_id).push({
            id: ing.id,
            quantity: ing.quantity,
            unit: ing.unit,
            bulk_product_id: ing.bulk_product_id,
            type: 'bulk',
            name: bulk?.name || 'Unknown',
          });
        }
      });
    }

    // Combine formulations with ingredients
    const formulationsWithIngredients = formulations.map((formulation: any) => ({
      ...formulation,
      formulation_ingredients: ingredientsByFormulation.get(formulation.id) || []
    }));

    return NextResponse.json(formulationsWithIngredients);
  } catch (error: any) {
    console.error('Error fetching formulations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { name, description, batch_size, batch_unit, produces_type, produces_id, ingredients } = body;

    // Insert formulation
    const { data: formulation, error: formulationError } = await supabase
      .from('formulations')
      .insert({
        name,
        description: description || null,
        batch_size: parseFloat(batch_size) || 1,
        batch_unit: batch_unit || 'kg',
        produces_type: produces_type || null,
        produces_id: produces_id || null,
      })
      .select()
      .single();

    if (formulationError) throw formulationError;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientData = ingredients.map((ing: any) => ({
        formulation_id: formulation.id,
        raw_material_id: ing.type === 'material' ? ing.raw_material_id : null,
        bulk_product_id: ing.type === 'bulk' ? (ing.bulk_product_id || ing.raw_material_id) : null,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
      }));

      const { error: ingredientsError } = await supabase
        .from('formulation_ingredients')
        .insert(ingredientData);

      if (ingredientsError) throw ingredientsError;
    }

    return NextResponse.json(formulation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


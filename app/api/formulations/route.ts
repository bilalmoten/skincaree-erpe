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
      .select('id, formulation_id, raw_material_id, quantity, unit')
      .in('formulation_id', formulationIds);

    // Get raw material names
    const materialIds = [...new Set(ingredients?.map((i: any) => i.raw_material_id) || [])];
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, name, unit')
      .in('id', materialIds);

    const materialMap = new Map();
    if (rawMaterials) {
      rawMaterials.forEach((m: any) => {
        materialMap.set(m.id, { id: m.id, name: m.name, unit: m.unit });
      });
    }

    // Group ingredients by formulation
    const ingredientsByFormulation = new Map();
    if (ingredients) {
      ingredients.forEach((ing: any) => {
        if (!ingredientsByFormulation.has(ing.formulation_id)) {
          ingredientsByFormulation.set(ing.formulation_id, []);
        }
        const material = materialMap.get(ing.raw_material_id);
        ingredientsByFormulation.get(ing.formulation_id).push({
          id: ing.id,
          quantity: ing.quantity,
          unit: ing.unit,
          raw_material_id: ing.raw_material_id,
          raw_materials: material || { id: ing.raw_material_id, name: 'Unknown', unit: ing.unit }
        });
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

    const { name, description, batch_size, ingredients } = body;

    // Insert formulation
    const { data: formulation, error: formulationError } = await supabase
      .from('formulations')
      .insert({
        name,
        description: description || null,
        batch_size: parseFloat(batch_size) || 1,
      })
      .select()
      .single();

    if (formulationError) throw formulationError;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientData = ingredients.map((ing: any) => ({
        formulation_id: formulation.id,
        raw_material_id: ing.raw_material_id,
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


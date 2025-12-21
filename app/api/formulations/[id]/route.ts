import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();
    const { id } = await params;
    
    const { data, error } = await supabase
      .from('formulations')
      .select(`
        *,
        formulation_ingredients (
          id,
          quantity,
          unit,
          raw_material_id,
          raw_materials (
            id,
            name,
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
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

    const { name, description, batch_size, ingredients } = body;

    // Update formulation
    const { error: formulationError } = await supabase
      .from('formulations')
      .update({
        name,
        description: description || null,
        batch_size: parseFloat(batch_size) || 1,
      })
      .eq('id', id);

    if (formulationError) throw formulationError;

    // Delete existing ingredients
    await supabase
      .from('formulation_ingredients')
      .delete()
      .eq('formulation_id', id);

    // Insert new ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientData = ingredients.map((ing: any) => ({
        formulation_id: id,
        raw_material_id: ing.raw_material_id,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
      }));

      const { error: ingredientsError } = await supabase
        .from('formulation_ingredients')
        .insert(ingredientData);

      if (ingredientsError) throw ingredientsError;
    }

    return NextResponse.json({ success: true });
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
      .from('formulations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


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
    const { quantity } = body;

    // Update or insert inventory
    const { data, error } = await supabase
      .from('raw_material_inventory')
      .upsert({
        raw_material_id: id,
        quantity: parseFloat(quantity),
      }, {
        onConflict: 'raw_material_id'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


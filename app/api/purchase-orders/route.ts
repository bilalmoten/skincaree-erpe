import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          id,
          quantity,
          unit_price,
          subtotal,
          raw_materials (
            id,
            name,
            unit
          )
        )
      `)
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { supplier_name, purchase_date, items, notes } = body;

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unit_price) * parseFloat(item.quantity));
    }, 0);

    // Create purchase order
    const { data: purchaseOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        supplier_name: supplier_name || null,
        purchase_date: purchase_date || new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        notes: notes || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create purchase order items and update inventory
    for (const item of items) {
      // Create purchase order item
      const subtotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
      const { error: itemError } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: purchaseOrder.id,
          raw_material_id: item.raw_material_id,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          subtotal: subtotal,
        });

      if (itemError) throw itemError;

      // Update raw material inventory
      const { data: currentInventory } = await supabase
        .from('raw_material_inventory')
        .select('quantity')
        .eq('raw_material_id', item.raw_material_id)
        .single();

      const currentQty = currentInventory?.quantity || 0;
      const newQty = currentQty + parseFloat(item.quantity);

      await supabase
        .from('raw_material_inventory')
        .upsert({
          raw_material_id: item.raw_material_id,
          quantity: newQty,
        }, {
          onConflict: 'raw_material_id'
        });

      // Get current average cost and inventory for weighted average calculation
      const { data: material } = await supabase
        .from('raw_materials')
        .select('average_cost')
        .eq('id', item.raw_material_id)
        .single();

      const currentAvgCost = material?.average_cost || 0;
      const purchaseCost = parseFloat(item.unit_price);
      const purchaseQty = parseFloat(item.quantity);

      // Calculate weighted average cost
      let newAverageCost = purchaseCost;
      if (currentQty > 0 && currentAvgCost > 0) {
        const totalValue = (currentAvgCost * currentQty) + (purchaseCost * purchaseQty);
        newAverageCost = totalValue / newQty;
      }

      // Update material costs
      await supabase
        .from('raw_materials')
        .update({
          last_price: purchaseCost,
          last_purchase_cost: purchaseCost,
          average_cost: newAverageCost,
        })
        .eq('id', item.raw_material_id);

      // Create cost history entry
      await supabase
        .from('cost_history')
        .insert({
          raw_material_id: item.raw_material_id,
          purchase_order_id: purchaseOrder.id,
          cost_per_unit: purchaseCost,
          quantity: purchaseQty,
          total_cost: subtotal,
          purchase_date: purchase_date || new Date().toISOString().split('T')[0],
        });
    }

    return NextResponse.json(purchaseOrder);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


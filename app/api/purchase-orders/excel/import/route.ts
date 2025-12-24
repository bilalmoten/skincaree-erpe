import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const { data: materials } = await supabase.from('raw_materials').select('id, name');
    const materialMap = new Map(materials?.map((m: any) => [m.name.toLowerCase(), m.id]) || []);

    const imported = [];
    const errors = [];

    // Group items by supplier and date to create single POs for multiple items
    const groupedPOs = new Map();

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const key = `${row.supplier_name}-${row.purchase_date}-${row.notes}`;
      
      if (!groupedPOs.has(key)) {
        groupedPOs.set(key, {
          supplier_name: row.supplier_name || 'Imported Supplier',
          purchase_date: row.purchase_date || new Date().toISOString().split('T')[0],
          notes: row.notes || 'Imported from Excel',
          items: []
        });
      }
      
      const materialId = materialMap.get(row.material_name?.toLowerCase());
      if (!materialId) {
        errors.push(`Row ${i + 2}: Material "${row.material_name}" not found`);
        continue;
      }

      groupedPOs.get(key).items.push({
        raw_material_id: materialId,
        quantity: parseFloat(row.quantity),
        unit_price: parseFloat(row.unit_price),
      });
    }

    for (const po of groupedPOs.values()) {
      if (po.items.length === 0) continue;

      const totalAmount = po.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      const { data: purchaseOrder, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_name: po.supplier_name,
          purchase_date: po.purchase_date,
          total_amount: totalAmount,
          notes: po.notes,
        })
        .select()
        .single();

      if (poError) {
        errors.push(`Error creating PO for ${po.supplier_name}: ${poError.message}`);
        continue;
      }

      for (const item of po.items) {
        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .insert({
            purchase_order_id: purchaseOrder.id,
            raw_material_id: item.raw_material_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price,
          });

        if (itemError) {
          errors.push(`Error adding item to PO ${purchaseOrder.id}: ${itemError.message}`);
          continue;
        }

        // Update inventory and last price
        const { data: currentInv } = await supabase
          .from('raw_material_inventory')
          .select('quantity')
          .eq('raw_material_id', item.raw_material_id)
          .single();
        
        await Promise.all([
          supabase
            .from('raw_material_inventory')
            .upsert({
              raw_material_id: item.raw_material_id,
              quantity: (currentInv?.quantity || 0) + item.quantity,
            }),
          supabase
            .from('raw_materials')
            .update({ last_price: item.unit_price })
            .eq('id', item.raw_material_id)
        ]);
      }

      imported.push(purchaseOrder);
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


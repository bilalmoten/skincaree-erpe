import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Get batches expiring within the specified days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const { data: expiringBatches, error } = await supabase
      .from('batch_tracking')
      .select(`
        *,
        finished_products:finished_product_id (
          id,
          name,
          sku
        )
      `)
      .eq('status', 'active')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', expiryDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) throw error;

    // Also check finished product inventory with expiry dates
    const { data: expiringInventory, error: invError } = await supabase
      .from('finished_product_inventory')
      .select(`
        *,
        finished_products:finished_product_id (
          id,
          name,
          sku
        )
      `)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', expiryDate.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (invError) throw invError;

    return NextResponse.json({
      batches: expiringBatches || [],
      inventory: expiringInventory || [],
    });
  } catch (error: any) {
    console.error('Error fetching expiry alerts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


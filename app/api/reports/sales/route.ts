import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('sales')
      .select(`
        *,
        customers (
          name
        ),
        sales_items (
          quantity,
          unit_price,
          subtotal,
          finished_products (
            name
          )
        )
      `)
      .order('sale_date', { ascending: false });

    if (startDate) {
      query = query.gte('sale_date', startDate);
    }
    if (endDate) {
      query = query.lte('sale_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate summary
    const totalSales = data.length;
    const totalRevenue = data.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalItems = data.reduce((sum, sale) => {
      return sum + (sale.sales_items?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) || 0);
    }, 0);

    return NextResponse.json({
      summary: {
        totalSales,
        totalRevenue,
        totalItems,
      },
      sales: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


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

    // Sales by product
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    data.forEach((sale: any) => {
      sale.sales_items?.forEach((item: any) => {
        const productName = item.finished_products?.name || 'Unknown';
        if (!productSales[productName]) {
          productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
        }
        productSales[productName].quantity += item.quantity;
        productSales[productName].revenue += item.subtotal;
      });
    });

    // Sales by customer
    const customerSales: Record<string, { name: string; sales: number; revenue: number }> = {};
    data.forEach((sale: any) => {
      const customerName = sale.customers?.name || 'Walk-in Customer';
      if (!customerSales[customerName]) {
        customerSales[customerName] = { name: customerName, sales: 0, revenue: 0 };
      }
      customerSales[customerName].sales += 1;
      customerSales[customerName].revenue += sale.total_amount;
    });

    return NextResponse.json({
      summary: {
        totalSales,
        totalRevenue,
        totalItems,
      },
      sales: data,
      byProduct: Object.values(productSales).sort((a, b) => b.revenue - a.revenue),
      byCustomer: Object.values(customerSales).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


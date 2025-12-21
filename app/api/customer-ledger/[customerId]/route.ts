import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const supabase = createServerClient();
    const { customerId } = await params;
    
    const { data, error } = await supabase
      .from('customer_ledger')
      .select(`
        *,
        sales (
          id,
          sale_date,
          total_amount
        )
      `)
      .eq('customer_id', customerId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const supabase = createServerClient();
    const { customerId } = await params;
    const body = await request.json();

    const { amount, transaction_date, notes, sale_id } = body;

    // Get current balance
    const { data: lastEntry } = await supabase
      .from('customer_ledger')
      .select('balance')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentBalance = lastEntry?.balance || 0;
    const newBalance = currentBalance - parseFloat(amount); // Payment reduces balance

    const { data, error } = await supabase
      .from('customer_ledger')
      .insert({
        customer_id: customerId,
        sale_id: sale_id || null,
        transaction_type: 'payment',
        amount: parseFloat(amount),
        balance: newBalance,
        transaction_date: transaction_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


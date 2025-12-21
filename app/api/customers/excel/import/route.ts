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

    const customers = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        if (!row.name) {
          errors.push(`Row ${i + 2}: Missing required field (name)`);
          continue;
        }

        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            address: row.address || null,
            notes: row.notes || null,
          })
          .select()
          .single();

        if (customerError) {
          errors.push(`Row ${i + 2}: ${customerError.message}`);
          continue;
        }

        customers.push(customer);
      } catch (error: any) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: customers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


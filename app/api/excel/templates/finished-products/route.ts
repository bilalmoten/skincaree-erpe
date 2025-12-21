import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const headers = ['name', 'sku', 'price', 'formulation_name', 'quantity', 'notes'];
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Finished Products');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="finished_products_template.xlsx"',
    },
  });
}


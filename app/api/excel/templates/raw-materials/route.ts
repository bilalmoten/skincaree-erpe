import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const headers = ['name', 'unit', 'supplier', 'last_price', 'quantity', 'notes'];
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Materials');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="raw_materials_template.xlsx"',
    },
  });
}


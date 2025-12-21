import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  const headers = ['name', 'description', 'batch_size', 'ingredients'];
  const exampleRow = [
    'Moisturizer Cream',
    'Daily moisturizer',
    '100',
    'Water:70:L, Glycerin:10:L, Emulsifier:5:g, Preservative:1:g'
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Formulations');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="formulations_template.xlsx"',
    },
  });
}


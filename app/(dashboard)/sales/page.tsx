'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface Sale {
  id: string;
  customer_id: string | null;
  sale_date: string;
  total_amount: number;
  notes: string | null;
  is_cash_paid: boolean;
  customers: { name: string } | null;
  sales_items: Array<{
    quantity: number;
    unit_price: number;
    subtotal: number;
    finished_products: { name: string };
  }>;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales');
      const data = await res.json();
      setSales(data);
      setFilteredSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSales(sales);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sales.filter((sale) =>
        sale.customers?.name.toLowerCase().includes(query) ||
        sale.id.toLowerCase().includes(query) ||
        sale.notes?.toLowerCase().includes(query) ||
        sale.sales_items?.some((item) => item.finished_products?.name.toLowerCase().includes(query))
      );
      setFilteredSales(filtered);
    }
  }, [searchQuery, sales]);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/sales/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales.xlsx';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { generateReportPDF } = await import('@/lib/pdf/utils');
      
      const res = await fetch('/api/reports/sales');
      const data = await res.json();
      
      const doc = generateReportPDF('Sales Report', data, 'sales');
      doc.save('sales-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Sales</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg font-medium"
          >
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg font-medium"
          >
            Export PDF
          </button>
          <Link
            href="/sales/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            New Sale
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search sales by customer name, sale ID, or product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 text-sm dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
        />
      </div>

      <div className="space-y-4">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <p className="text-purple-600 dark:text-purple-400">
              {searchQuery ? 'No sales match your search.' : 'No sales found. Create your first sale!'}
            </p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div key={sale.id} className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    Sale #{sale.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {sale.customers?.name || 'Walk-in Customer'} | {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-300">Total: PKR {sale.total_amount.toFixed(2)}</p>
                    {sale.is_cash_paid ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-lg">Cash Paid</span>
                    ) : sale.customer_id ? (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-lg">On Credit</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const { generateSalesInvoicePDF } = await import('@/lib/pdf/utils');
                        const doc = generateSalesInvoicePDF(sale);
                        doc.save(`invoice-${sale.id.slice(0, 8)}.pdf`);
                      } catch (error) {
                        console.error('Error generating invoice:', error);
                        alert('Failed to generate invoice');
                      }
                    }}
                    className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                  >
                    Print Receipt
                  </button>
                  {sale.customer_id && (
                    <Link
                      href={`/customers/${sale.customer_id}/ledger`}
                      className="text-green-600 dark:text-green-400 hover:underline text-sm font-medium"
                    >
                      View Ledger
                    </Link>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <h4 className="font-medium text-sm mb-1 text-purple-700 dark:text-purple-300">Items:</h4>
                <ul className="text-sm text-purple-600 dark:text-purple-400">
                  {sale.sales_items?.map((item, idx) => (
                    <li key={idx}>
                      {item.finished_products?.name}: {item.quantity} × PKR {item.unit_price.toFixed(2)} = PKR {item.subtotal.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


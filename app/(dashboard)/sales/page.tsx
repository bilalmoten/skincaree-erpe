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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales');
      const data = await res.json();
      setSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sales</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export Excel
          </button>
          <Link
            href="/sales/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            New Sale
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No sales found. Create your first sale!
          </div>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} className="bg-white border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    Sale #{sale.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {sale.customers?.name || 'Walk-in Customer'} | {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-lg font-bold mt-1">Total: PKR {sale.total_amount.toFixed(2)}</p>
                </div>
                {sale.customer_id && (
                  <Link
                    href={`/customers/${sale.customer_id}/ledger`}
                    className="text-green-600 hover:underline"
                  >
                    View Ledger
                  </Link>
                )}
              </div>
              <div className="mt-2">
                <h4 className="font-medium text-sm mb-1">Items:</h4>
                <ul className="text-sm text-gray-600">
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


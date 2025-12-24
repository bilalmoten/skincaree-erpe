'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
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
      showToast('Failed to export', 'error');
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
      showToast('PDF generated successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/sales');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales_template.xlsx';
      a.click();
    } catch (error) {
      console.error('Error downloading template:', error);
      showToast('Failed to download template', 'error');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/sales/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} sales`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Errors: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
        fetchSales();
      } else {
        showToast(`Error: ${result.error || 'Import failed'}`, 'error');
      }
    } catch (error) {
      console.error('Error importing:', error);
      showToast('Failed to import', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sales</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleDownloadTemplate}
            variant="secondary"
            size="sm"
          >
            Download Template
          </Button>
          <Button
            onClick={() => setShowImport(!showImport)}
            variant="outline"
            size="sm"
          >
            Import Excel
          </Button>
          <Button
            onClick={handleExport}
            size="sm"
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
          >
            Export Excel
          </Button>
          <Button
            onClick={handleExportPDF}
            size="sm"
            variant="destructive"
          >
            Export PDF
          </Button>
          <Button asChild size="sm">
            <Link href="/sales/new">New Sale</Link>
          </Button>
        </div>
      </div>

      {showImport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import from Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button
                onClick={handleImport}
                disabled={importing || !importFile}
                size="sm"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button
                onClick={() => {
                  setShowImport(false);
                  setImportFile(null);
                }}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search sales by customer name, sale ID, or product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      <div className="space-y-4">
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No sales match your search.' : 'No sales found. Create your first sale!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-xl transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Sale #{sale.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {sale.customers?.name || 'Walk-in Customer'} | {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg font-bold text-foreground">Total: PKR {sale.total_amount.toFixed(2)}</p>
                      {sale.is_cash_paid ? (
                        <Badge className="bg-[hsl(var(--success))] text-white">Cash Paid</Badge>
                      ) : sale.customer_id ? (
                        <Badge className="bg-[hsl(var(--warning))] text-white">On Credit</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          const { generateSalesInvoicePDF } = await import('@/lib/pdf/utils');
                          const doc = generateSalesInvoicePDF(sale);
                          doc.save(`invoice-${sale.id.slice(0, 8)}.pdf`);
                        } catch (error) {
                          console.error('Error generating invoice:', error);
                          showToast('Failed to generate invoice', 'error');
                        }
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Print Receipt
                    </Button>
                    {sale.customer_id && (
                      <Button asChild variant="ghost" size="sm" className="text-[hsl(var(--success))]">
                        <Link href={`/customers/${sale.customer_id}/ledger`}>
                          View Ledger
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <h4 className="font-medium text-sm mb-1 text-foreground">Items:</h4>
                  <ul className="text-sm text-muted-foreground">
                    {sale.sales_items?.map((item, idx) => (
                      <li key={idx}>
                        {item.finished_products?.name}: {item.quantity} × PKR {item.unit_price.toFixed(2)} = PKR {item.subtotal.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

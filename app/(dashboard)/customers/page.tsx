'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export default function CustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter((customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/customers/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers.xlsx';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Failed to export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/customers');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers_template.xlsx';
      a.click();
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/customers/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        showToast(`Successfully imported ${result.imported} customers${result.errors ? `. Errors: ${result.errors.join(', ')}` : ''}`, 'success');
        setShowImport(false);
        setImportFile(null);
        fetchCustomers();
      } else {
        showToast(`Error: ${result.error || 'Import failed'}`, 'error');
      }
    } catch (error) {
      console.error('Error importing:', error);
      showToast('Failed to import', 'error');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Customers</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleDownloadTemplate}
            variant="secondary"
            size="sm"
          >
            Download Template
          </Button>
          <Button
            onClick={() => setShowImport(!showImport)}
            size="sm"
          >
            Import Excel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="default"
            size="sm"
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button asChild size="sm">
            <Link href="/customers/new">Add New</Link>
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search customers by name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
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

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden xl:table-cell">Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No customers match your search.' : 'No customers found. Add your first customer!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="text-xs sm:text-sm">{customer.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs sm:text-sm">{customer.email || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{customer.phone || '-'}</TableCell>
                    <TableCell className="hidden xl:table-cell truncate max-w-xs text-xs sm:text-sm">{customer.address || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-primary hover:underline font-medium text-xs sm:text-sm"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/customers/${customer.id}/ledger`}
                          className="text-[hsl(var(--success))] hover:underline text-xs sm:text-sm"
                        >
                          Ledger
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

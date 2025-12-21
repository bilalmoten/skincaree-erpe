'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export default function CustomersPage() {
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
      alert('Failed to export');
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
        alert(`Successfully imported ${result.imported} customers${result.errors ? `\nErrors: ${result.errors.join(', ')}` : ''}`);
        setShowImport(false);
        setImportFile(null);
        fetchCustomers();
      } else {
        alert(`Error: ${result.error || 'Import failed'}`);
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Customers</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 sm:px-4 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-all text-sm font-medium"
          >
            Download Template
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
          >
            Import Excel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-medium shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <Link
            href="/customers/new"
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
          >
            Add New
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers by name, email, phone, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 text-sm dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
        />
      </div>

      {showImport && (
        <div className="mb-6 p-4 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
          <h2 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Import from Excel</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="flex-1 border-2 border-purple-200 dark:border-purple-700 rounded-lg px-2 py-1 dark:bg-purple-800 dark:text-white"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="px-4 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportFile(null);
              }}
              className="px-4 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-all text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-purple-50 dark:bg-purple-800">
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Phone</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Address</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-purple-600 dark:text-purple-400">
                    No customers found. Add your first customer!
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-purple-50 dark:hover:bg-purple-800/50 transition-colors">
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">{customer.name}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">{customer.email || '-'}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">{customer.phone || '-'}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">{customer.address || '-'}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-purple-600 dark:text-purple-400 hover:underline mr-2 font-medium"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/customers/${customer.id}/ledger`}
                      className="text-green-600 hover:underline"
                    >
                      Ledger
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


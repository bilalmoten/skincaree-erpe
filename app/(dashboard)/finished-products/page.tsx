'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FinishedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  formulation_id: string | null;
  notes: string | null;
  finished_product_inventory: Array<{ quantity: number }>;
  formulations: { name: string } | null;
}

export default function FinishedProductsPage() {
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<FinishedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/finished-products');
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.notes?.toLowerCase().includes(query) ||
        product.formulations?.name.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/finished-products/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finished_products.xlsx';
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
      const res = await fetch('/api/excel/templates/finished-products');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finished_products_template.xlsx';
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
      const res = await fetch('/api/finished-products/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        alert(`Successfully imported ${result.imported} products${result.errors ? `\nErrors: ${result.errors.join(', ')}` : ''}`);
        setShowImport(false);
        setImportFile(null);
        fetchProducts();
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
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Finished Products</h1>
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
            href="/finished-products/new"
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
          >
            Add New
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products by name, SKU, or notes..."
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
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">SKU</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Price</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Formulation</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Quantity</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-purple-700 dark:text-purple-300 border-b-2 border-purple-200 dark:border-purple-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-purple-600 dark:text-purple-400">
                    No finished products found. Add your first product!
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-purple-50 dark:hover:bg-purple-800/50 transition-colors">
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">{product.name}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">{product.sku || '-'}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">PKR {product.price.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">
                    {product.formulations?.name || '-'}
                  </td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700 text-gray-900 dark:text-white">
                    {product.finished_product_inventory?.[0]?.quantity || 0}
                  </td>
                  <td className="px-4 py-2 border-b border-purple-200 dark:border-purple-700">
                    <Link
                      href={`/finished-products/${product.id}`}
                      className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                    >
                      Edit
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


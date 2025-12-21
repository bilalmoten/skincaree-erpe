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
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/finished-products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Finished Products</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Download Template
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Import Excel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export Excel
          </button>
          <Link
            href="/finished-products/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add New
          </Link>
        </div>
      </div>

      {showImport && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h2 className="font-semibold mb-2">Import from Excel</h2>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="border rounded px-2 py-1"
            />
            <button
              onClick={handleImport}
              disabled={!importFile}
              className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Import
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportFile(null);
              }}
              className="px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left border">Name</th>
              <th className="px-4 py-2 text-left border">SKU</th>
              <th className="px-4 py-2 text-left border">Price</th>
              <th className="px-4 py-2 text-left border">Formulation</th>
              <th className="px-4 py-2 text-left border">Quantity</th>
              <th className="px-4 py-2 text-left border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No finished products found. Add your first product!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{product.name}</td>
                  <td className="px-4 py-2 border">{product.sku || '-'}</td>
                  <td className="px-4 py-2 border">PKR {product.price.toFixed(2)}</td>
                  <td className="px-4 py-2 border">
                    {product.formulations?.name || '-'}
                  </td>
                  <td className="px-4 py-2 border">
                    {product.finished_product_inventory?.[0]?.quantity || 0}
                  </td>
                  <td className="px-4 py-2 border">
                    <Link
                      href={`/finished-products/${product.id}`}
                      className="text-blue-600 hover:underline"
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


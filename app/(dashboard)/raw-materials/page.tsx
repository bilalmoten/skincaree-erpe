'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  supplier: string | null;
  last_price: number | null;
  notes: string | null;
  raw_material_inventory: Array<{ quantity: number }>;
}

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/raw-materials/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raw_materials.xlsx';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/raw-materials');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raw_materials_template.xlsx';
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
      const res = await fetch('/api/raw-materials/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        alert(`Successfully imported ${result.imported} materials`);
        setShowImport(false);
        setImportFile(null);
        fetchMaterials();
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Raw Materials</h1>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm"
            >
              Download Template
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors text-sm shadow-sm"
            >
              Import Excel
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors text-sm shadow-sm"
            >
              Export Excel
            </button>
            <Link
              href="/raw-materials/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm shadow-sm"
            >
              + Add New
            </Link>
          </div>
        </div>
      </div>

      {showImport && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Import from Excel</h2>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleImport}
              disabled={!importFile}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 font-medium transition-colors text-sm"
            >
              Import
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportFile(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No raw materials found. Add your first material!
                  </td>
                </tr>
              ) : (
                materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.supplier || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.last_price ? `PKR ${material.last_price.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {material.raw_material_inventory?.[0]?.quantity || 0} {material.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3">
                        <Link
                          href={`/raw-materials/${material.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/purchases?material=${material.id}`}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Purchase
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


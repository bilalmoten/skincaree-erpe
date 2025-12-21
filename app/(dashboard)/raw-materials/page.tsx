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
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setMaterials(data);
      setFilteredMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMaterials(materials);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = materials.filter((material) =>
        material.name.toLowerCase().includes(query) ||
        material.supplier?.toLowerCase().includes(query) ||
        material.notes?.toLowerCase().includes(query)
      );
      setFilteredMaterials(filtered);
    }
  }, [searchQuery, materials]);

  const handleExport = async () => {
    setExporting(true);
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
    } finally {
      setExporting(false);
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

    setImporting(true);
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
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Raw Materials</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 sm:px-4 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 font-medium transition-all text-sm"
            >
              Download Template
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-all text-sm shadow-md hover:shadow-lg"
            >
              Import Excel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-all text-sm shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
            <Link
              href="/raw-materials/new"
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-all text-sm shadow-md hover:shadow-lg"
            >
              + Add New
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search materials by name, supplier, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 text-sm dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
        />
      </div>

      {showImport && (
        <div className="mb-6 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4">
          <h2 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">Import from Excel</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="flex-1 border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 text-sm dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-all text-sm shadow-sm"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportFile(null);
              }}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 font-medium transition-all text-sm"
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
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={searchQuery ? 6 : 6} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? 'No materials match your search.' : 'No raw materials found. Add your first material!'}
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
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


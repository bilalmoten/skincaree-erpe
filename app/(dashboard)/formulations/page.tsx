'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Ingredient {
  id: string;
  quantity: number;
  unit: string;
  raw_materials: {
    id: string;
    name: string;
    unit: string;
  };
}

interface Formulation {
  id: string;
  name: string;
  description: string | null;
  batch_size: number;
  formulation_ingredients: Ingredient[];
}

export default function FormulationsPage() {
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    fetchFormulations();
  }, []);

  const fetchFormulations = async () => {
    try {
      const res = await fetch('/api/formulations');
      const data = await res.json();
      setFormulations(data);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/formulations/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formulations.xlsx';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/formulations');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formulations_template.xlsx';
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
      const res = await fetch('/api/formulations/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        alert(`Successfully imported ${result.imported} formulations${result.errors ? `\nErrors: ${result.errors.join(', ')}` : ''}`);
        setShowImport(false);
        setImportFile(null);
        fetchFormulations();
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
        <h1 className="text-3xl font-bold">Formulations</h1>
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
            href="/formulations/new"
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

      <div className="grid gap-4">
        {formulations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No formulations found. Add your first formulation!
          </div>
        ) : (
          formulations.map((formulation) => (
            <div key={formulation.id} className="bg-white border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-semibold">{formulation.name}</h3>
                  {formulation.description && (
                    <p className="text-gray-600 text-sm">{formulation.description}</p>
                  )}
                  <p className="text-sm text-gray-500">Batch Size: {formulation.batch_size}</p>
                </div>
                <Link
                  href={`/formulations/${formulation.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
              <div className="mt-2">
                <h4 className="font-medium text-sm mb-1">Ingredients:</h4>
                <ul className="text-sm text-gray-600">
                  {formulation.formulation_ingredients?.map((ing, idx) => (
                    <li key={idx}>
                      {ing.raw_materials?.name}: {ing.quantity} {ing.unit}
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


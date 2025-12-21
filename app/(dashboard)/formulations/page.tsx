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
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchFormulations();
  }, []);

  const fetchFormulations = async () => {
    try {
      const res = await fetch('/api/formulations');
      const data = await res.json();
      
      // Fetch COGS for each formulation
      const formulationsWithCOGS = await Promise.all(
        data.map(async (formulation: Formulation) => {
          try {
            const cogsRes = await fetch(`/api/formulations/${formulation.id}/cogs`);
            if (cogsRes.ok) {
              const cogs = await cogsRes.json();
              return { ...formulation, cogs };
            }
          } catch (error) {
            console.error(`Error fetching COGS for ${formulation.id}:`, error);
          }
          return formulation;
        })
      );
      
      setFormulations(formulationsWithCOGS);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
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
    } finally {
      setExporting(false);
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

    setImporting(true);
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
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Formulations</h1>
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
            className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-md hover:shadow-lg"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <Link
            href="/formulations/new"
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
          >
            Add New
          </Link>
        </div>
      </div>

      {showImport && (
        <div className="mb-6 p-4 sm:p-6 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
          <h2 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">Import from Excel</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="flex-1 border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportFile(null);
              }}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-all text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {formulations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <p className="text-purple-600 dark:text-purple-400">No formulations found. Add your first formulation!</p>
          </div>
        ) : (
          formulations.map((formulation) => (
            <div key={formulation.id} className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300">{formulation.name}</h3>
                  {formulation.description && (
                    <p className="text-purple-600 dark:text-purple-400 text-sm mt-1">{formulation.description}</p>
                  )}
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                    Batch Size: {formulation.batch_size} {formulation.batch_unit || 'kg'}
                  </p>
                  {formulation.cogs && (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
                      COGS: PKR {formulation.cogs.totalCost.toFixed(2)} per batch 
                      (PKR {formulation.cogs.costPerUnit.toFixed(2)} per {formulation.batch_unit || 'kg'})
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href={`/production?formulation=${formulation.id}`}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-medium text-center shadow-md hover:shadow-lg"
                  >
                    Create Production
                  </Link>
                  <Link
                    href={`/formulations/${formulation.id}`}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium text-center shadow-md hover:shadow-lg"
                  >
                    Edit
                  </Link>
                </div>
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


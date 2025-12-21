'use client';

import { useEffect, useState, Suspense } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';

interface ProductionRun {
  id: string;
  formulation_id: string;
  batch_size: number;
  production_date: string;
  notes: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  formulations: {
    name: string;
    batch_unit?: string;
  };
  production_materials_used: Array<{
    quantity_used: number;
    raw_materials: {
      name: string;
      unit: string;
    };
  }>;
  finished_products?: Array<{
    id: string;
    name: string;
  }>;
  finished_products_produced?: Array<{
    id: string;
    name: string;
    quantity_produced: number;
    batch_size: number;
    units_per_batch: number;
  }>;
  cogs?: {
    totalCost: number;
    costPerUnit: number;
  } | null;
}

interface Formulation {
  id: string;
  name: string;
  batch_size?: number;
  batch_unit?: string;
}

interface FinishedProduct {
  id: string;
  name: string;
  formulation_id: string | null;
}

function ProductionPageContent() {
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    formulation_id: '',
    finished_product_id: '',
    batch_size: '',
    production_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRuns();
    fetchFormulations();
    fetchFinishedProducts();
  }, []);

  // Handle query parameter for pre-filling form
  useEffect(() => {
    const formulationId = searchParams.get('formulation');
    if (formulationId && formulations.length > 0) {
      const formulation = formulations.find(f => f.id === formulationId);
      if (formulation) {
        setShowForm(true);
        setFormData(prev => ({
          ...prev,
          formulation_id: formulationId,
          batch_size: formulation.batch_size?.toString() || '',
        }));
      }
    }
  }, [searchParams, formulations]);

  useEffect(() => {
    // Filter finished products when formulation changes
    if (formData.formulation_id) {
      const filtered = finishedProducts.filter(
        (p) => p.formulation_id === formData.formulation_id
      );
      if (filtered.length > 0 && !filtered.find(p => p.id === formData.finished_product_id)) {
        setFormData({ ...formData, finished_product_id: filtered[0].id });
      } else if (filtered.length === 0) {
        setFormData({ ...formData, finished_product_id: '' });
      }
    }
  }, [formData.formulation_id, finishedProducts]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRuns(runs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = runs.filter((run) =>
        run.formulations?.name.toLowerCase().includes(query) ||
        run.id.toLowerCase().includes(query) ||
        run.notes?.toLowerCase().includes(query) ||
        run.finished_products?.some((p) => p.name.toLowerCase().includes(query))
      );
      setFilteredRuns(filtered);
    }
  }, [searchQuery, runs]);

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/production');
      const data = await res.json();
      
      // Fetch COGS for each run
      const runsWithCOGS = await Promise.all(
        data.map(async (run: ProductionRun) => {
          try {
            const cogsRes = await fetch(`/api/production/${run.id}/cogs`);
            if (cogsRes.ok) {
              const cogs = await cogsRes.json();
              return { ...run, cogs };
            }
          } catch (error) {
            console.error(`Error fetching COGS for ${run.id}:`, error);
          }
          return run;
        })
      );
      
      setRuns(runsWithCOGS);
      setFilteredRuns(runsWithCOGS);
    } catch (error) {
      console.error('Error fetching production runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormulations = async () => {
    try {
      const res = await fetch('/api/formulations');
      const data = await res.json();
      setFormulations(data);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    }
  };

  const fetchFinishedProducts = async () => {
    try {
      const res = await fetch('/api/finished-products');
      const data = await res.json();
      setFinishedProducts(data);
    } catch (error) {
      console.error('Error fetching finished products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Production run created successfully!');
        setShowForm(false);
        setFormData({
          formulation_id: '',
          finished_product_id: '',
          batch_size: '',
          production_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchRuns();
      } else {
        const errorMsg = result.details 
          ? `${result.error}\n${JSON.stringify(result.details, null, 2)}`
          : result.error || 'Failed to create production run';
        alert(`Error: ${errorMsg}`);
      }
    } catch (error) {
      alert('Failed to create production run');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/production');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'production_template.xlsx';
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
      const res = await fetch('/api/production/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        alert(`Successfully imported ${result.imported} production runs${result.errors ? `\nErrors: ${result.errors.join(', ')}` : ''}`);
        setShowImport(false);
        setImportFile(null);
        fetchRuns();
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

  const availableProducts = formData.formulation_id
    ? finishedProducts.filter((p) => p.formulation_id === formData.formulation_id)
    : [];

  const selectedFormulation = formData.formulation_id
    ? formulations.find(f => f.id === formData.formulation_id)
    : null;

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Loading...</div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Production Runs</h1>
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
              onClick={() => setShowForm(!showForm)}
              className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-all text-sm shadow-md hover:shadow-lg"
            >
              New Production Run
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Create Production Run</h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Formulation *</label>
                <select
                  required
                  value={formData.formulation_id}
                  onChange={(e) => setFormData({ ...formData, formulation_id: e.target.value, finished_product_id: '' })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                >
                  <option value="">Select Formulation</option>
                  {formulations.map((formulation) => (
                    <option key={formulation.id} value={formulation.id}>
                      {formulation.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Finished Product (Optional)</label>
                <select
                  value={formData.finished_product_id}
                  onChange={(e) => setFormData({ ...formData, finished_product_id: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                  disabled={!formData.formulation_id || availableProducts.length === 0}
                >
                  <option value="">
                    {!formData.formulation_id 
                      ? 'Select formulation first' 
                      : availableProducts.length === 0 
                        ? 'No products linked to this formulation'
                        : 'Auto-update all linked products'}
                  </option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {formData.finished_product_id 
                    ? 'Selected product will be updated'
                    : 'All products linked to formulation will be updated'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Batch Size * 
                  {selectedFormulation?.batch_unit ? ` (${selectedFormulation.batch_unit})` : ''}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.batch_size}
                    onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                    className="flex-1 border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                    placeholder="e.g., 100"
                  />
                  {selectedFormulation?.batch_unit && (
                    <span className="text-purple-700 dark:text-purple-300 font-medium px-3 py-2 bg-purple-50 dark:bg-purple-800 border-2 border-purple-200 dark:border-purple-700 rounded-lg">
                      {selectedFormulation.batch_unit}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Production Date *</label>
                <input
                  type="date"
                  required
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t-2 border-purple-200 dark:border-purple-800">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Run'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    formulation_id: '',
                    finished_product_id: '',
                    batch_size: '',
                    production_date: new Date().toISOString().split('T')[0],
                    notes: '',
                  });
                }}
                className="px-6 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="mb-6 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-all text-sm shadow-sm"
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search production runs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 text-sm dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
        />
      </div>

      <div className="space-y-4">
        {filteredRuns.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <p className="text-purple-600 dark:text-purple-400">{searchQuery ? 'No production runs match your search.' : 'No production runs found. Create your first production run!'}</p>
          </div>
        ) : (
          filteredRuns.map((run) => (
            <div key={run.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{run.formulations?.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Batch Size: {run.batch_size} {run.formulations?.batch_unit || 'kg'} • {format(new Date(run.production_date), 'MMM dd, yyyy')}
                    {run.batch_number && <span className="ml-2 px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">Batch: {run.batch_number}</span>}
                  </p>
                  {run.expiry_date && (
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      Expiry: {format(new Date(run.expiry_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                  {run.cogs && (
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                      Production Cost: PKR {run.cogs.totalCost.toFixed(2)}
                    </p>
                  )}
                  {run.notes && <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{run.notes}</p>}
                  <p className="text-xs text-purple-500 dark:text-purple-500 mt-1">Production Run ID: {run.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const { generateProductionRunPDF } = await import('@/lib/pdf/utils');
                      const doc = generateProductionRunPDF(run);
                      doc.save(`production-run-${run.id.slice(0, 8)}.pdf`);
                    } catch (error) {
                      console.error('Error generating PDF:', error);
                      alert('Failed to generate PDF');
                    }
                  }}
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium shadow-sm transition-all"
                >
                  Print Run
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">Materials Used:</h4>
                  <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                    {run.production_materials_used?.map((mat, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{mat.raw_materials?.name}:</span>
                        <span className="font-medium text-red-600">
                          -{mat.quantity_used.toFixed(3)} {mat.raw_materials?.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">Finished Products Produced:</h4>
                  {run.finished_products_produced && run.finished_products_produced.length > 0 ? (
                    <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                      {run.finished_products_produced.map((product, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{product.name}:</span>
                          <span className="font-medium text-green-600">
                            +{product.quantity_produced} units
                            {product.batch_size && product.units_per_batch && (
                              <span className="text-xs text-purple-500 dark:text-purple-500 ml-1">
                                ({product.batch_size} × {product.units_per_batch})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : run.finished_products && run.finished_products.length > 0 ? (
                    <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                      {run.finished_products.map((product, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{product.name}:</span>
                          <span className="font-medium text-green-600">
                            +{Math.floor(run.batch_size)} units
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-purple-600 dark:text-purple-400 italic">No finished products linked to this formulation</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ProductionPageContent />
    </Suspense>
  );
}
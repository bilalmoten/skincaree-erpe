'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface ProductionRun {
  id: string;
  formulation_id: string;
  batch_size: number;
  production_date: string;
  notes: string | null;
  formulations: {
    name: string;
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
}

interface Formulation {
  id: string;
  name: string;
}

interface FinishedProduct {
  id: string;
  name: string;
  formulation_id: string | null;
}

export default function ProductionPage() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
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

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/production');
      const data = await res.json();
      setRuns(data);
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
    }
  };

  const availableProducts = formData.formulation_id
    ? finishedProducts.filter((p) => p.formulation_id === formData.formulation_id)
    : [];

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Loading...</div>
    </div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Production Runs</h1>
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
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm shadow-sm"
            >
              New Production Run
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Production Run</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Formulation *</label>
                <select
                  required
                  value={formData.formulation_id}
                  onChange={(e) => setFormData({ ...formData, formulation_id: e.target.value, finished_product_id: '' })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Finished Product (Optional)</label>
                <select
                  value={formData.finished_product_id}
                  onChange={(e) => setFormData({ ...formData, finished_product_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
                <p className="text-xs text-gray-500 mt-1">
                  {formData.finished_product_id 
                    ? 'Selected product will be updated'
                    : 'All products linked to formulation will be updated'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="e.g., 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Production Date *</label>
                <input
                  type="date"
                  required
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors shadow-sm flex items-center gap-2"
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
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

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

      <div className="space-y-4">
        {runs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500">No production runs found. Create your first production run!</p>
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{run.formulations?.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Batch Size: {run.batch_size} | Date: {format(new Date(run.production_date), 'MMM dd, yyyy')}
                  </p>
                  {run.notes && <p className="text-sm text-gray-500 mt-1">{run.notes}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Materials Used:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
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
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Finished Products Produced:</h4>
                  {run.finished_products_produced && run.finished_products_produced.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      {run.finished_products_produced.map((product, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{product.name}:</span>
                          <span className="font-medium text-green-600">
                            +{product.quantity_produced} units
                            {product.batch_size && product.units_per_batch && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({product.batch_size} × {product.units_per_batch})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : run.finished_products && run.finished_products.length > 0 ? (
                    <ul className="text-sm text-gray-600 space-y-1">
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
                    <p className="text-sm text-gray-500 italic">No finished products linked to this formulation</p>
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

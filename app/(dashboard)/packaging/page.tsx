'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface BulkProduct {
  id: string;
  name: string;
  unit: string;
  bulk_product_inventory: Array<{
    quantity: number;
  }>;
}

interface FinishedProduct {
  id: string;
  name: string;
  sku: string | null;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  raw_material_inventory: Array<{
    quantity: number;
  }>;
}

interface PackagingItem {
  raw_material_id: string;
  quantity_used: string;
}

interface PackagingRun {
  id: string;
  bulk_product_id: string;
  finished_product_id: string;
  bulk_quantity_used: number;
  finished_units_produced: number;
  packaging_date: string;
  notes: string | null;
  bulk_products: {
    name: string;
    unit: string;
  };
  finished_products: {
    name: string;
  };
  packaging_materials_used: Array<{
    quantity_used: number;
    raw_materials: {
      name: string;
      unit: string;
    };
  }>;
}

export default function PackagingPage() {
  const [runs, setRuns] = useState<PackagingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [formData, setFormData] = useState({
    bulk_product_id: '',
    finished_product_id: '',
    bulk_quantity_used: '',
    finished_units_produced: '',
    packaging_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingItem[]>([]);

  useEffect(() => {
    fetchRuns();
    fetchBulkProducts();
    fetchFinishedProducts();
    fetchRawMaterials();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/packaging-runs');
      const data = await res.json();
      setRuns(data);
    } catch (error) {
      console.error('Error fetching packaging runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkProducts = async () => {
    try {
      const res = await fetch('/api/bulk-products');
      const data = await res.json();
      setBulkProducts(data);
    } catch (error) {
      console.error('Error fetching bulk products:', error);
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

  const fetchRawMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setRawMaterials(data);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
    }
  };

  const addPackagingMaterial = () => {
    setPackagingMaterials([...packagingMaterials, { raw_material_id: '', quantity_used: '' }]);
  };

  const removePackagingMaterial = (index: number) => {
    setPackagingMaterials(packagingMaterials.filter((_, i) => i !== index));
  };

  const updatePackagingMaterial = (index: number, field: keyof PackagingItem, value: string) => {
    const updated = [...packagingMaterials];
    updated[index] = { ...updated[index], [field]: value };
    setPackagingMaterials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const validMaterials = packagingMaterials.filter(
        (mat) => mat.raw_material_id && mat.quantity_used
      );

      const res = await fetch('/api/packaging-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          packaging_materials: validMaterials,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Packaging run created successfully!');
        setShowForm(false);
        setFormData({
          bulk_product_id: '',
          finished_product_id: '',
          bulk_quantity_used: '',
          finished_units_produced: '',
          packaging_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setPackagingMaterials([]);
        fetchRuns();
        fetchBulkProducts();
        fetchRawMaterials();
      } else {
        alert(`Error: ${result.error || 'Failed to create packaging run'}`);
      }
    } catch (error) {
      alert('Failed to create packaging run');
    } finally {
      setCreating(false);
    }
  };

  const selectedBulkProduct = bulkProducts.find((p) => p.id === formData.bulk_product_id);
  const availableBulkQty = selectedBulkProduct?.bulk_product_inventory?.[0]?.quantity || 0;

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Packaging Runs</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-all text-sm shadow-md hover:shadow-lg"
          >
            New Packaging Run
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">Create Packaging Run</h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Bulk Product *</label>
                <select
                  required
                  value={formData.bulk_product_id}
                  onChange={(e) => setFormData({ ...formData, bulk_product_id: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                >
                  <option value="">Select Bulk Product</option>
                  {bulkProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Available: {product.bulk_product_inventory?.[0]?.quantity || 0} {product.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Finished Product *</label>
                <select
                  required
                  value={formData.finished_product_id}
                  onChange={(e) => setFormData({ ...formData, finished_product_id: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                >
                  <option value="">Select Finished Product</option>
                  {finishedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                  Bulk Quantity Used * {selectedBulkProduct && `(${selectedBulkProduct.unit})`}
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.bulk_quantity_used}
                  onChange={(e) => setFormData({ ...formData, bulk_quantity_used: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                  placeholder="e.g., 10"
                  max={availableBulkQty}
                />
                {selectedBulkProduct && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Available: {availableBulkQty} {selectedBulkProduct.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Finished Units Produced *</label>
                <input
                  type="number"
                  required
                  value={formData.finished_units_produced}
                  onChange={(e) => setFormData({ ...formData, finished_units_produced: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                  placeholder="e.g., 50"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Packaging Date *</label>
                <input
                  type="date"
                  required
                  value={formData.packaging_date}
                  onChange={(e) => setFormData({ ...formData, packaging_date: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-4 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300">Packaging Materials (Optional)</label>
                <button
                  type="button"
                  onClick={addPackagingMaterial}
                  className="text-sm px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium"
                >
                  Add Material
                </button>
              </div>

              {packagingMaterials.length > 0 && (
                <div className="mb-2 hidden sm:grid grid-cols-12 gap-2 px-2 py-2 border-b-2 border-purple-200 dark:border-purple-800">
                  <div className="col-span-8 text-sm font-medium text-purple-700 dark:text-purple-300">Material</div>
                  <div className="col-span-3 text-sm font-medium text-purple-700 dark:text-purple-300">Quantity</div>
                  <div className="col-span-1 text-sm font-medium text-purple-700 dark:text-purple-300">Action</div>
                </div>
              )}

              {packagingMaterials.map((mat, index) => {
                const material = rawMaterials.find((m) => m.id === mat.raw_material_id);
                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 mb-3 sm:mb-2 p-3 sm:p-2 border-2 border-purple-200 dark:border-purple-800 rounded-lg items-center bg-purple-50 dark:bg-purple-900/50">
                    <div className="col-span-1 sm:col-span-8">
                      <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 sm:hidden">Material</label>
                      <select
                        value={mat.raw_material_id}
                        onChange={(e) => updatePackagingMaterial(index, 'raw_material_id', e.target.value)}
                        className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      >
                        <option value="">Select Material</option>
                        {rawMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.unit}) - Stock: {material.raw_material_inventory?.[0]?.quantity || 0}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 sm:col-span-3">
                      <label className="block text-xs font-medium text-purple-700 dark:text-purple-300 mb-1 sm:hidden">Quantity</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Qty"
                        value={mat.quantity_used}
                        onChange={(e) => updatePackagingMaterial(index, 'quantity_used', e.target.value)}
                        className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                        min="0.001"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => removePackagingMaterial(index)}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-sm font-medium shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
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
                  'Create Packaging Run'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    bulk_product_id: '',
                    finished_product_id: '',
                    bulk_quantity_used: '',
                    finished_units_produced: '',
                    packaging_date: new Date().toISOString().split('T')[0],
                    notes: '',
                  });
                  setPackagingMaterials([]);
                }}
                className="px-6 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {runs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <p className="text-purple-600 dark:text-purple-400">No packaging runs found. Create your first packaging run!</p>
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl shadow-lg p-6 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {run.bulk_products?.name} → {run.finished_products?.name}
                  </h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                    Used: {run.bulk_quantity_used} {run.bulk_products?.unit} | Produced: {run.finished_units_produced} units | Date: {format(new Date(run.packaging_date), 'MMM dd, yyyy')}
                  </p>
                  {run.notes && (
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{run.notes}</p>
                  )}
                </div>
              </div>
              
              {run.packaging_materials_used && run.packaging_materials_used.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">Packaging Materials Used:</h4>
                  <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                    {run.packaging_materials_used.map((mat, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{mat.raw_materials?.name}:</span>
                        <span className="font-medium text-red-600">
                          -{mat.quantity_used.toFixed(3)} {mat.raw_materials?.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

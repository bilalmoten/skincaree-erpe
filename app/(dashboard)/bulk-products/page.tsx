'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface BulkProduct {
  id: string;
  name: string;
  unit: string;
  notes: string | null;
  formulation_id: string | null;
  formulations: {
    id: string;
    name: string;
    batch_unit: string | null;
  } | null;
  bulk_product_inventory: Array<{
    quantity: number;
    updated_at: string;
  }>;
}

interface Formulation {
  id: string;
  name: string;
  batch_unit: string | null;
}

export default function BulkProductsPage() {
  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    formulation_id: '',
    unit: 'kg',
    notes: '',
  });

  useEffect(() => {
    fetchBulkProducts();
    fetchFormulations();
  }, []);

  const fetchBulkProducts = async () => {
    try {
      const res = await fetch('/api/bulk-products');
      const data = await res.json();
      setBulkProducts(data);
    } catch (error) {
      console.error('Error fetching bulk products:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/bulk-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Bulk product created successfully!');
        setShowForm(false);
        setFormData({ name: '', formulation_id: '', unit: 'kg', notes: '' });
        fetchBulkProducts();
      } else {
        alert(`Error: ${result.error || 'Failed to create bulk product'}`);
      }
    } catch (error) {
      alert('Failed to create bulk product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Bulk Products</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
        >
          + New Bulk Product
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-purple-300 mb-4">New Bulk Product</h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  placeholder="e.g., Moisturizer Base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Formulation (Optional)</label>
                <select
                  value={formData.formulation_id}
                  onChange={(e) => setFormData({ ...formData, formulation_id: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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
                <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Unit *</label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2 dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t-2 border-purple-200 dark:border-purple-800">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-all font-medium shadow-md hover:shadow-lg"
              >
                {saving ? 'Saving...' : 'Save Bulk Product'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', formulation_id: '', unit: 'kg', notes: '' });
                }}
                className="flex-1 sm:flex-initial px-4 py-2 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-700 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {bulkProducts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <p className="text-purple-600 dark:text-purple-400">No bulk products found. Create your first bulk product!</p>
          </div>
        ) : (
          bulkProducts.map((product) => (
            <div key={product.id} className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {product.name}
                  </h3>
                  {product.formulations && (
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                      Formulation: {product.formulations.name}
                    </p>
                  )}
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">
                    Inventory: {product.bulk_product_inventory?.[0]?.quantity || 0} {product.unit}
                  </p>
                  {product.notes && (
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{product.notes}</p>
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

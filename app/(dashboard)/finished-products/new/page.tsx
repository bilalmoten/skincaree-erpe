'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Formulation {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function NewFinishedProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    formulation_id: '',
    units_per_batch: '1',
    shelf_life_days: '',
    category_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchFormulations();
    fetchCategories();
  }, []);

  const fetchFormulations = async () => {
    try {
      const res = await fetch('/api/formulations');
      const data = await res.json();
      setFormulations(data);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      setCategories(data.filter((c: Category) => c.type === 'finished_good'));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/finished-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/finished-products');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to create finished product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add New Finished Product</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">SKU</label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price *</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Formulation</label>
          <select
            value={formData.formulation_id}
            onChange={(e) => setFormData({ ...formData, formulation_id: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select Formulation (Optional)</option>
            {formulations.map((formulation) => (
              <option key={formulation.id} value={formulation.id}>
                {formulation.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Units per Batch</label>
          <input
            type="number"
            step="0.01"
            value={formData.units_per_batch}
            onChange={(e) => setFormData({ ...formData, units_per_batch: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., 20 (means 1 batch = 20 finished units)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of finished units produced from one batch. Example: If batch size is 1kg and this is 20, then 1kg = 20 finished units.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shelf Life (Days)</label>
          <input
            type="number"
            value={formData.shelf_life_days}
            onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., 365 (for 1 year)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Number of days the product remains usable after production. Used to calculate expiry dates.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


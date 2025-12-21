'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Formulation {
  id: string;
  name: string;
}

interface FinishedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  formulation_id: string | null;
  units_per_batch: number | null;
  shelf_life_days: number | null;
  category_id: string | null;
  notes: string | null;
  finished_product_inventory: Array<{ id: string; quantity: number }>;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function EditFinishedProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<FinishedProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    formulation_id: '',
    units_per_batch: '1',
    shelf_life_days: '',
    category_id: '',
    notes: '',
    quantity: '',
  });

  useEffect(() => {
    if (id) {
      fetchFormulations();
      fetchProduct();
      fetchCategories();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      setCategories(data.filter((c: Category) => c.type === 'finished_good'));
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/finished-products/${id}`);
      const data = await res.json();
      setProduct(data);
      setFormData({
        name: data.name,
        sku: data.sku || '',
        price: data.price.toString(),
        formulation_id: data.formulation_id || '',
        units_per_batch: data.units_per_batch?.toString() || '1',
        shelf_life_days: data.shelf_life_days?.toString() || '',
        category_id: data.category_id || '',
        notes: data.notes || '',
        quantity: data.finished_product_inventory?.[0]?.quantity?.toString() || '0',
      });
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update product
      const res = await fetch(`/api/finished-products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          price: formData.price,
          formulation_id: formData.formulation_id || null,
          units_per_batch: formData.units_per_batch,
          shelf_life_days: formData.shelf_life_days,
          category_id: formData.category_id || null,
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      // Update inventory
      await fetch(`/api/finished-products/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: formData.quantity }),
      });

      router.push('/finished-products');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!product) {
    return <div className="p-6">Product not found</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Finished Product</h1>

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
            placeholder="e.g., 20"
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
          <label className="block text-sm font-medium mb-1">Current Quantity</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save'}
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

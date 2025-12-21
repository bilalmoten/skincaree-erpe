'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/currency';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  supplier: string | null;
  last_price: number | null;
  notes: string | null;
  category_id: string | null;
  raw_material_inventory: Array<{ id: string; quantity: number }>;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function EditRawMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    supplier: '',
    last_price: '',
    notes: '',
    quantity: '',
    category_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchMaterial();
      fetchCategories();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      setCategories(data.filter((c: Category) => c.type === 'ingredient' || c.type === 'packaging'));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMaterial = async () => {
    try {
      const res = await fetch(`/api/raw-materials/${id}`);
      const data = await res.json();
      setMaterial(data);
      setFormData({
        name: data.name,
        unit: data.unit,
        supplier: data.supplier || '',
        last_price: data.last_price?.toString() || '',
        notes: data.notes || '',
        quantity: data.raw_material_inventory?.[0]?.quantity?.toString() || '0',
        category_id: data.category_id || '',
      });
    } catch (error) {
      console.error('Error fetching material:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update material
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          supplier: formData.supplier,
          last_price: formData.last_price,
          notes: formData.notes,
          category_id: formData.category_id || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      // Update inventory
      await fetch(`/api/raw-materials/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: formData.quantity }),
      });

      router.push('/raw-materials');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Loading...</div>
    </div>;
  }

  if (!material) {
    return <div className="p-6">Material not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Raw Material</h1>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Current Inventory:</span>{' '}
            {material.raw_material_inventory?.[0]?.quantity || 0} {material.unit}
          </div>
          <div>
            <span className="font-medium">Last Price:</span>{' '}
            {material.last_price ? formatCurrency(material.last_price) : 'Not set'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="e.g., kg, L, g"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Price (PKR)</label>
              <input
                type="number"
                step="0.01"
                value={formData.last_price}
                onChange={(e) => setFormData({ ...formData, last_price: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Quantity</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">Use "Purchase" button to add inventory</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/raw-materials/${id}/purchase`)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm"
            >
              Record Purchase
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  raw_material_inventory: Array<{ quantity: number }>;
}

export default function PurchaseRawMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState({
    quantity: '',
    price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchMaterial();
    }
  }, [id]);

  const fetchMaterial = async () => {
    try {
      const res = await fetch(`/api/raw-materials/${id}`);
      const data = await res.json();
      setMaterial(data);
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
      const res = await fetch(`/api/raw-materials/${id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Purchase recorded successfully!');
        router.push(`/raw-materials/${id}`);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
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

  const currentQty = material.raw_material_inventory?.[0]?.quantity || 0;
  const newQty = currentQty + (parseFloat(formData.quantity) || 0);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Record Purchase</h1>
        <p className="text-gray-600">
          <span className="font-medium">{material.name}</span> ({material.unit})
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Current Inventory: {currentQty} {material.unit}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Purchased *</label>
            <input
              type="number"
              step="0.001"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            {formData.quantity && (
              <p className="text-sm text-gray-600 mt-1">
                New Inventory: {newQty} {material.unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price (PKR) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            <p className="text-xs text-gray-500 mt-1">This will update the "Last Price" field</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date *</label>
            <input
              type="date"
              required
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors shadow-sm"
            >
              {saving ? 'Recording...' : 'Record Purchase'}
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


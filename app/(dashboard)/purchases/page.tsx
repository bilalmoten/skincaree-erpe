'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  last_price: number | null;
  raw_material_inventory: Array<{ quantity: number }>;
}

function PurchasesContent() {
  const searchParams = useSearchParams();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [formData, setFormData] = useState({
    quantity: '',
    price: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/purchases');
      const data = await res.json();
      setMaterials(data);
      
      // Auto-select material from URL
      const materialId = searchParams.get('material');
      if (materialId && data.length > 0) {
        const material = data.find((m: RawMaterial) => m.id === materialId);
        if (material) {
          setSelectedMaterial(materialId);
          if (material.last_price) {
            setFormData(prev => ({ ...prev, price: material.last_price!.toString() }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      alert('Please select a material');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_material_id: selectedMaterial,
          ...formData,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Purchase recorded successfully!');
        setSelectedMaterial('');
        setFormData({
          quantity: '',
          price: '',
          purchase_date: new Date().toISOString().split('T')[0],
        });
        fetchMaterials();
      } else {
        alert(`Error: ${result.error || 'Failed to record purchase'}`);
      }
    } catch (error) {
      alert('Failed to record purchase');
    } finally {
      setSaving(false);
    }
  };

  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const currentQty = selectedMaterialData?.raw_material_inventory?.[0]?.quantity || 0;
  const newQty = currentQty + (parseFloat(formData.quantity) || 0);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Loading...</div>
    </div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Record Purchase</h1>
        <p className="text-gray-600">Quickly record raw material purchases and update inventory</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Material *</label>
            <select
              value={selectedMaterial}
              onChange={(e) => {
                setSelectedMaterial(e.target.value);
                const material = materials.find(m => m.id === e.target.value);
                if (material?.last_price) {
                  setFormData({ ...formData, price: material.last_price.toString() });
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              required
            >
              <option value="">Select a raw material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.unit}) - Current: {material.raw_material_inventory?.[0]?.quantity || 0} {material.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedMaterial && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Purchased *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="0"
                    />
                    <span className="text-gray-600 font-medium">{selectedMaterialData?.unit}</span>
                  </div>
                  {formData.quantity && (
                    <p className="text-sm text-gray-600 mt-2">
                      Current: {currentQty} {selectedMaterialData?.unit} → New: {newQty} {selectedMaterialData?.unit}
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
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">This will update the "Last Price" field</p>
                </div>
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
                  onClick={() => {
                    setSelectedMaterial('');
                    setFormData({
                      quantity: '',
                      price: '',
                      purchase_date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick View - Current Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <div 
              key={material.id} 
              className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                selectedMaterial === material.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => {
                setSelectedMaterial(material.id);
                if (material.last_price) {
                  setFormData(prev => ({ ...prev, price: material.last_price!.toString() }));
                }
              }}
            >
              <h3 className="font-medium text-gray-900">{material.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">{material.raw_material_inventory?.[0]?.quantity || 0}</span> {material.unit}
              </p>
              {material.last_price && (
                <p className="text-xs text-gray-500 mt-1">Last Price: PKR {material.last_price.toFixed(2)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center justify-center min-h-screen"><div className="text-gray-500">Loading...</div></div>}>
      <PurchasesContent />
    </Suspense>
  );
}

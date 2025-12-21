'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface Ingredient {
  raw_material_id: string;
  quantity: string;
  percentage: string;
}

export default function NewFormulationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    batch_size: '100',
    batch_unit: 'kg',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [mode, setMode] = useState<'percentage' | 'absolute'>('percentage');

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  const fetchRawMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setRawMaterials(data);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { raw_material_id: '', quantity: '', percentage: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate percentage or quantity based on mode
    if (mode === 'percentage' && field === 'percentage') {
      const batchSize = parseFloat(formData.batch_size) || 100;
      const percentage = parseFloat(value) || 0;
      updated[index].quantity = ((batchSize * percentage) / 100).toFixed(3);
    } else if (mode === 'absolute' && field === 'quantity') {
      const batchSize = parseFloat(formData.batch_size) || 100;
      const quantity = parseFloat(value) || 0;
      updated[index].percentage = batchSize > 0 ? ((quantity / batchSize) * 100).toFixed(2) : '0';
    }
    
    setIngredients(updated);
  };

  const recalculatePercentages = () => {
    const batchSize = parseFloat(formData.batch_size) || 100;
    const updated = ingredients.map(ing => {
      if (mode === 'percentage' && ing.percentage) {
        const percentage = parseFloat(ing.percentage) || 0;
        return { ...ing, quantity: ((batchSize * percentage) / 100).toFixed(3) };
      } else if (mode === 'absolute' && ing.quantity) {
        const quantity = parseFloat(ing.quantity) || 0;
        return { ...ing, percentage: batchSize > 0 ? ((quantity / batchSize) * 100).toFixed(2) : '0' };
      }
      return ing;
    });
    setIngredients(updated);
  };

  useEffect(() => {
    if (formData.batch_size) {
      recalculatePercentages();
    }
  }, [formData.batch_size, mode]);

  const totalPercentage = ingredients.reduce((sum, ing) => {
    return sum + (parseFloat(ing.percentage) || 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validIngredients = ingredients.filter(
        (ing) => ing.raw_material_id && (ing.quantity || ing.percentage)
      ).map(ing => ({
        raw_material_id: ing.raw_material_id,
        quantity: ing.quantity || '0',
        unit: formData.batch_unit || 'g',
      }));

      const res = await fetch('/api/formulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          batch_size: parseFloat(formData.batch_size),
          ingredients: validIngredients,
        }),
      });

      if (res.ok) {
        router.push('/formulations');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to create formulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Add New Formulation</h1>
        
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() => setMode('percentage')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'percentage'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Percentage Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('absolute')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'absolute'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Absolute Quantity Mode
          </button>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
                <select
                  value={formData.batch_unit}
                  onChange={(e) => setFormData({ ...formData, batch_unit: e.target.value })}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              rows={2}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">Ingredients</label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                + Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                No ingredients added. Click "Add Ingredient" to start.
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => {
                  const material = rawMaterials.find(m => m.id === ingredient.raw_material_id);
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-[var(--surface-muted)]">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Material *</label>
                          <select
                            value={ingredient.raw_material_id}
                            onChange={(e) => updateIngredient(index, 'raw_material_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            required
                          >
                            <option value="">Select Material</option>
                            {rawMaterials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {mode === 'percentage' ? (
                          <>
                            <div className="col-span-6 md:col-span-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Percentage (%) *</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="%"
                                value={ingredient.percentage}
                                onChange={(e) => updateIngredient(index, 'percentage', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                required
                              />
                            </div>
                            <div className="col-span-6 md:col-span-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                              <input
                                type="text"
                                value={`${ingredient.quantity || '0'} ${formData.batch_unit}`}
                                readOnly
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="col-span-6 md:col-span-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                              <input
                                type="number"
                                step="0.001"
                                placeholder="Qty"
                                value={ingredient.quantity}
                                onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                required
                              />
                            </div>
                            <div className="col-span-6 md:col-span-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Percentage</label>
                              <input
                                type="text"
                                value={`${ingredient.percentage || '0'}%`}
                                readOnly
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"
                              />
                            </div>
                          </>
                        )}

                        <div className="col-span-6 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                          <input
                            type="text"
                            value={formData.batch_unit}
                            readOnly
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600"
                          />
                          <p className="text-xs text-gray-500 mt-1">Uses batch unit</p>
                        </div>

                        <div className="col-span-6 md:col-span-1">
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {ingredients.length > 0 && (
              <div className={`mt-4 p-3 rounded-lg font-medium ${
                Math.abs(totalPercentage - 100) < 0.01
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                Total Percentage: {totalPercentage.toFixed(2)}%
                {Math.abs(totalPercentage - 100) >= 0.01 && (
                  <span className="block text-sm mt-1">
                    {totalPercentage < 100 ? 'Less than 100%' : 'More than 100%'}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || ingredients.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors shadow-sm"
            >
              {loading ? 'Saving...' : 'Save Formulation'}
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

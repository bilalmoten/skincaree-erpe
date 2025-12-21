'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface Ingredient {
  id: string;
  raw_material_id: string;
  quantity: number;
  unit: string;
  raw_materials?: RawMaterial;
}

interface Formulation {
  id: string;
  name: string;
  description: string | null;
  batch_size: number;
  formulation_ingredients: Ingredient[];
}

export default function EditFormulationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [formulation, setFormulation] = useState<Formulation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    batch_size: '1',
  });
  const [ingredients, setIngredients] = useState<Array<{
    id?: string;
    raw_material_id: string;
    quantity: string;
    unit: string;
  }>>([]);

  useEffect(() => {
    if (id) {
      fetchRawMaterials();
      fetchFormulation();
    }
  }, [id]);

  const fetchRawMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setRawMaterials(data);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
    }
  };

  const fetchFormulation = async () => {
    try {
      const res = await fetch(`/api/formulations/${id}`);
      const data = await res.json();
      setFormulation(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        batch_size: data.batch_size.toString(),
      });
      setIngredients(
        data.formulation_ingredients?.map((ing: Ingredient) => ({
          id: ing.id,
          raw_material_id: ing.raw_material_id,
          quantity: ing.quantity.toString(),
          unit: ing.unit,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching formulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { raw_material_id: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (
    index: number,
    field: 'raw_material_id' | 'quantity' | 'unit',
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const validIngredients = ingredients
        .filter((ing) => ing.raw_material_id && ing.quantity)
        .map((ing) => ({
          raw_material_id: ing.raw_material_id,
          quantity: ing.quantity,
          unit: ing.unit,
        }));

      const res = await fetch(`/api/formulations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ingredients: validIngredients,
        }),
      });

      if (res.ok) {
        router.push('/formulations');
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
    return <div className="p-6">Loading...</div>;
  }

  if (!formulation) {
    return <div className="p-6">Formulation not found</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Edit Formulation</h1>

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
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Batch Size *</label>
          <input
            type="number"
            step="0.001"
            required
            value={formData.batch_size}
            onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Ingredients</label>
            <button
              type="button"
              onClick={addIngredient}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Ingredient
            </button>
          </div>

          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <select
                value={ingredient.raw_material_id}
                onChange={(e) => updateIngredient(index, 'raw_material_id', e.target.value)}
                className="flex-1 border rounded px-3 py-2"
                required
              >
                <option value="">Select Material</option>
                {rawMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.001"
                placeholder="Quantity"
                value={ingredient.quantity}
                onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                className="w-32 border rounded px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Unit"
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                className="w-24 border rounded px-3 py-2"
                required
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}
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

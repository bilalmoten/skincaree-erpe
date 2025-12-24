'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { convertFromBatchUnit, convertToBatchUnit } from '@/lib/unitConversion';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface Ingredient {
  type: 'material' | 'bulk';
  raw_material_id: string; // Used for both material_id and bulk_id in the form for simplicity
  quantity: string;
  percentage: string;
  unit: string;
}

export default function NewFormulationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    batch_size: '100',
    batch_unit: 'kg',
    produces_type: 'finished' as 'bulk' | 'finished',
    produces_id: '',
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rmRes, bulkRes, finishedRes] = await Promise.all([
        fetch('/api/raw-materials'),
        fetch('/api/bulk-products'),
        fetch('/api/finished-products'),
      ]);
      setRawMaterials(await rmRes.json());
      setBulkProducts(await bulkRes.json());
      setFinishedProducts(await finishedRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { type: 'material', raw_material_id: '', quantity: '', percentage: '', unit: 'kg' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    const batchSize = parseFloat(formData.batch_size) || 0;
    const batchUnit = formData.batch_unit || 'kg';
    const previousUnit = updated[index]?.unit || 'kg';
    const ingredient = { ...updated[index], [field]: value };

    const adjustForUnitChange = (targetUnit: string, sourceUnit: string = previousUnit) => {
      if (!targetUnit || !sourceUnit || targetUnit === sourceUnit) {
        ingredient.unit = targetUnit;
        return;
      }
      const currentQuantity = parseFloat(ingredient.quantity) || 0;
      const quantityInBatch = convertToBatchUnit(currentQuantity, sourceUnit, batchUnit);
      ingredient.quantity = convertFromBatchUnit(quantityInBatch, batchUnit, targetUnit).toFixed(3);
      ingredient.percentage = batchSize > 0 ? ((quantityInBatch / batchSize) * 100).toFixed(2) : '0';
      ingredient.unit = targetUnit;
    };

    if (field === 'type') {
      ingredient.raw_material_id = '';
      ingredient.quantity = '';
      ingredient.percentage = '';
      ingredient.unit = 'kg';
    }

    if (field === 'raw_material_id') {
      if (ingredient.type === 'material') {
        const material = rawMaterials.find(m => m.id === value);
        if (material) {
          adjustForUnitChange(material.unit || 'kg');
        }
      } else {
        const bulk = bulkProducts.find(b => b.id === value);
        if (bulk) {
          adjustForUnitChange(bulk.unit || 'kg');
        }
      }
    }

    if (field === 'unit') {
      adjustForUnitChange(value);
      updated[index] = ingredient;
      setIngredients(updated);
      return;
    }

    if (field === 'percentage') {
      const percentage = parseFloat(value) || 0;
      const quantityInBatch = (batchSize * percentage) / 100;
      const targetUnit = ingredient.unit || 'kg';
      ingredient.quantity = convertFromBatchUnit(quantityInBatch, batchUnit, targetUnit).toFixed(3);
    } else if (field === 'quantity') {
      const quantity = parseFloat(value) || 0;
      const quantityInBatch = convertToBatchUnit(quantity, ingredient.unit || 'kg', batchUnit);
      ingredient.percentage = batchSize > 0 ? ((quantityInBatch / batchSize) * 100).toFixed(2) : '0';
    }

    updated[index] = ingredient;
    setIngredients(updated);
  };

  const recalculateAll = () => {
    const batchSize = parseFloat(formData.batch_size) || 0;
    const batchUnit = formData.batch_unit || 'kg';
    if (batchSize === 0) return;
    const updated = ingredients.map(ing => {
      const percentage = parseFloat(ing.percentage) || 0;
      const quantityInBatch = (batchSize * percentage) / 100;
      const quantityInUnit = convertFromBatchUnit(quantityInBatch, batchUnit, ing.unit || 'kg');
      return { ...ing, quantity: quantityInUnit.toFixed(3) };
    });
    setIngredients(updated);
  };

  useEffect(() => {
    if (formData.batch_size) {
      recalculateAll();
    }
  }, [formData.batch_size]);

  useEffect(() => {
    recalculateAll();
  }, [formData.batch_unit]);

  const totalPercentage = ingredients.reduce((sum, ing) => {
    return sum + (parseFloat(ing.percentage) || 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (ingredients.length === 0) {
      showToast('Add at least one ingredient', 'error');
      return;
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      if (!confirm(`Total percentage is ${totalPercentage.toFixed(2)}%. Do you want to proceed anyway?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/formulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ingredients: ingredients.filter(i => i.raw_material_id && i.quantity)
        }),
      });

      if (res.ok) {
        showToast('Formulation created successfully', 'success');
        router.push('/formulations');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to create formulation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Add New Formulation</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Formulation Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch_size">Standard Batch Size</Label>
                <Input
                  id="batch_size"
                  type="number"
                  value={formData.batch_size}
                  onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="batch_unit">Unit</Label>
                <Select
                  value={formData.batch_unit}
                  onValueChange={(value) => setFormData({ ...formData, batch_unit: value })}
                >
                  <SelectTrigger id="batch_unit" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Production Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="produces_type">Produces</Label>
                <Select
                  value={formData.produces_type}
                  onValueChange={(value) => setFormData({ ...formData, produces_type: value as 'bulk' | 'finished', produces_id: '' })}
                >
                  <SelectTrigger id="produces_type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bulk">Bulk Product</SelectItem>
                    <SelectItem value="finished">Finished Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="produces_id">Select Product</Label>
                <Select
                  value={formData.produces_id}
                  onValueChange={(value) => setFormData({ ...formData, produces_id: value })}
                >
                  <SelectTrigger id="produces_id" className="mt-2">
                    <SelectValue placeholder="Select target..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.produces_type === 'bulk' ? (
                      bulkProducts.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))
                    ) : (
                      finishedProducts.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ingredients</CardTitle>
            <div className="flex gap-2">
              <Button type="button" onClick={addIngredient} size="sm">
                + Add Ingredient
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ingredients.length > 0 && (
                <div className="grid grid-cols-12 gap-2 px-2 py-2 border-b font-medium text-sm">
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Item</div>
                  <div className="col-span-2 text-right pr-4">Percentage (%)</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-1"></div>
                </div>
              )}
              {ingredients.map((ing, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <Select
                      value={ing.type}
                      onValueChange={(value) => updateIngredient(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="bulk">Bulk Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select
                      value={ing.raw_material_id}
                      onValueChange={(value) => updateIngredient(index, 'raw_material_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ing.type === 'material' ? (
                          rawMaterials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))
                        ) : (
                          bulkProducts.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={ing.percentage}
                      onChange={(e) => updateIngredient(index, 'percentage', e.target.value)}
                      placeholder="%"
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-2">
                    <Select
                      value={ing.unit}
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="mL">mL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              {ingredients.length > 0 && (
                <div className="flex justify-between items-center px-2 py-2 border-t mt-4">
                  <span className="font-bold">Total:</span>
                  <span className={`font-bold ${Math.abs(totalPercentage - 100) > 0.01 ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {totalPercentage.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Create Formulation'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

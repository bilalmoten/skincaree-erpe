'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

interface EditIngredient {
  type: 'material' | 'bulk';
  raw_material_id: string; // Used for the select value
  bulk_product_id?: string;
  quantity: string;
  percentage: string;
  unit: string;
}

export default function EditFormulationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [formulation, setFormulation] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    batch_size: '1',
    batch_unit: 'kg',
    produces_type: 'finished' as 'bulk' | 'finished',
    produces_id: '',
  });
  const [ingredients, setIngredients] = useState<EditIngredient[]>([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [rmRes, bulkRes, finishedRes, formRes] = await Promise.all([
        fetch('/api/raw-materials'),
        fetch('/api/bulk-products'),
        fetch('/api/finished-products'),
        fetch(`/api/formulations/${id}`),
      ]);
      
      const rms = await rmRes.json();
      const bulks = await bulkRes.json();
      const finished = await finishedRes.json();
      const data = await formRes.json();

      setRawMaterials(rms);
      setBulkProducts(bulks);
      setFinishedProducts(finished);
      setFormulation(data);

      const batchSize = data.batch_size || 1;
      setFormData({
        name: data.name,
        description: data.description || '',
        batch_size: batchSize.toString(),
        batch_unit: data.batch_unit || 'kg',
        produces_type: data.produces_type || 'finished',
        produces_id: data.produces_id || '',
      });

      const loadedBatchUnit = data.batch_unit || 'kg';
      setIngredients(
        data.formulation_ingredients?.map((ing: any) => {
          const ingredientUnit = ing.unit || 'kg';
          const rawQuantity = parseFloat(ing.quantity) || 0;
          const quantityInBatch = convertToBatchUnit(rawQuantity, ingredientUnit, loadedBatchUnit);
          return {
            type: ing.bulk_product_id ? 'bulk' : 'material',
            raw_material_id: ing.raw_material_id || ing.bulk_product_id,
            bulk_product_id: ing.bulk_product_id,
            quantity: rawQuantity.toFixed(3),
            percentage: batchSize > 0 ? ((quantityInBatch / batchSize) * 100).toFixed(2) : '0',
            unit: ingredientUnit,
          };
        }) || []
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { type: 'material', raw_material_id: '', quantity: '', percentage: '', unit: 'kg' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const newIngredients = [...ingredients];
    const batchSize = parseFloat(formData.batch_size) || 0;
    const batchUnit = formData.batch_unit || 'kg';
    const previousUnit = newIngredients[index]?.unit || 'kg';
    const updatedIng = { ...newIngredients[index], [field]: value } as EditIngredient;

    const adjustForUnitChange = (targetUnit: string, sourceUnit: string = previousUnit) => {
      if (!targetUnit || !sourceUnit || targetUnit === sourceUnit) {
        updatedIng.unit = targetUnit;
        return;
      }
      const currentQuantity = parseFloat(updatedIng.quantity) || 0;
      const quantityInBatch = convertToBatchUnit(currentQuantity, sourceUnit, batchUnit);
      updatedIng.quantity = convertFromBatchUnit(quantityInBatch, batchUnit, targetUnit).toFixed(3);
      updatedIng.percentage = batchSize > 0 ? ((quantityInBatch / batchSize) * 100).toFixed(2) : '0';
      updatedIng.unit = targetUnit;
    };

    if (field === 'type') {
      updatedIng.raw_material_id = '';
      updatedIng.bulk_product_id = undefined;
      updatedIng.quantity = '';
      updatedIng.percentage = '';
      updatedIng.unit = 'kg';
    }

    if (field === 'raw_material_id') {
      if (updatedIng.type === 'material') {
        const material = rawMaterials.find(m => m.id === value);
        if (material) {
          adjustForUnitChange(material.unit || 'kg');
        }
      } else {
        const bulk = bulkProducts.find(b => b.id === value);
        if (bulk) {
          updatedIng.bulk_product_id = value;
          adjustForUnitChange(bulk.unit || 'kg');
        }
      }
    }

    if (field === 'unit') {
      adjustForUnitChange(value);
      newIngredients[index] = updatedIng;
      setIngredients(newIngredients);
      return;
    }

    if (field === 'percentage') {
      const percentage = parseFloat(value) || 0;
      const quantityInBatch = (batchSize * percentage) / 100;
      const targetUnit = updatedIng.unit || 'kg';
      updatedIng.quantity = convertFromBatchUnit(quantityInBatch, batchUnit, targetUnit).toFixed(3);
    } else if (field === 'quantity') {
      const quantity = parseFloat(value) || 0;
      const quantityInBatch = convertToBatchUnit(quantity, updatedIng.unit || 'kg', batchUnit);
      updatedIng.percentage = batchSize > 0 ? ((quantityInBatch / batchSize) * 100).toFixed(2) : '0';
    }

    newIngredients[index] = updatedIng;
    setIngredients(newIngredients);
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
    if (formData.batch_size && formulation) {
      recalculateAll();
    }
  }, [formData.batch_size]);

  useEffect(() => {
    if (formulation) {
      recalculateAll();
    }
  }, [formData.batch_unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/formulations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ingredients: ingredients.filter(i => i.raw_material_id && i.quantity),
        }),
      });

      if (res.ok) {
        showToast('Formulation updated successfully', 'success');
        router.push('/formulations');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to update formulation', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!formulation) return <div className="p-6 text-center">Formulation not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Edit Formulation</h1>

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
            <Button type="button" onClick={addIngredient} size="sm">
              + Add Ingredient
            </Button>
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
              {ingredients.length === 0 && (
                <p className="text-center py-4 text-muted-foreground italic">No ingredients added yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Update Formulation'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

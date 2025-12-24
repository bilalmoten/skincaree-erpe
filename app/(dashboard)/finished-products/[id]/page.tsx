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
  const { showToast } = useToast();

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
      const res = await fetch(`/api/finished-products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Product updated successfully', 'success');
        router.push('/finished-products');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to update product', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!product) return <div className="p-6 text-center">Product not found</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Edit Finished Product</h1>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="price">Selling Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="formulation">Formulation (Optional)</Label>
              <Select
                value={formData.formulation_id}
                onValueChange={(value) => setFormData({ ...formData, formulation_id: value })}
              >
                <SelectTrigger id="formulation" className="mt-2">
                  <SelectValue placeholder="Select Formulation" />
                </SelectTrigger>
                <SelectContent>
                  {formulations.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="units_per_batch">Units Per Batch</Label>
                <Input
                  id="units_per_batch"
                  type="number"
                  value={formData.units_per_batch}
                  onChange={(e) => setFormData({ ...formData, units_per_batch: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="shelf_life">Shelf Life (Days)</Label>
                <Input
                  id="shelf_life"
                  type="number"
                  value={formData.shelf_life_days}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger id="category" className="mt-2">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Inventory Balance</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Warning: Directly editing this value will bypass audit tracking.</p>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Update Product'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

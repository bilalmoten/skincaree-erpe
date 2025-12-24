'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  const { showToast } = useToast();

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

      if (res.ok) {
        showToast('Material updated successfully', 'success');
        router.push('/raw-materials');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!material) return <div className="p-6 text-center">Material not found</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Edit Raw Material</h1>

      <Card>
        <CardHeader>
          <CardTitle>Material Information</CardTitle>
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

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="mt-2"
              />
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
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="last-price">Last Price</Label>
              <Input
                id="last-price"
                type="number"
                step="0.01"
                value={formData.last_price}
                onChange={(e) => setFormData({ ...formData, last_price: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="quantity">Inventory Balance</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                disabled
                className="mt-2 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">To change inventory, please use the purchase or production features.</p>
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
                {saving ? 'Saving...' : 'Update Material'}
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

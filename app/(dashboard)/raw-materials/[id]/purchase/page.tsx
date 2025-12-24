'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

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
  const { showToast } = useToast();

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
        showToast('Purchase recorded successfully!', 'success');
        router.push(`/raw-materials/${id}`);
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

  const currentQty = material.raw_material_inventory?.[0]?.quantity || 0;
  const newQty = currentQty + (parseFloat(formData.quantity) || 0);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record Purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{material.name}</p>
            <p className="text-sm text-muted-foreground">Unit: {material.unit}</p>
            <p className="text-sm font-medium mt-2">
              Current Inventory: {currentQty} {material.unit}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity Purchased *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder={`Number of ${material.unit}`}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="price">Total Price (Optional)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="PKR"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="mt-2"
              />
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

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Projected New Balance:</p>
              <p className="text-lg font-bold">{newQty.toFixed(3)} {material.unit}</p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Recording...' : 'Record Purchase'}
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface BulkProduct {
  id: string;
  name: string;
  unit: string;
  notes: string | null;
  formulation_id: string | null;
  formulations: {
    id: string;
    name: string;
    batch_unit: string | null;
  } | null;
  bulk_product_inventory: Array<{
    quantity: number;
    updated_at: string;
  }>;
}

interface Formulation {
  id: string;
  name: string;
  batch_unit: string | null;
}

export default function BulkProductsPage() {
  const { showToast } = useToast();
  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<BulkProduct[]>([]);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    formulation_id: '',
    unit: 'kg',
    notes: '',
  });

  useEffect(() => {
    fetchBulkProducts();
    fetchFormulations();
  }, []);

  const fetchBulkProducts = async () => {
    try {
      const res = await fetch('/api/bulk-products');
      const data = await res.json();
      setBulkProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching bulk products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(bulkProducts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bulkProducts.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        product.notes?.toLowerCase().includes(query) ||
        product.formulations?.name.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, bulkProducts]);

  const fetchFormulations = async () => {
    try {
      const res = await fetch('/api/formulations');
      const data = await res.json();
      setFormulations(data);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/bulk-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('Bulk product created successfully!', 'success');
        setShowForm(false);
        setFormData({ name: '', formulation_id: '', unit: 'kg', notes: '' });
        fetchBulkProducts();
      } else {
        showToast(`Error: ${result.error || 'Failed to create bulk product'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to create bulk product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/bulk-products');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_products_template.xlsx';
      a.click();
    } catch (error) {
      console.error('Error downloading template:', error);
      showToast('Failed to download template', 'error');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/bulk-products/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} bulk products`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Errors: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
        fetchBulkProducts();
      } else {
        showToast(`Error: ${result.error || 'Import failed'}`, 'error');
      }
    } catch (error) {
      console.error('Error importing:', error);
      showToast('Failed to import', 'error');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bulk Products</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleDownloadTemplate}
            variant="secondary"
            size="sm"
          >
            Download Template
          </Button>
          <Button
            onClick={() => setShowImport(!showImport)}
            size="sm"
            variant="outline"
          >
            Import Excel
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
          >
            + New Bulk Product
          </Button>
        </div>
      </div>

      {showImport && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import from Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button
                onClick={handleImport}
                disabled={importing || !importFile}
                size="sm"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
              <Button
                onClick={() => {
                  setShowImport(false);
                  setImportFile(null);
                }}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Bulk Product</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Moisturizer Base"
                  className="mt-2"
                />
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
                    {formulations.map((formulation) => (
                      <SelectItem key={formulation.id} value={formulation.id}>
                        {formulation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  required
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit" className="mt-2">
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

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Bulk Product'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', formulation_id: '', unit: 'kg', notes: '' });
                }}
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search bulk products by name, formulation, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No bulk products match your search.' : 'No bulk products found. Create your first bulk product!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-xl transition-all">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {product.name}
                    </h3>
                    {product.formulations && (
                      <p className="text-sm text-muted-foreground">
                        Formulation: {product.formulations.name}
                      </p>
                    )}
                    <p className="text-lg font-bold text-foreground mt-1">
                      Inventory: {product.bulk_product_inventory?.[0]?.quantity || 0} {product.unit}
                    </p>
                    {product.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{product.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

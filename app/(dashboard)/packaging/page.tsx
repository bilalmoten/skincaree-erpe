'use client';

import { useEffect, useState } from 'react';
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
  bulk_product_inventory: Array<{
    quantity: number;
  }>;
}

interface FinishedProduct {
  id: string;
  name: string;
  sku: string | null;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  raw_material_inventory: Array<{
    quantity: number;
  }>;
}

interface PackagingItem {
  raw_material_id: string;
  quantity_used: string;
}

interface PackagingRun {
  id: string;
  bulk_product_id: string;
  finished_product_id: string;
  bulk_quantity_used: number;
  finished_units_produced: number;
  packaging_date: string;
  notes: string | null;
  bulk_products: {
    name: string;
    unit: string;
  };
  finished_products: {
    name: string;
  };
  packaging_materials_used: Array<{
    quantity_used: number;
    raw_materials: {
      name: string;
      unit: string;
    };
  }>;
}

export default function PackagingPage() {
  const { showToast } = useToast();
  const [runs, setRuns] = useState<PackagingRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<PackagingRun[]>([]);
  const [bulkProducts, setBulkProducts] = useState<BulkProduct[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    bulk_product_id: '',
    finished_product_id: '',
    bulk_quantity_used: '',
    finished_units_produced: '',
    packaging_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRuns(runs);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredRuns(
        runs.filter(
          (run) =>
            run.finished_products.name.toLowerCase().includes(query) ||
            run.bulk_products.name.toLowerCase().includes(query) ||
            run.notes?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, runs]);

  const fetchData = async () => {
    try {
      const [runsRes, bulkRes, finishedRes, materialsRes] = await Promise.all([
        fetch('/api/packaging-runs'),
        fetch('/api/bulk-products'),
        fetch('/api/finished-products'),
        fetch('/api/raw-materials'),
      ]);

      const [runsData, bulkData, finishedData, materialsData] = await Promise.all([
        runsRes.json(),
        bulkRes.json(),
        finishedRes.json(),
        materialsRes.json(),
      ]);

      setRuns(runsData);
      setFilteredRuns(runsData);
      setBulkProducts(bulkData);
      setFinishedProducts(finishedData);
      setRawMaterials(materialsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addPackagingMaterial = () => {
    setPackagingMaterials([...packagingMaterials, { raw_material_id: '', quantity_used: '' }]);
  };

  const removePackagingMaterial = (index: number) => {
    setPackagingMaterials(packagingMaterials.filter((_, i) => i !== index));
  };

  const updatePackagingMaterial = (index: number, field: keyof PackagingItem, value: string) => {
    const newMaterials = [...packagingMaterials];
    newMaterials[index][field] = value;
    setPackagingMaterials(newMaterials);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/packaging-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          packaging_materials: packagingMaterials.filter((m) => m.raw_material_id && m.quantity_used),
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('Packaging run created successfully', 'success');
        setShowForm(false);
        setFormData({
          bulk_product_id: '',
          finished_product_id: '',
          bulk_quantity_used: '',
          finished_units_produced: '',
          packaging_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setPackagingMaterials([]);
        fetchData();
      } else {
        showToast(`Error: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to create packaging run', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/packaging');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'packaging_template.xlsx';
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
      const res = await fetch('/api/packaging-runs/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} packaging runs`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Errors: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
        fetchData();
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

  const selectedBulkProduct = bulkProducts.find((p) => p.id === formData.bulk_product_id);
  const availableBulkQty = selectedBulkProduct?.bulk_product_inventory?.[0]?.quantity || 0;

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="text-2xl sm:text-3xl">Packaging Runs</CardTitle>
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
                variant="outline"
                size="sm"
              >
                Import Excel
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
              >
                New Packaging Run
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

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
            <CardTitle>Create Packaging Run</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulk-product">Bulk Product *</Label>
                  <Select
                    required
                    value={formData.bulk_product_id}
                    onValueChange={(value) => setFormData({ ...formData, bulk_product_id: value })}
                  >
                    <SelectTrigger id="bulk-product" className="mt-2">
                      <SelectValue placeholder="Select Bulk Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - Available: {product.bulk_product_inventory?.[0]?.quantity || 0} {product.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="finished-product">Finished Product *</Label>
                  <Select
                    required
                    value={formData.finished_product_id}
                    onValueChange={(value) => setFormData({ ...formData, finished_product_id: value })}
                  >
                    <SelectTrigger id="finished-product" className="mt-2">
                      <SelectValue placeholder="Select Finished Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bulk-qty">
                    Bulk Quantity Used * {selectedBulkProduct && `(${selectedBulkProduct.unit})`}
                  </Label>
                  <Input
                    id="bulk-qty"
                    type="number"
                    step="0.001"
                    required
                    value={formData.bulk_quantity_used}
                    onChange={(e) => setFormData({ ...formData, bulk_quantity_used: e.target.value })}
                    placeholder="e.g., 10"
                    max={availableBulkQty}
                    className="mt-2"
                  />
                  {selectedBulkProduct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {availableBulkQty} {selectedBulkProduct.unit}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="finished-units">Finished Units Produced *</Label>
                  <Input
                    id="finished-units"
                    type="number"
                    required
                    value={formData.finished_units_produced}
                    onChange={(e) => setFormData({ ...formData, finished_units_produced: e.target.value })}
                    placeholder="e.g., 50"
                    min="1"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="packaging-date">Packaging Date *</Label>
                  <Input
                    id="packaging-date"
                    type="date"
                    required
                    value={formData.packaging_date}
                    onChange={(e) => setFormData({ ...formData, packaging_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Packaging Materials (Optional)</Label>
                  <Button
                    type="button"
                    onClick={addPackagingMaterial}
                    size="sm"
                  >
                    + Add Material
                  </Button>
                </div>

                {packagingMaterials.length > 0 && (
                  <div className="mb-2 hidden sm:grid grid-cols-12 gap-2 px-2 py-2 border-b">
                    <div className="col-span-8 text-sm font-medium text-foreground">Material</div>
                    <div className="col-span-3 text-sm font-medium text-foreground">Quantity</div>
                    <div className="col-span-1 text-sm font-medium text-foreground">Action</div>
                  </div>
                )}

                {packagingMaterials.map((mat, index) => {
                  const material = rawMaterials.find((m) => m.id === mat.raw_material_id);
                  return (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 mb-3 sm:mb-2 p-3 sm:p-2 border rounded-lg items-center bg-card hover:bg-muted transition-colors">
                      <div className="col-span-1 sm:col-span-8">
                        <Label className="block text-xs font-medium mb-1 sm:hidden">Material</Label>
                        <Select
                          value={mat.raw_material_id}
                          onValueChange={(value) => updatePackagingMaterial(index, 'raw_material_id', value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select Material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} ({material.unit}) - Stock: {material.raw_material_inventory?.[0]?.quantity || 0}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 sm:col-span-3">
                        <Label className="block text-xs font-medium mb-1 sm:hidden">Quantity</Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="Qty"
                          value={mat.quantity_used}
                          onChange={(e) => updatePackagingMaterial(index, 'quantity_used', e.target.value)}
                          className="text-sm"
                          required
                          min="0.001"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-1">
                        <Button
                          type="button"
                          onClick={() => removePackagingMaterial(index)}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-2"
                  rows={2}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Packaging Run'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      bulk_product_id: '',
                      finished_product_id: '',
                      bulk_quantity_used: '',
                      finished_units_produced: '',
                      packaging_date: new Date().toISOString().split('T')[0],
                      notes: '',
                    });
                    setPackagingMaterials([]);
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
          placeholder="Search packaging runs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="space-y-4">
        {filteredRuns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No packaging runs match your search.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRuns.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {run.finished_products.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {run.bulk_products.name} ({run.bulk_quantity_used} {run.bulk_products.unit}) • {format(new Date(run.packaging_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {run.finished_units_produced} units produced
                    </p>
                    {run.notes && <p className="text-sm text-muted-foreground mt-2">{run.notes}</p>}
                  </div>
                </div>
                {run.packaging_materials_used && run.packaging_materials_used.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">Packaging Materials:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {run.packaging_materials_used.map((mat, idx) => (
                        <li key={idx}>
                          {mat.raw_materials.name}: {mat.quantity_used} {mat.raw_materials.unit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

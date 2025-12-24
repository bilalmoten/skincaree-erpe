'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
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
  last_price: number | null;
  raw_material_inventory: Array<{ quantity: number }>;
}

interface PurchaseOrder {
  id: string;
  supplier_name: string | null;
  purchase_date: string;
  total_amount: number;
  notes: string | null;
  purchase_order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    raw_materials: {
      id: string;
      name: string;
      unit: string;
    };
  }>;
}

interface PurchaseItem {
  raw_material_id: string;
  quantity: string;
  unit_price: string;
}

export default function PurchasesPage() {
  const { showToast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    supplier_name: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [items, setItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchMaterials();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch('/api/purchase-orders');
      const data = await res.json();
      setPurchaseOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/purchases/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchases.xlsx';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Failed to export', 'error');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredOrders(purchaseOrders);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = purchaseOrders.filter((order) =>
        order.supplier_name?.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query) ||
        order.purchase_order_items?.some((item) => 
          item.raw_materials?.name.toLowerCase().includes(query)
        )
      );
      setFilteredOrders(filtered);
    }
  }, [searchQuery, purchaseOrders]);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { raw_material_id: '', quantity: '1', unit_price: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill price when material is selected
    if (field === 'raw_material_id') {
      const material = materials.find((m) => m.id === value);
      if (material?.last_price) {
        updated[index].unit_price = material.last_price.toString();
      }
    }
    
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      if (item.raw_material_id && item.quantity && item.unit_price) {
        return sum + (parseFloat(item.unit_price) * parseFloat(item.quantity));
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const validItems = items.filter(
      (item) => item.raw_material_id && item.quantity && item.unit_price
    );

    if (validItems.length === 0) {
      showToast('Please add at least one item', 'error');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: validItems,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('Purchase order created successfully!', 'success');
        setShowForm(false);
        setFormData({ supplier_name: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
        setItems([]);
        fetchPurchaseOrders();
        fetchMaterials();
      } else {
        showToast(`Error: ${result.error || 'Failed to create purchase order'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to create purchase order', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/purchases');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'purchases_template.xlsx';
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
      const res = await fetch('/api/purchase-orders/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} purchase orders`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Errors in some rows: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
        fetchPurchaseOrders();
        fetchMaterials();
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
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
            onClick={handleExport}
            disabled={exporting}
            variant="default"
            size="sm"
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
          >
            + New Purchase Order
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

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search purchase orders by supplier, notes, or items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Purchase Order</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier Name</Label>
                <Input
                  id="supplier"
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Enter supplier name"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="purchase-date">Purchase Date *</Label>
                <Input
                  id="purchase-date"
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Items</Label>
                <Button
                  type="button"
                  onClick={addItem}
                  size="sm"
                >
                  + Add Item
                </Button>
              </div>

              {items.length > 0 && (
                <div className="mb-3 hidden sm:grid grid-cols-12 gap-2 px-3 py-3 border-b bg-muted rounded-t-xl">
                  <div className="col-span-5 text-sm font-semibold text-foreground">Ingredient</div>
                  <div className="col-span-2 text-sm font-semibold text-foreground">Quantity</div>
                  <div className="col-span-1 text-sm font-semibold text-foreground">Unit</div>
                  <div className="col-span-2 text-sm font-semibold text-foreground">Price</div>
                  <div className="col-span-2 text-sm font-semibold text-foreground">Action</div>
                </div>
              )}

              {items.map((item, index) => {
                const material = materials.find((m) => m.id === item.raw_material_id);

                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 mb-3 sm:mb-2 p-4 sm:p-3 border rounded-xl items-center bg-card hover:bg-muted transition-colors">
                    <div className="col-span-1 sm:col-span-5">
                      <Label className="block text-xs font-medium mb-1 sm:hidden">Ingredient</Label>
                      <Select
                        value={item.raw_material_id}
                        onValueChange={(value) => updateItem(index, 'raw_material_id', value)}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue placeholder="Select Material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} - Stock: {material.raw_material_inventory?.[0]?.quantity || 0}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="block text-xs font-medium mb-1 sm:hidden">Quantity</Label>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="text-sm"
                        required
                        min="0.001"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-1 text-sm text-foreground text-center sm:text-center">
                      <Label className="block text-xs font-medium mb-1 sm:hidden">Unit</Label>
                      <span className="inline-block px-3 py-1.5 bg-muted rounded-xl font-medium">{material?.unit || '-'}</span>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="block text-xs font-medium mb-1 sm:hidden">Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        className="text-sm"
                        required
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
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

            <div className="text-right text-xl font-bold text-foreground py-4 px-4 bg-muted rounded-xl">
              Total: PKR {calculateTotal().toFixed(2)}
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

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Purchase Order'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ supplier_name: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
                  setItems([]);
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

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No purchase orders match your search.' : 'No purchase orders found. Create your first purchase order!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Purchase Order #{order.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {order.supplier_name || 'No Supplier'} • {format(new Date(order.purchase_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      PKR {order.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2 text-foreground">Items:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {order.purchase_order_items?.map((item, idx) => (
                      <li key={idx}>
                        {item.raw_materials?.name}: {item.quantity} {item.raw_materials?.unit} × PKR {item.unit_price.toFixed(2)} = PKR {item.subtotal.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
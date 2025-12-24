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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Customer {
  id: string;
  name: string;
}

interface FinishedProduct {
  id: string;
  name: string;
  price: number;
  finished_product_inventory: Array<{ quantity: number }>;
}

interface SaleItem {
  finished_product_id: string;
  quantity: string;
  unit_price: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    is_cash_paid: false,
    discount_type: 'none' as 'none' | 'percentage' | 'fixed',
    discount_value: '',
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    setCreatingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      if (res.ok) {
        const customer = await res.json();
        setCustomers([...customers, customer]);
        setFormData({ ...formData, customer_id: customer.id });
        setShowCustomerModal(false);
        setNewCustomer({ name: '', email: '', phone: '', address: '' });
        showToast('Customer created successfully', 'success');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error || 'Failed to create customer'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to create customer', 'error');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/finished-products');
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { finished_product_id: '', quantity: '1', unit_price: '0' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'finished_product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unit_price = product.price.toString();
      }
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }, 0);
  };

  const calculateDiscount = (subtotal: number) => {
    const val = parseFloat(formData.discount_value) || 0;
    if (formData.discount_type === 'percentage') {
      return (subtotal * val) / 100;
    } else if (formData.discount_type === 'fixed') {
      return val;
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount(subtotal);
    return Math.max(0, subtotal - discount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      showToast('Please select a customer', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.map((item) => ({
            ...item,
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
          })),
        }),
      });

      if (res.ok) {
        showToast('Sale recorded successfully', 'success');
        router.push('/sales');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      showToast('Failed to record sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscount(subtotal);
  const total = calculateTotal();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Record New Sale</h1>
        <Button onClick={() => setShowCustomerModal(true)} variant="outline">
          + Quick Add Customer
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Sale Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger id="customer" className="mt-2">
                      <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sale_date">Sale Date *</Label>
                  <Input
                    id="sale_date"
                    type="date"
                    required
                    value={formData.sale_date}
                    onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg font-semibold">Items</Label>
                  <Button type="button" onClick={addItem} size="sm">
                    + Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center border p-3 rounded-lg bg-muted/30">
                      <div className="col-span-6">
                        <Select
                          value={item.finished_product_id}
                          onValueChange={(value) => updateItem(index, 'finished_product_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} (Stock: {p.finished_product_inventory?.[0]?.quantity || 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          placeholder="Price"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground italic">No items added yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">PKR {subtotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Discount</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: any) => setFormData({ ...formData, discount_type: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder="0"
                      disabled={formData.discount_type === 'none'}
                      className="flex-1"
                    />
                  </div>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount:</span>
                    <span>- PKR {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold pt-4 border-t">
                  <span>Total:</span>
                  <span>PKR {total.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    id="is_cash_paid"
                    type="checkbox"
                    checked={formData.is_cash_paid}
                    onChange={(e) => setFormData({ ...formData, is_cash_paid: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="is_cash_paid" className="cursor-pointer">Mark as Cash Paid</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-2"
                  rows={3}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Processing...' : 'Complete Sale'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div>
              <Label htmlFor="cust_name">Name *</Label>
              <Input
                id="cust_name"
                required
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="cust_phone">Phone</Label>
              <Input
                id="cust_phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="cust_address">Address</Label>
              <Textarea
                id="cust_address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="mt-2"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCustomerModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingCustomer}>
                {creatingCustomer ? 'Saving...' : 'Save Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [items, setItems] = useState<SaleItem[]>([]);

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
    setItems([...items, { finished_product_id: '', quantity: '1', unit_price: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill price when product is selected
    if (field === 'finished_product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].unit_price = product.price.toString();
      }
    }
    
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      if (item.finished_product_id && item.quantity && item.unit_price) {
        return sum + (parseFloat(item.unit_price) * parseInt(item.quantity));
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validItems = items.filter(
      (item) => item.finished_product_id && item.quantity && item.unit_price
    );

    if (validItems.length === 0) {
      alert('Please add at least one item');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: validItems,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('Sale created successfully!');
        router.push('/sales');
      } else {
        alert(`Error: ${result.error || 'Failed to create sale'}`);
      }
    } catch (error) {
      alert('Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">New Sale</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sale Date *</label>
            <input
              type="date"
              required
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Items</label>
            <button
              type="button"
              onClick={addItem}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Item
            </button>
          </div>

          {items.map((item, index) => {
            const product = products.find((p) => p.id === item.finished_product_id);
            const available = product?.finished_product_inventory?.[0]?.quantity || 0;

            return (
              <div key={index} className="flex gap-2 mb-2 p-2 border rounded">
                <select
                  value={item.finished_product_id}
                  onChange={(e) => updateItem(index, 'finished_product_id', e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.finished_product_inventory?.[0]?.quantity || 0})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  className="w-24 border rounded px-3 py-2"
                  required
                  min="1"
                  max={available}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                  className="w-32 border rounded px-3 py-2"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-right text-lg font-bold">
          Total: PKR {calculateTotal().toFixed(2)}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Sale'}
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


'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

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
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
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
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
      alert('Please add at least one item');
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
        alert('Purchase order created successfully!');
        setShowForm(false);
        setFormData({ supplier_name: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
        setItems([]);
        fetchPurchaseOrders();
        fetchMaterials();
      } else {
        alert(`Error: ${result.error || 'Failed to create purchase order'}`);
      }
    } catch (error) {
      alert('Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
        >
          + New Purchase Order
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-6">New Purchase Order</h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Supplier Name</label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 dark:bg-slate-700 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Purchase Date *</label>
                <input
                  type="date"
                  required
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 dark:bg-slate-700 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-medium shadow-sm"
                >
                  + Add Item
                </button>
              </div>

              {items.length > 0 && (
                <div className="mb-3 hidden sm:grid grid-cols-12 gap-2 px-3 py-3 border-b border-gray-200 dark:border-slate-700 bg-[var(--surface-muted)] dark:bg-slate-700/30 rounded-t-xl">
                  <div className="col-span-5 text-sm font-semibold text-gray-700 dark:text-gray-300">Ingredient</div>
                  <div className="col-span-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</div>
                  <div className="col-span-1 text-sm font-semibold text-gray-700 dark:text-gray-300">Unit</div>
                  <div className="col-span-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Price</div>
                  <div className="col-span-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</div>
                </div>
              )}

              {items.map((item, index) => {
                const material = materials.find((m) => m.id === item.raw_material_id);
                const available = material?.raw_material_inventory?.[0]?.quantity || 0;

                return (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 mb-3 sm:mb-2 p-4 sm:p-3 border border-gray-200 dark:border-slate-700 rounded-xl items-center bg-white dark:bg-slate-800/50 hover:bg-[var(--surface-muted)] dark:hover:bg-slate-700/50 transition-colors">
                    <div className="col-span-1 sm:col-span-5">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:hidden">Ingredient</label>
                      <select
                        value={item.raw_material_id}
                        onChange={(e) => updateItem(index, 'raw_material_id', e.target.value)}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 dark:bg-slate-700 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all"
                        required
                      >
                        <option value="">Select Material</option>
                        {materials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} - Stock: {material.raw_material_inventory?.[0]?.quantity || 0}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:hidden">Quantity</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 dark:bg-slate-700 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all"
                        required
                        min="0.001"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-1 text-sm text-gray-700 dark:text-gray-300 text-center sm:text-center">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:hidden">Unit</label>
                      <span className="inline-block px-3 py-1.5 bg-gray-100 dark:bg-slate-700 rounded-xl font-medium">{material?.unit || '-'}</span>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:hidden">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3 py-2 dark:bg-slate-700 dark:text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all"
                        required
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full px-3 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-sm font-medium shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-right text-xl font-bold text-gray-900 dark:text-white py-4 px-4 bg-[var(--surface-muted)] dark:bg-slate-700/30 rounded-xl">
              Total: PKR {calculateTotal().toFixed(2)}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 dark:bg-slate-700 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900/50 transition-all"
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:bg-gray-400 transition-all font-medium shadow-sm hover:shadow-md"
              >
                {saving ? 'Saving...' : 'Save Purchase Order'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ supplier_name: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
                  setItems([]);
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {purchaseOrders.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-gray-600 dark:text-gray-400">No purchase orders found. Create your first purchase order!</p>
          </div>
        ) : (
          purchaseOrders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Purchase Order #{order.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {order.supplier_name || 'No Supplier'} • {format(new Date(order.purchase_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    PKR {order.total_amount.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <h4 className="font-medium text-sm mb-2 text-gray-900 dark:text-white">Items:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {order.purchase_order_items?.map((item, idx) => (
                    <li key={idx}>
                      {item.raw_materials?.name}: {item.quantity} {item.raw_materials?.unit} × PKR {item.unit_price.toFixed(2)} = PKR {item.subtotal.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
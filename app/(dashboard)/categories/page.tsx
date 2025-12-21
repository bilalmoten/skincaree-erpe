'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  type: 'ingredient' | 'packaging' | 'bulk_product' | 'finished_good';
  parent_id: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ingredient' as Category['type'],
    parent_id: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingCategory
        ? `/api/material-categories/${editingCategory.id}`
        : '/api/material-categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingCategory(null);
        setFormData({ name: '', type: 'ingredient', parent_id: '' });
        fetchCategories();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to save category'}`);
      }
    } catch (error) {
      alert('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const res = await fetch(`/api/material-categories/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCategories();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to delete category'}`);
      }
    } catch (error) {
      alert('Failed to delete category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      parent_id: category.parent_id || '',
    });
    setShowForm(true);
  };

  const getCategoriesByType = (type: Category['type']) => {
    return categories.filter((c) => c.type === type);
  };

  if (loading && categories.length === 0) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Material Categories</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCategory(null);
            setFormData({ name: '', type: 'ingredient', parent_id: '' });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Category
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">
            {editingCategory ? 'Edit Category' : 'New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Category['type'] })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="ingredient">Ingredient</option>
                <option value="packaging">Packaging</option>
                <option value="bulk_product">Bulk Product</option>
                <option value="finished_good">Finished Good</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parent Category (Optional)</label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">None</option>
                {categories
                  .filter((c) => c.type === formData.type && c.id !== editingCategory?.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', type: 'ingredient', parent_id: '' });
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['ingredient', 'packaging', 'bulk_product', 'finished_good'] as const).map((type) => (
          <div key={type} className="bg-white border rounded p-4">
            <h2 className="text-xl font-semibold mb-4 capitalize">{type.replace('_', ' ')}</h2>
            {getCategoriesByType(type).length === 0 ? (
              <p className="text-gray-500 text-sm">No categories yet</p>
            ) : (
              <ul className="space-y-2">
                {getCategoriesByType(type).map((category) => (
                  <li key={category.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span>{category.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


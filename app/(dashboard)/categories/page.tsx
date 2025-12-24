'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  type: 'ingredient' | 'packaging' | 'bulk_product' | 'finished_good';
  parent_id: string | null;
}

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
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
        showToast(editingCategory ? 'Category updated successfully' : 'Category created successfully', 'success');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error || 'Failed to save category'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to save category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/material-categories/${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCategories();
        showToast('Category deleted successfully', 'success');
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error || 'Failed to delete category'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to delete category', 'error');
    } finally {
      setDeleteId(null);
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

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/categories');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'categories_template.xlsx';
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
      const res = await fetch('/api/material-categories/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} categories`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Errors: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
        fetchCategories();
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

  const getCategoriesByType = (type: Category['type']) => {
    return categories.filter((c) => c.type === type);
  };

  if (loading && categories.length === 0) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Material Categories</h1>
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
            onClick={() => {
              setShowForm(true);
              setEditingCategory(null);
              setFormData({ name: '', type: 'ingredient', parent_id: '' });
            }}
            size="sm"
            className="bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90"
          >
            + Add Category
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
            <CardTitle>{editingCategory ? 'Edit Category' : 'New Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Category['type'] })}
                >
                  <SelectTrigger id="type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingredient">Ingredient</SelectItem>
                    <SelectItem value="packaging">Packaging</SelectItem>
                    <SelectItem value="bulk_product">Bulk Product</SelectItem>
                    <SelectItem value="finished_good">Finished Good</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="parent">Parent Category (Optional)</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                >
                  <SelectTrigger id="parent" className="mt-1">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories
                      .filter((c) => c.type === formData.type && c.id !== editingCategory?.id)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90"
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                    setFormData({ name: '', type: 'ingredient', parent_id: '' });
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['ingredient', 'packaging', 'bulk_product', 'finished_good'] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="capitalize">{type.replace('_', ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
              {getCategoriesByType(type).length === 0 ? (
                <p className="text-muted-foreground text-sm">No categories yet</p>
              ) : (
                <ul className="space-y-2">
                  {getCategoriesByType(type).map((category) => (
                    <li key={category.id} className="flex justify-between items-center p-2 hover:bg-muted rounded">
                      <span>{category.name}</span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(category)}
                          variant="ghost"
                          size="sm"
                          className="text-[hsl(var(--info))]"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(category.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        type="danger"
      />
    </div>
  );
}

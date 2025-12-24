'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from '@/components/ConfirmDialog';
import { Badge } from "@/components/ui/badge";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  supplier: string | null;
  last_price: number | null;
  notes: string | null;
  category_id: string | null;
  material_categories?: {
    name: string;
  };
  raw_material_inventory: Array<{ quantity: number }>;
}

export default function RawMaterialsPage() {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setMaterials(data);
      setFilteredMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      setCategories(data.filter((c: any) => c.type === 'ingredient' || c.type === 'packaging'));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    let filtered = materials;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((material) =>
        material.name.toLowerCase().includes(query) ||
        material.supplier?.toLowerCase().includes(query) ||
        material.notes?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((material) => material.category_id === categoryFilter);
    }

    setFilteredMaterials(filtered);
  }, [searchQuery, categoryFilter, materials]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/raw-materials/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raw_materials.xlsx';
      a.click();
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Failed to export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/raw-materials');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'raw_materials_template.xlsx';
      a.click();
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await fetch('/api/raw-materials/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} materials`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Some rows had errors: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
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

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/raw-materials/${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Material deleted successfully', 'success');
        fetchMaterials();
      } else {
        const result = await res.json();
        showToast(`Error: ${result.error || 'Failed to delete material'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      showToast('Failed to delete material', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="text-2xl sm:text-3xl">Raw Materials</CardTitle>
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
              >
                Import Excel
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                size="sm"
                className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
              >
                {exporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              <Button asChild size="sm">
                <Link href="/raw-materials/new">+ Add New</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          type="text"
          placeholder="Search materials by name, supplier, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Unit</TableHead>
                <TableHead className="hidden md:table-cell">Supplier</TableHead>
                <TableHead className="hidden lg:table-cell">Last Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchQuery || categoryFilter !== 'all' ? 'No materials match your search.' : 'No raw materials found. Add your first material!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">
                        {material.material_categories?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{material.unit}</TableCell>
                    <TableCell className="hidden md:table-cell">{material.supplier || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {material.last_price ? `PKR ${material.last_price.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {material.raw_material_inventory?.[0]?.quantity || 0} {material.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Link
                          href={`/raw-materials/${material.id}`}
                          className="text-[hsl(var(--info))] hover:underline font-medium text-xs sm:text-sm"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/purchases?material=${material.id}`}
                          className="text-[hsl(var(--success))] hover:underline font-medium text-xs sm:text-sm"
                        >
                          Purchase
                        </Link>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="text-destructive hover:underline font-medium text-xs sm:text-sm text-left"
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Raw Material"
        message="Are you sure you want to delete this raw material? This will also remove its inventory and references in formulations and production runs."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        type="danger"
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FinishedProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  formulation_id: string | null;
  category_id: string | null;
  notes: string | null;
  finished_product_inventory: Array<{ quantity: number }>;
  formulations: { name: string } | null;
  material_categories?: { name: string } | null;
}

export default function FinishedProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<FinishedProduct[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/finished-products');
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/material-categories');
      const data = await res.json();
      setCategories(data.filter((c: any) => c.type === 'finished_good'));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.notes?.toLowerCase().includes(query) ||
        product.formulations?.name.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category_id === categoryFilter);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, products]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/finished-products/excel/export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finished_products.xlsx';
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
      const res = await fetch('/api/excel/templates/finished-products');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finished_products_template.xlsx';
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
      const res = await fetch('/api/finished-products/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        let msg = `Successfully imported ${result.imported} products`;
        if (result.errors && result.errors.length > 0) {
          msg += `. Some rows had errors: ${result.errors.join(', ').slice(0, 100)}...`;
        }
        showToast(msg, result.errors ? 'warning' : 'success');
        setShowImport(false);
        setImportFile(null);
        fetchProducts();
      } else {
        showToast(`Error: ${result.error || 'Import failed'}`, 'error');
      }
    } catch (error) {
      console.error('Error importing:', error);
      showToast('Failed to import', 'error');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Finished Products</h1>
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
            <Link href="/finished-products/new">Add New</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          type="text"
          placeholder="Search products by name, SKU, or notes..."
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
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden lg:table-cell">Formulation</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || categoryFilter !== 'all' ? 'No products match your search.' : 'No finished products found. Add your first product!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">
                        {product.material_categories?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{product.sku || '-'}</TableCell>
                    <TableCell>PKR {product.price.toFixed(2)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {product.formulations?.name || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.finished_product_inventory?.[0]?.quantity || 0}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/finished-products/${product.id}`}
                        className="text-primary hover:underline font-medium text-xs sm:text-sm"
                      >
                        Edit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

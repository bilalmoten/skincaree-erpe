'use client';

import { useEffect, useState, Suspense } from 'react';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Package, PackageCheck } from 'lucide-react';

interface ProductionRun {
  id: string;
  formulation_id: string;
  batch_size: number;
  production_date: string;
  notes: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  formulations: {
    name: string;
    batch_unit?: string;
  };
  production_materials_used: Array<{
    quantity_used: number;
    raw_materials: {
      name: string;
      unit: string;
    };
  }>;
  finished_products?: Array<{
    id: string;
    name: string;
  }>;
  finished_products_produced?: Array<{
    id: string;
    name: string;
    quantity_produced: number;
    batch_size: number;
    units_per_batch: number;
  }>;
  cogs?: {
    totalCost: number;
    costPerUnit: number;
  } | null;
}

interface Formulation {
  id: string;
  name: string;
  batch_size?: number;
  batch_unit?: string;
  produces_id?: string;
  produces_type?: 'bulk' | 'finished';
  formulation_ingredients?: Array<{
    name?: string;
    quantity: number;
    unit?: string;
  }>;
}

interface FinishedProduct {
  id: string;
  name: string;
  formulation_id: string | null;
}

function ProductionPageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<ProductionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [bulkProducts, setBulkProducts] = useState<any[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    formulation_id: '',
    finished_product_id: '', // Backward compatibility
    batch_size: '',
    production_date: new Date().toISOString().split('T')[0],
    notes: '',
    overhead_cost: '',
    overhead_percentage: '',
    labor_cost: '',
  });
  const [creating, setCreating] = useState(false);
  const [selectedFormulationCOGS, setSelectedFormulationCOGS] = useState<any>(null);

  useEffect(() => {
    fetchRuns();
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [formRes, bulkRes, finishedRes] = await Promise.all([
        fetch('/api/formulations'),
        fetch('/api/bulk-products'),
        fetch('/api/finished-products'),
      ]);
      setFormulations(await formRes.json());
      setBulkProducts(await bulkRes.json());
      setFinishedProducts(await finishedRes.json());
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  useEffect(() => {
    if (formData.formulation_id) {
      fetchFormulationCOGS(formData.formulation_id);
    } else {
      setSelectedFormulationCOGS(null);
    }
  }, [formData.formulation_id]);

  const fetchFormulationCOGS = async (id: string) => {
    try {
      const res = await fetch(`/api/formulations/${id}/cogs`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFormulationCOGS(data);
      }
    } catch (error) {
      console.error('Error fetching formulation COGS:', error);
    }
  };

  const selectedFormulation = formData.formulation_id
    ? formulations.find(f => f.id === formData.formulation_id)
    : null;

  const targetName = selectedFormulation?.produces_type === 'bulk' 
    ? bulkProducts.find(b => b.id === selectedFormulation.produces_id)?.name || 'Bulk Product'
    : finishedProducts.find(f => f.id === selectedFormulation?.produces_id)?.name || 'Finished Product';

  const handleOverheadChange = (type: 'amount' | 'percentage', value: string) => {
    const baseCost = selectedFormulationCOGS?.totalCost || 0;
    const parsedValue = parseFloat(value);
    const nextFormData = {
      ...formData,
      [type === 'amount' ? 'overhead_cost' : 'overhead_percentage']: value,
    };

    if (value === '') {
      if (type === 'amount') {
        nextFormData.overhead_percentage = '';
      } else {
        nextFormData.overhead_cost = '';
      }
    } else if (baseCost > 0 && !Number.isNaN(parsedValue)) {
      if (type === 'amount') {
        nextFormData.overhead_percentage = ((parsedValue / baseCost) * 100).toFixed(2);
      } else {
        nextFormData.overhead_cost = ((parsedValue / 100) * baseCost).toFixed(2);
      }
    }

    setFormData(nextFormData);
  };

  // Handle query parameter for pre-filling form
  useEffect(() => {
    const formulationId = searchParams.get('formulation');
    if (formulationId && formulations.length > 0) {
      const formulation = formulations.find(f => f.id === formulationId);
      if (formulation) {
        setShowForm(true);
        setFormData(prev => ({
          ...prev,
          formulation_id: formulationId,
          batch_size: formulation.batch_size?.toString() || '',
        }));
      }
    }
  }, [searchParams, formulations]);

  useEffect(() => {
    // Filter finished products when formulation changes
    if (formData.formulation_id) {
      const filtered = finishedProducts.filter(
        (p) => p.formulation_id === formData.formulation_id
      );
      if (filtered.length > 0 && !filtered.find(p => p.id === formData.finished_product_id)) {
        setFormData({ ...formData, finished_product_id: filtered[0].id });
      } else if (filtered.length === 0) {
        setFormData({ ...formData, finished_product_id: '' });
      }
    }
  }, [formData.formulation_id, finishedProducts]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRuns(runs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = runs.filter((run) =>
        run.formulations?.name.toLowerCase().includes(query) ||
        run.id.toLowerCase().includes(query) ||
        run.notes?.toLowerCase().includes(query) ||
        run.finished_products?.some((p) => p.name.toLowerCase().includes(query))
      );
      setFilteredRuns(filtered);
    }
  }, [searchQuery, runs]);

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/production');
      const data = await res.json();
      
      // Fetch COGS for each run
      const runsWithCOGS = await Promise.all(
        data.map(async (run: ProductionRun) => {
          try {
            const cogsRes = await fetch(`/api/production/${run.id}/cogs`);
            if (cogsRes.ok) {
              const cogs = await cogsRes.json();
              return { ...run, cogs };
            }
          } catch (error) {
            console.error(`Error fetching COGS for ${run.id}:`, error);
          }
          return run;
        })
      );
      
      setRuns(runsWithCOGS);
      setFilteredRuns(runsWithCOGS);
    } catch (error) {
      console.error('Error fetching production runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormulations = async () => {
    try {
      const res = await fetch('/api/formulations');
      const data = await res.json();
      setFormulations(data);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    }
  };

  const fetchFinishedProducts = async () => {
    try {
      const res = await fetch('/api/finished-products');
      const data = await res.json();
      setFinishedProducts(data);
    } catch (error) {
      console.error('Error fetching finished products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        showToast('Production run created successfully!', 'success');
        setShowForm(false);
        setFormData({
          formulation_id: '',
          finished_product_id: '',
          batch_size: '',
          production_date: new Date().toISOString().split('T')[0],
          notes: '',
          overhead_cost: '',
          overhead_percentage: '',
          labor_cost: '',
        });
        fetchRuns();
      } else {
        // Display user-friendly error message
        const errorMessage = result.error || 'Failed to create production run';
        showToast(errorMessage, 'error');
        
        // If there are details, log them for debugging
        if (result.details) {
          console.error('Production error details:', result.details);
        }
      }
    } catch (error) {
      showToast('Failed to create production run', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/excel/templates/production');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'production_template.xlsx';
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
      const res = await fetch('/api/production/excel/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      
      if (result.success) {
        showToast(`Successfully imported ${result.imported} production runs${result.errors ? `. Errors: ${result.errors.join(', ')}` : ''}`, 'success');
        setShowImport(false);
        setImportFile(null);
        fetchRuns();
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

  const availableProducts = formData.formulation_id
    ? finishedProducts.filter((p) => p.formulation_id === formData.formulation_id)
    : [];

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>;
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle className="text-3xl">Production Runs</CardTitle>
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
                onClick={() => setShowForm(!showForm)}
                size="sm"
              >
                New Production Run
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Production Run</CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="formulation">Formulation *</Label>
                <Select
                  required
                  value={formData.formulation_id}
                  onValueChange={(value) => setFormData({ ...formData, formulation_id: value, finished_product_id: '' })}
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
                {selectedFormulation && (
                  <p className="text-xs text-[hsl(var(--info))] mt-2 font-medium flex items-center gap-1">
                    Produces: {selectedFormulation.produces_type === 'bulk' ? (
                      <>
                        <Package className="h-3 w-3 inline" /> Bulk
                      </>
                    ) : (
                      <>
                        <PackageCheck className="h-3 w-3 inline" /> Finished
                      </>
                    )} - {targetName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="batch-size">
                  Batch Size * 
                  {selectedFormulation?.batch_unit ? ` (${selectedFormulation.batch_unit})` : ''}
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="batch-size"
                    type="number"
                    step="0.001"
                    required
                    value={formData.batch_size}
                    onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                    placeholder="e.g., 100"
                    className="flex-1"
                  />
                  {selectedFormulation?.batch_unit && (
                    <span className="text-foreground font-medium px-3 py-2 bg-muted border rounded-lg">
                      {selectedFormulation.batch_unit}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="production-date">Production Date *</Label>
                <Input
                  id="production-date"
                  type="date"
                  required
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                <div>
                  <Label htmlFor="overhead-amount">Overhead Cost (PKR)</Label>
                  <Input
                    id="overhead-amount"
                    type="number"
                    step="0.01"
                    value={formData.overhead_cost}
                    onChange={(e) => handleOverheadChange('amount', e.target.value)}
                    placeholder="Fixed amount"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="overhead-percentage">Overhead (%)</Label>
                  <Input
                    id="overhead-percentage"
                    type="number"
                    step="0.01"
                    value={formData.overhead_percentage}
                    onChange={(e) => handleOverheadChange('percentage', e.target.value)}
                    placeholder="Percentage of materials"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="labor-cost">Labor Cost (PKR)</Label>
                  <Input
                    id="labor-cost"
                    type="number"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                    placeholder="e.g., 500"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {selectedFormulation?.formulation_ingredients && (
              <div className="space-y-3 pt-4 border-t">
                <Label>Required Ingredients (Calculated):</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFormulation.formulation_ingredients.map((ing: any, idx: number) => {
                    const batchSize = parseFloat(formData.batch_size) || 0;
                    const baseBatchSize = selectedFormulation.batch_size || 1;
                    const multiplier = batchSize / baseBatchSize;
                    return (
                      <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                        <span>{ing.name || 'Unknown'}</span>
                        <span className="font-mono">{(ing.quantity * multiplier).toFixed(3)} {ing.unit}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Run'
                )}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    formulation_id: '',
                    finished_product_id: '',
                    batch_size: '',
                    production_date: new Date().toISOString().split('T')[0],
                    notes: '',
                    overhead_cost: '',
                    overhead_percentage: '',
                    labor_cost: '',
                  });
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
          placeholder="Search production runs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="space-y-4">
        {filteredRuns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">{searchQuery ? 'No production runs match your search.' : 'No production runs found. Create your first production run!'}</p>
            </CardContent>
          </Card>
        ) : (
          filteredRuns.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">{run.formulations?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Batch Size: {run.batch_size} {run.formulations?.batch_unit || 'kg'} • {format(new Date(run.production_date), 'MMM dd, yyyy')}
                      {run.batch_number && <Badge className="ml-2">{run.batch_number}</Badge>}
                    </p>
                    {run.expiry_date && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Expiry: {format(new Date(run.expiry_date), 'MMM dd, yyyy')}
                      </p>
                    )}
                    {run.cogs && (
                      <p className="text-sm text-[hsl(var(--success))] font-medium mt-1">
                        Production Cost: PKR {run.cogs.totalCost.toFixed(2)}
                      </p>
                    )}
                    {run.notes && <p className="text-sm text-muted-foreground mt-1">{run.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Production Run ID: {run.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        const { generateProductionRunPDF } = await import('@/lib/pdf/utils');
                        const doc = generateProductionRunPDF(run);
                        doc.save(`production-run-${run.id.slice(0, 8)}.pdf`);
                      } catch (error) {
                        console.error('Error generating PDF:', error);
                        showToast('Failed to generate PDF', 'error');
                      }
                    }}
                    size="sm"
                  >
                    Print Run
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-medium text-sm text-foreground mb-2">Materials Used:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {run.production_materials_used?.map((mat, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{mat.raw_materials?.name}:</span>
                          <span className="font-medium text-destructive">
                            -{mat.quantity_used.toFixed(3)} {mat.raw_materials?.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-foreground mb-2">Finished Products Produced:</h4>
                    {run.finished_products_produced && run.finished_products_produced.length > 0 ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {run.finished_products_produced.map((product, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{product.name}:</span>
                            <span className="font-medium text-[hsl(var(--success))]">
                              +{product.quantity_produced} units
                              {product.batch_size && product.units_per_batch && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({product.batch_size} × {product.units_per_batch})
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : run.finished_products && run.finished_products.length > 0 ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {run.finished_products.map((product, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{product.name}:</span>
                            <span className="font-medium text-[hsl(var(--success))]">
                              +{Math.floor(run.batch_size)} units
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No finished products linked to this formulation</p>
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

export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ProductionPageContent />
    </Suspense>
  );
}
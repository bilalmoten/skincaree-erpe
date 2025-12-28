"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Ingredient {
  id: string;
  quantity: number;
  unit: string;
  name?: string;
  raw_materials?: {
    id: string;
    name: string;
    unit: string;
  };
  bulk_products?: {
    id: string;
    name: string;
    unit: string;
  };
}

interface Formulation {
  id: string;
  name: string;
  description: string | null;
  batch_size: number;
  batch_unit: string | null;
  formulation_ingredients: Ingredient[];
  cogs?: {
    totalCost: number;
    costPerUnit: number;
  } | null;
}

export default function FormulationsPage() {
  const { showToast } = useToast();
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [filteredFormulations, setFilteredFormulations] = useState<
    Formulation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  useEffect(() => {
    fetchFormulations();
  }, []);

  const fetchFormulations = async () => {
    try {
      const res = await fetch("/api/formulations");
      const data = await res.json();

      // Fetch COGS for each formulation
      const formulationsWithCOGS = await Promise.all(
        data.map(async (formulation: Formulation) => {
          try {
            const cogsRes = await fetch(
              `/api/formulations/${formulation.id}/cogs`
            );
            if (cogsRes.ok) {
              const cogs = await cogsRes.json();
              return { ...formulation, cogs };
            }
          } catch (error) {
            console.error(`Error fetching COGS for ${formulation.id}:`, error);
          }
          return formulation;
        })
      );

      setFormulations(formulationsWithCOGS);
      setFilteredFormulations(formulationsWithCOGS);
    } catch (error) {
      console.error("Error fetching formulations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFormulations(formulations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = formulations.filter(
        (formulation) =>
          formulation.name.toLowerCase().includes(query) ||
          formulation.description?.toLowerCase().includes(query)
      );
      setFilteredFormulations(filtered);
    }
  }, [searchQuery, formulations]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/formulations/excel/export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "formulations.xlsx";
      a.click();
    } catch (error) {
      console.error("Error exporting:", error);
      showToast("Failed to export", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch("/api/excel/templates/formulations");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "formulations_template.xlsx";
      a.click();
    } catch (error) {
      console.error("Error downloading template:", error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/formulations/excel/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        showToast(
          `Successfully imported ${result.imported} formulations${
            result.errors ? `. Errors: ${result.errors.join(", ")}` : ""
          }`,
          "success"
        );
        setShowImport(false);
        setImportFile(null);
        fetchFormulations();
      } else {
        showToast(`Error: ${result.error || "Import failed"}`, "error");
      }
    } catch (error) {
      console.error("Error importing:", error);
      showToast("Failed to import", "error");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-foreground">Formulations</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleDownloadTemplate}
            variant="secondary"
            size="sm"
          >
            Download Template
          </Button>
          <Button onClick={() => setShowImport(!showImport)} size="sm">
            Import Excel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            size="sm"
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
          >
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          <Button asChild size="sm">
            <Link href="/formulations/new">Add New</Link>
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
                {importing ? "Importing..." : "Import"}
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
          placeholder="Search formulations by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      <div className="grid gap-4">
        {filteredFormulations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No formulations match your search."
                  : "No formulations found. Add your first formulation!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFormulations.map((formulation) => {
            const isExpanded = expandedCards.has(formulation.id);
            
            return (
              <Card
                key={formulation.id}
                className="hover:shadow-md transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                          {formulation.name}
                        </h3>
                        <button
                          onClick={() => toggleCard(formulation.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                      {formulation.description && (
                        <p className="text-muted-foreground text-sm mt-1 mb-2">
                          {formulation.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Batch Size: {formulation.batch_size}{" "}
                        {formulation.batch_unit || "kg"}
                      </p>
                      {formulation.cogs && (
                        <p className="text-sm text-[hsl(var(--success))] font-medium mt-2">
                          COGS: PKR {formulation.cogs.totalCost.toFixed(2)} per
                          batch (PKR {formulation.cogs.costPerUnit.toFixed(2)} per{" "}
                          {formulation.batch_unit || "kg"})
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={async () => {
                          try {
                            const { generateFormulationPDF } = await import('@/lib/pdf/utils');
                            const doc = generateFormulationPDF(formulation);
                            doc.save(`formulation-${formulation.name.replace(/\s+/g, '-')}.pdf`);
                          } catch (error) {
                            console.error('Error generating PDF:', error);
                            showToast('Failed to generate PDF', 'error');
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        📄 Print
                      </Button>
                      <Button
                        asChild
                        className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                        size="sm"
                      >
                        <Link href={`/production?formulation=${formulation.id}`}>
                          Create Production
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/formulations/${formulation.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Ingredients - only show when expanded */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-sm mb-2">Ingredients:</h4>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <ul className="text-sm text-muted-foreground space-y-2">
                          {formulation.formulation_ingredients?.map((ing, idx) => {
                            // Handle both raw materials and bulk products
                            const ingredientName = ing.name || ing.raw_materials?.name || ing.bulk_products?.name || 'Unknown Ingredient';
                            const percentage = formulation.batch_size > 0 
                              ? ((ing.quantity / formulation.batch_size) * 100).toFixed(1) 
                              : '0';
                            
                            return (
                              <li key={idx} className="flex justify-between items-center py-1">
                                <span className="font-medium">{ingredientName}</span>
                                <div className="flex gap-4 text-right">
                                  <span className="text-[hsl(var(--info))]">{percentage}%</span>
                                  <span className="min-w-[80px]">{ing.quantity} {ing.unit}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

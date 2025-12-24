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
  raw_materials: {
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
    <div className="max-w-7xl mx-auto p-6">
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
          filteredFormulations.map((formulation) => (
            <Card
              key={formulation.id}
              className="hover:shadow-md transition-all"
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
                      {formulation.name}
                    </h3>
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
                      asChild
                      className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                    >
                      <Link href={`/production?formulation=${formulation.id}`}>
                        Create Production
                      </Link>
                    </Button>
                    <Button asChild>
                      <Link href={`/formulations/${formulation.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <h4 className="font-medium text-sm mb-1">Ingredients:</h4>
                  <ul className="text-sm text-muted-foreground">
                    {formulation.formulation_ingredients?.map((ing, idx) => (
                      <li key={idx}>
                        {ing.raw_materials?.name}: {ing.quantity} {ing.unit}
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

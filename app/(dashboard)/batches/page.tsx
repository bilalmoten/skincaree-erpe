"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Batch {
  id: string;
  batch_number: string;
  production_run_id: string;
  finished_product_id: string;
  quantity_produced: number;
  quantity_remaining: number;
  production_date: string;
  expiry_date: string | null;
  status: string;
  production_runs: {
    id: string;
    production_date: string;
    batch_size: number;
  };
  finished_products: {
    id: string;
    name: string;
    sku: string | null;
  };
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  const fetchBatches = async () => {
    try {
      const url =
        statusFilter !== "all"
          ? `/api/batches?status=${statusFilter}`
          : "/api/batches";
      const res = await fetch(url);
      const data = await res.json();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const getStatusVariant = (
    status: string
  ): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "active":
        return "default";
      case "expired":
        return "destructive";
      case "recalled":
        return "destructive";
      case "depleted":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-[hsl(var(--success))]";
      case "expired":
        return "bg-destructive";
      case "recalled":
        return "bg-[hsl(var(--warning))]";
      case "depleted":
        return "bg-muted";
      default:
        return "bg-primary";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Batch Tracking
        </h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="recalled">Recalled</SelectItem>
            <SelectItem value="depleted">Depleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {batches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No batches found.</p>
            </CardContent>
          </Card>
        ) : (
          batches.map((batch) => (
            <Card key={batch.id} className="hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {batch.batch_number}
                      </h3>
                      <Badge
                        className={`${getStatusColor(batch.status)} text-white`}
                      >
                        {batch.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Product: {batch.finished_products?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Produced: {batch.quantity_produced} units | Remaining:{" "}
                      {batch.quantity_remaining} units
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Production Date:{" "}
                      {format(new Date(batch.production_date), "MMM dd, yyyy")}
                    </p>
                    {batch.expiry_date && (
                      <p
                        className={`text-sm font-medium mt-1 ${
                          new Date(batch.expiry_date) < new Date()
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        Expiry Date:{" "}
                        {format(new Date(batch.expiry_date), "MMM dd, yyyy")}
                      </p>
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

'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

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
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  const fetchBatches = async () => {
    try {
      const url = statusFilter 
        ? `/api/batches?status=${statusFilter}`
        : '/api/batches';
      const res = await fetch(url);
      const data = await res.json();
      setBatches(data);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'expired':
        return 'bg-red-500';
      case 'recalled':
        return 'bg-orange-500';
      case 'depleted':
        return 'bg-gray-500';
      default:
        return 'bg-purple-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">Batch Tracking</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border-2 border-purple-200 dark:border-purple-700 rounded-lg dark:bg-purple-800 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="recalled">Recalled</option>
          <option value="depleted">Depleted</option>
        </select>
      </div>

      <div className="space-y-4">
        {batches.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-purple-900 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-800">
            <p className="text-purple-600 dark:text-purple-400">No batches found.</p>
          </div>
        ) : (
          batches.map((batch) => (
            <div key={batch.id} className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl shadow-lg p-6 hover:shadow-xl hover:border-purple-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                      {batch.batch_number}
                    </h3>
                    <span className={`px-2 py-1 rounded-lg text-white text-xs font-medium ${getStatusColor(batch.status)}`}>
                      {batch.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Product: {batch.finished_products?.name}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Produced: {batch.quantity_produced} units | Remaining: {batch.quantity_remaining} units
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Production Date: {format(new Date(batch.production_date), 'MMM dd, yyyy')}
                  </p>
                  {batch.expiry_date && (
                    <p className={`text-sm font-medium mt-1 ${
                      new Date(batch.expiry_date) < new Date() 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      Expiry Date: {format(new Date(batch.expiry_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

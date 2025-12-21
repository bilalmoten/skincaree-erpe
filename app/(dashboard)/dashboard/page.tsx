'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded p-6">
          <h3 className="text-sm text-gray-600 mb-2">Recent Revenue (30 days)</h3>
          <p className="text-3xl font-bold">PKR {dashboardData?.recentRevenue?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-white border rounded p-6">
          <h3 className="text-sm text-gray-600 mb-2">Total Customers</h3>
          <p className="text-3xl font-bold">{dashboardData?.customerCount || 0}</p>
        </div>

        <div className="bg-white border rounded p-6">
          <h3 className="text-sm text-gray-600 mb-2">Low Stock Items</h3>
          <p className="text-3xl font-bold text-red-600">{dashboardData?.lowStock?.length || 0}</p>
        </div>

        <div className="bg-white border rounded p-6">
          <h3 className="text-sm text-gray-600 mb-2">Recent Production Runs</h3>
          <p className="text-3xl font-bold">{dashboardData?.recentProduction?.length || 0}</p>
        </div>
      </div>

      {dashboardData?.lowStock && dashboardData.lowStock.length > 0 && (
        <div className="bg-white border rounded p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
          <ul className="space-y-2">
            {dashboardData.lowStock.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between">
                <span>{item.finished_products?.name}</span>
                <span className="text-red-600 font-semibold">Qty: {item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dashboardData?.recentProduction && dashboardData.recentProduction.length > 0 && (
        <div className="bg-white border rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Production Runs</h2>
          <div className="space-y-2">
            {dashboardData.recentProduction.map((run: any) => (
              <div key={run.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Batch Size: {run.batch_size}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(run.production_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/sales/new"
          className="bg-blue-600 text-white rounded p-6 text-center hover:bg-blue-700"
        >
          <h3 className="text-lg font-semibold mb-2">New Sale</h3>
          <p className="text-sm">Create a new sales transaction</p>
        </Link>

        <Link
          href="/production"
          className="bg-green-600 text-white rounded p-6 text-center hover:bg-green-700"
        >
          <h3 className="text-lg font-semibold mb-2">Production Run</h3>
          <p className="text-sm">Record a new production batch</p>
        </Link>

        <Link
          href="/reports"
          className="bg-purple-600 text-white rounded p-6 text-center hover:bg-purple-700"
        >
          <h3 className="text-lg font-semibold mb-2">View Reports</h3>
          <p className="text-sm">Generate business reports</p>
        </Link>
      </div>
    </div>
  );
}


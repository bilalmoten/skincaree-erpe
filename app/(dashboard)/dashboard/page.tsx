'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchExpiryAlerts();
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

  const fetchExpiryAlerts = async () => {
    try {
      const res = await fetch('/api/expiry-alerts?days=30');
      const data = await res.json();
      setExpiryAlerts(data);
    } catch (error) {
      console.error('Error fetching expiry alerts:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-purple-700 dark:text-purple-300">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all">
          <h3 className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-medium">Recent Revenue (30 days)</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">PKR {dashboardData?.recentRevenue?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all">
          <h3 className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-medium">Total Customers</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{dashboardData?.customerCount || 0}</p>
        </div>

        <div className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all">
          <h3 className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-medium">Low Stock Items</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{dashboardData?.lowStock?.length || 0}</p>
        </div>

        <div className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all">
          <h3 className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-medium">Recent Production Runs</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{dashboardData?.recentProduction?.length || 0}</p>
        </div>
      </div>

      {dashboardData?.lowStock && dashboardData.lowStock.length > 0 && (
        <div className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-purple-700 dark:text-purple-300">Low Stock Alert</h2>
          <ul className="space-y-2">
            {dashboardData.lowStock.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between text-gray-900 dark:text-white">
                <span>{item.finished_products?.name}</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">Qty: {item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}


      {expiryAlerts && (expiryAlerts.batches?.length > 0 || expiryAlerts.inventory?.length > 0) && (
        <div className="bg-white dark:bg-purple-900 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">Expiry Alerts (Next 30 Days)</h2>
          <ul className="space-y-2">
            {expiryAlerts.batches?.map((batch: any, idx: number) => (
              <li key={idx} className="flex justify-between text-gray-900 dark:text-white">
                <span>{batch.finished_products?.name} - Batch: {batch.batch_number}</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Expires: {format(new Date(batch.expiry_date), 'MMM dd, yyyy')}
                </span>
              </li>
            ))}
            {expiryAlerts.inventory?.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between text-gray-900 dark:text-white">
                <span>{item.finished_products?.name} - Qty: {item.quantity}</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Expires: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dashboardData?.recentProduction && dashboardData.recentProduction.length > 0 && (
        <div className="bg-white dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-purple-700 dark:text-purple-300">Recent Production Runs</h2>
          <div className="space-y-2">
            {dashboardData.recentProduction.map((run: any) => (
              <div key={run.id} className="flex justify-between items-center border-b border-purple-200 dark:border-purple-800 pb-2">
                <div>
                  <p className="font-medium text-purple-700 dark:text-purple-300">
                    {run.formulations?.name || 'Unknown'} - Batch Size: {run.batch_size} {run.formulations?.batch_unit || 'kg'}
                    {run.batch_number && <span className="text-sm text-purple-600 dark:text-purple-400 ml-2">({run.batch_number})</span>}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {format(new Date(run.production_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/sales/new"
          className="bg-purple-600 text-white rounded-xl p-6 text-center hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <h3 className="text-lg font-semibold mb-2">New Sale</h3>
          <p className="text-sm opacity-90">Create a new sales transaction</p>
        </Link>

        <Link
          href="/production"
          className="bg-green-500 text-white rounded-xl p-6 text-center hover:bg-green-600 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <h3 className="text-lg font-semibold mb-2">Production Run</h3>
          <p className="text-sm opacity-90">Record a new production batch</p>
        </Link>

        <Link
          href="/reports"
          className="bg-purple-600 text-white rounded-xl p-6 text-center hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
        >
          <h3 className="text-lg font-semibold mb-2">View Reports</h3>
          <p className="text-sm opacity-90">Generate business reports</p>
        </Link>
      </div>
    </div>
  );
}


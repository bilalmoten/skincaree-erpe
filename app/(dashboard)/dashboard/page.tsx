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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Overview of your business operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Revenue</h3>
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400">💰</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">PKR {dashboardData?.recentRevenue?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</h3>
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400">👥</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{dashboardData?.customerCount || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active customers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</h3>
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400">⚠️</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{dashboardData?.lowStock?.length || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Needs attention</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Production Runs</h3>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400">🏭</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{dashboardData?.recentProduction?.length || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Recent batches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Production Runs */}
          {dashboardData?.recentProduction && dashboardData.recentProduction.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Production Runs</h2>
                <Link href="/production" className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">
                  See All
                </Link>
              </div>
              <div className="space-y-4">
                {dashboardData.recentProduction.slice(0, 5).map((run: any) => (
                  <div key={run.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-muted)] dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <span className="text-purple-600 dark:text-purple-400 text-xl">🏭</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {run.formulations?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(run.production_date), 'MMM dd, yyyy')} • Batch: {run.batch_size} {run.formulations?.batch_unit || 'kg'}
                        </p>
                      </div>
                    </div>
                    {run.batch_number && (
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {run.batch_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Alert */}
          {dashboardData?.lowStock && dashboardData.lowStock.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400">⚠️</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Low Stock Alert</h2>
              </div>
              <div className="space-y-3">
                {dashboardData.lowStock.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10">
                    <span className="font-medium text-gray-900 dark:text-white">{item.finished_products?.name}</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Expiry Alerts */}
          {expiryAlerts && (expiryAlerts.batches?.length > 0 || expiryAlerts.inventory?.length > 0) && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400">⏰</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expiry Alerts</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Next 30 days</p>
              <div className="space-y-3">
                {expiryAlerts.batches?.slice(0, 3).map((batch: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{batch.finished_products?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Batch: {batch.batch_number}</p>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Expires: {format(new Date(batch.expiry_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                ))}
                {expiryAlerts.inventory?.slice(0, 2).map((item: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{item.finished_products?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Qty: {item.quantity}</p>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Expires: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/sales/new"
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <span>💰</span>
                </div>
                <div>
                  <p className="font-semibold">New Sale</p>
                  <p className="text-xs text-white/80">Create transaction</p>
                </div>
              </Link>
              <Link
                href="/production"
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <span>🏭</span>
                </div>
                <div>
                  <p className="font-semibold">Production Run</p>
                  <p className="text-xs text-white/80">Record batch</p>
                </div>
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <span>📊</span>
                </div>
                <div>
                  <p className="font-semibold">View Reports</p>
                  <p className="text-xs text-white/80">Analytics</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

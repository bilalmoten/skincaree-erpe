'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-all border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Inventory Valuation</h3>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary">💎</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">PKR {dashboardData?.valuations?.totalValuation?.toLocaleString() || '0'}</p>
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-[10px] text-muted-foreground flex justify-between">
                <span>Materials:</span>
                <span>PKR {dashboardData?.valuations?.rawMaterials?.toLocaleString() || '0'}</span>
              </p>
              <p className="text-[10px] text-muted-foreground flex justify-between">
                <span>Products:</span>
                <span>PKR {dashboardData?.valuations?.finishedProducts?.toLocaleString() || '0'}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Recent Revenue</h3>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary">💰</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">PKR {dashboardData?.recentRevenue?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <span className="text-[hsl(var(--info))]">👥</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{dashboardData?.customerCount || 0}</p>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Low Stock Items</h3>
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive">⚠️</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-destructive mb-1">{dashboardData?.lowStock?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Production Runs */}
          {dashboardData?.recentProduction && dashboardData.recentProduction.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Production Runs</CardTitle>
                  <Link href="/production" className="text-sm text-primary hover:underline font-medium">
                    See All
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentProduction.slice(0, 5).map((run: any) => (
                    <div key={run.id} className="flex items-center justify-between p-4 rounded-xl bg-muted hover:bg-accent transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-xl">🏭</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {run.formulations?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(run.production_date), 'MMM dd, yyyy')} • Batch: {run.batch_size} {run.formulations?.batch_unit || 'kg'}
                          </p>
                        </div>
                      </div>
                      {run.batch_number && (
                        <Badge variant="secondary">{run.batch_number}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alert */}
          {dashboardData?.lowStock && dashboardData.lowStock.length > 0 && (
            <Card className="border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive">⚠️</span>
                  </div>
                  <CardTitle>Low Stock Alert</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.lowStock.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                      <span className="font-medium text-foreground">{item.finished_products?.name}</span>
                      <span className="text-sm font-semibold text-destructive">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Expiry Alerts */}
          {expiryAlerts && (expiryAlerts.batches?.length > 0 || expiryAlerts.inventory?.length > 0) && (
            <Card className="border-[hsl(var(--warning))]/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[hsl(var(--warning))]/10 flex items-center justify-center">
                    <span className="text-[hsl(var(--warning))]">⏰</span>
                  </div>
                  <CardTitle>Expiry Alerts</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Next 30 days</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expiryAlerts.batches?.slice(0, 3).map((batch: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-[hsl(var(--warning))]/5">
                      <p className="text-sm font-medium text-foreground mb-1">{batch.finished_products?.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">Batch: {batch.batch_number}</p>
                      <p className="text-xs font-semibold text-[hsl(var(--warning))]">
                        Expires: {format(new Date(batch.expiry_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                  {expiryAlerts.inventory?.slice(0, 2).map((item: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-[hsl(var(--warning))]/5">
                      <p className="text-sm font-medium text-foreground mb-1">{item.finished_products?.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">Qty: {item.quantity}</p>
                      <p className="text-xs font-semibold text-[hsl(var(--warning))]">
                        Expires: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90">
                  <Link href="/sales/new" className="flex items-center gap-3">
                    <span>💰</span>
                    <div className="text-left">
                      <p className="font-semibold">New Sale</p>
                      <p className="text-xs opacity-80">Create transaction</p>
                    </div>
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90">
                  <Link href="/production" className="flex items-center gap-3">
                    <span>🏭</span>
                    <div className="text-left">
                      <p className="font-semibold">Production Run</p>
                      <p className="text-xs opacity-80">Record batch</p>
                    </div>
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-[hsl(var(--info))] hover:bg-[hsl(var(--info))]/90">
                  <Link href="/reports" className="flex items-center gap-3">
                    <span>📊</span>
                    <div className="text-left">
                      <p className="font-semibold">View Reports</p>
                      <p className="text-xs opacity-80">Analytics</p>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

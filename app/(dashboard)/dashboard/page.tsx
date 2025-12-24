'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Gem,
  DollarSign,
  Users,
  AlertTriangle,
  Factory,
  Clock,
  TrendingUp,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Gem className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                PKR {dashboardData?.valuations?.totalValuation?.toLocaleString() || '0'}
              </p>
              <p className="text-sm font-medium text-muted-foreground">Inventory Valuation</p>
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Materials:</span>
                  <span className="font-medium">PKR {dashboardData?.valuations?.rawMaterials?.toLocaleString() || '0'}</span>
                </p>
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Products:</span>
                  <span className="font-medium">PKR {dashboardData?.valuations?.finishedProducts?.toLocaleString() || '0'}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">
                PKR {dashboardData?.recentRevenue?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm font-medium text-muted-foreground">Recent Revenue</p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-info">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-info/10">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{dashboardData?.customerCount || 0}</p>
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <p className="text-xs text-muted-foreground">Active customers</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all border-l-4 border-l-destructive">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-destructive">{dashboardData?.lowStock?.length || 0}</p>
              <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </div>
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
                  <CardTitle className="text-xl font-semibold">Recent Production Runs</CardTitle>
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
                          <Factory className="h-6 w-6 text-primary" />
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
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Low Stock Alert</CardTitle>
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
                    <Clock className="h-5 w-5 text-[hsl(var(--warning))]" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Expiry Alerts</CardTitle>
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
              <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <Link href="/sales/new">
                  <Card className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">New Sale</p>
                          <p className="text-xs text-muted-foreground">Create transaction</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/production">
                  <Card className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-success">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                          <Factory className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Production Run</p>
                          <p className="text-xs text-muted-foreground">Record batch</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/reports">
                  <Card className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-info">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-info/10 group-hover:bg-info/20 transition-colors">
                          <BarChart3 className="h-5 w-5 text-info" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">View Reports</p>
                          <p className="text-xs text-muted-foreground">Analytics</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

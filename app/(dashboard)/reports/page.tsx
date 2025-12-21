'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'production'>('sales');
  const [dateRange, setDateRange] = useState({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [salesData, setSalesData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [productionData, setProductionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      const res = await fetch(`/api/reports/sales?${params}`);
      const data = await res.json();
      setSalesData(data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/inventory');
      const data = await res.json();
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      const res = await fetch(`/api/reports/production?${params}`);
      const data = await res.json();
      setProductionData(data);
    } catch (error) {
      console.error('Error fetching production report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'sales' | 'inventory' | 'production') => {
    setActiveTab(tab);
    if (tab === 'sales' && !salesData) fetchSalesReport();
    if (tab === 'inventory' && !inventoryData) fetchInventoryReport();
    if (tab === 'production' && !productionData) fetchProductionReport();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>

      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => handleTabChange('sales')}
          className={`px-4 py-2 ${activeTab === 'sales' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
        >
          Sales
        </button>
        <button
          onClick={() => handleTabChange('inventory')}
          className={`px-4 py-2 ${activeTab === 'inventory' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
        >
          Inventory
        </button>
        <button
          onClick={() => handleTabChange('production')}
          className={`px-4 py-2 ${activeTab === 'production' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}
        >
          Production
        </button>
      </div>

      {activeTab === 'sales' && (
        <div>
          <div className="flex gap-4 mb-4">
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <button
              onClick={fetchSalesReport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : salesData ? (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Sales</h3>
                  <p className="text-2xl font-bold">{salesData.summary.totalSales}</p>
                </div>
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Revenue</h3>
                  <p className="text-2xl font-bold">PKR {salesData.summary.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Items Sold</h3>
                  <p className="text-2xl font-bold">{salesData.summary.totalItems}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Click "Generate Report" to view sales report</div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <button
            onClick={fetchInventoryReport}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate Report
          </button>

          {loading ? (
            <div>Loading...</div>
          ) : inventoryData ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Raw Materials Value</h3>
                  <p className="text-2xl font-bold">PKR {inventoryData.summary.rawMaterialsValue.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{inventoryData.summary.rawMaterialsCount} materials</p>
                </div>
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Finished Products Value</h3>
                  <p className="text-2xl font-bold">PKR {inventoryData.summary.finishedProductsValue.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{inventoryData.summary.finishedProductsCount} products</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Click "Generate Report" to view inventory report</div>
          )}
        </div>
      )}

      {activeTab === 'production' && (
        <div>
          <div className="flex gap-4 mb-4">
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="border rounded px-3 py-2"
            />
            <button
              onClick={fetchProductionReport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : productionData ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Production Runs</h3>
                  <p className="text-2xl font-bold">{productionData.summary.totalRuns}</p>
                </div>
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Batch Size</h3>
                  <p className="text-2xl font-bold">{productionData.summary.totalBatchSize.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Click "Generate Report" to view production report</div>
          )}
        </div>
      )}
    </div>
  );
}


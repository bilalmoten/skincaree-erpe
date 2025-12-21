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
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Reports</h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange('sales')}
          className={`px-4 py-2 transition-colors ${
            activeTab === 'sales' 
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' 
              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          Sales
        </button>
        <button
          onClick={() => handleTabChange('inventory')}
          className={`px-4 py-2 transition-colors ${
            activeTab === 'inventory' 
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' 
              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => handleTabChange('production')}
          className={`px-4 py-2 transition-colors ${
            activeTab === 'production' 
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-semibold' 
              : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          }`}
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
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          ) : salesData ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Sales</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{salesData.summary.totalSales}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Revenue</h3>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">PKR {salesData.summary.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Items Sold</h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{salesData.summary.totalItems}</p>
                </div>
              </div>

              {salesData.byProduct && salesData.byProduct.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Sales by Product</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Product</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.byProduct.map((product: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-[var(--surface-muted)] dark:hover:bg-gray-700">
                            <td className="py-3 px-4 text-gray-900 dark:text-white">{product.name}</td>
                            <td className="text-right py-3 px-4 text-gray-900 dark:text-white">{product.quantity}</td>
                            <td className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">PKR {product.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {salesData.byCustomer && salesData.byCustomer.length > 0 && (
                <div className="bg-white border rounded p-4">
                  <h3 className="text-lg font-semibold mb-4">Sales by Customer</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Customer</th>
                          <th className="text-right py-2">Sales Count</th>
                          <th className="text-right py-2">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.byCustomer.map((customer: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2">{customer.name}</td>
                            <td className="text-right py-2">{customer.sales}</td>
                            <td className="text-right py-2">PKR {customer.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Click "Generate Report" to view sales report</div>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={fetchInventoryReport}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Generate Report
            </button>
            {inventoryData && (
              <button
                onClick={async () => {
                  try {
                    const { generateReportPDF } = await import('@/lib/pdf/utils');
                    const doc = generateReportPDF('Inventory Report', inventoryData, 'inventory');
                    doc.save('inventory-report.pdf');
                  } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('Failed to generate PDF');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Export PDF
              </button>
            )}
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : inventoryData ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Inventory Value</h3>
                  <p className="text-2xl font-bold">PKR {inventoryData.summary.totalInventoryValue?.toFixed(2) || (inventoryData.summary.rawMaterialsValue + inventoryData.summary.finishedProductsValue).toFixed(2)}</p>
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
            {productionData && (
              <button
                onClick={async () => {
                  try {
                    const { generateReportPDF } = await import('@/lib/pdf/utils');
                    const doc = generateReportPDF('Production Report', productionData, 'production');
                    doc.save('production-report.pdf');
                  } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('Failed to generate PDF');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Export PDF
              </button>
            )}
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : productionData ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Production Runs</h3>
                  <p className="text-2xl font-bold">{productionData.summary.totalRuns}</p>
                </div>
                <div className="bg-white border rounded p-4">
                  <h3 className="text-sm text-gray-600">Total Batch Size</h3>
                  <p className="text-2xl font-bold">{productionData.summary.totalBatchSize.toFixed(2)}</p>
                </div>
              </div>

              {productionData.byFormulation && productionData.byFormulation.length > 0 && (
                <div className="bg-white border rounded p-4">
                  <h3 className="text-lg font-semibold mb-4">Production by Formulation</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Formulation</th>
                          <th className="text-right py-2">Runs</th>
                          <th className="text-right py-2">Total Batch Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productionData.byFormulation.map((formulation: any, idx: number) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2">{formulation.name}</td>
                            <td className="text-right py-2">{formulation.runs}</td>
                            <td className="text-right py-2">{formulation.totalBatchSize.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Click "Generate Report" to view production report</div>
          )}
        </div>
      )}
    </div>
  );
}

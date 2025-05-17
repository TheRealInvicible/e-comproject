'use client';

import { useState, useEffect } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { RevenueChart } from './RevenueChart';
import { CategoryPerformance } from './CategoryPerformance';
import { PaymentMethodChart } from './PaymentMethodChart';
import { CustomerAcquisition } from './CustomerAcquisition';
import { exportToExcel, exportToCsv, exportToPdf } from '@/lib/exportData';
import { Button } from '@/components/ui/Button';
import { Download, RefreshCw } from 'lucide-react';
import { subscribeToOrders } from '@/lib/websocket';
import toast from 'react-hot-toast';

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)), // First day of current month
    to: new Date()
  });
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        \`/api/dashboard/analytics?\${new URLSearchParams({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString()
        })}\`
      );
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    // Subscribe to real-time order updates
    const unsubscribe = subscribeToOrders((payload) => {
      toast.success('New order received');
      fetchData(); // Refresh data
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    if (!data) return;

    const exportData = {
      dailyStats: data.dailyStats,
      categoryStats: data.categoryStats,
      paymentMethods: data.paymentMethods
    };

    switch (format) {
      case 'excel':
        exportToExcel(exportData.dailyStats, 'analytics-report');
        break;
      case 'csv':
        exportToCsv(exportData.dailyStats, 'analytics-report');
        break;
      case 'pdf':
        exportToPdf(exportData.dailyStats, 'Analytics Report');
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onChange={({ from, to }) => setDateRange({ from, to })}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchData()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <div className="relative">
              <Button
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <button
                    onClick={() => handleExport('excel')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Export to Excel
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Export to CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Export to PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-6">Revenue Trend</h3>
          <RevenueChart
            data={data?.dailyStats || []}
            isLoading={isLoading}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-6">Category Performance</h3>
          <CategoryPerformance
            data={data?.categoryStats || []}
            isLoading={isLoading}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-6">Payment Methods</h3>
          <PaymentMethodChart
            data={data?.paymentMethods || []}
            isLoading={isLoading}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-6">Customer Acquisition</h3>
          <CustomerAcquisition
            data={data?.customerAcquisition || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
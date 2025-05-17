'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { formatCurrency } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CategoryPerformanceProps {
  data: Array<{
    name: string;
    totalSales: number;
    totalOrders: number;
  }>;
  isLoading: boolean;
}

export function CategoryPerformance({ data, isLoading }: CategoryPerformanceProps) {
  const chartData = useMemo(() => ({
    labels: data.map(item => item.name),
    datasets: [
      {
        label: 'Sales',
        data: data.map(item => item.totalSales),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Orders',
        data: data.map(item => item.totalOrders),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        yAxisID: 'y1',
      }
    ],
  }), [data]);

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return \`Sales: \${formatCurrency(context.raw)}\`;
            }
            return \`Orders: \${context.raw}\`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (isLoading) {
    return <div className="h-[400px] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-[400px]">
      <Bar options={options} data={chartData} />
    </div>
  );
}
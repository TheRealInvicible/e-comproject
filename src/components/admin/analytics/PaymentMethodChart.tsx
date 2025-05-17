'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { formatCurrency } from '@/lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PaymentMethodChartProps {
  data: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  isLoading: boolean;
}

export function PaymentMethodChart({ data, isLoading }: PaymentMethodChartProps) {
  const chartData = useMemo(() => ({
    labels: data.map(item => item.method),
    datasets: [
      {
        data: data.map(item => item.total),
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(249, 115, 22, 0.5)',
          'rgba(139, 92, 246, 0.5)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(249, 115, 22)',
          'rgb(139, 92, 246)',
        ],
        borderWidth: 1,
      },
    ],
  }), [data]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return \`\${label}: \${formatCurrency(value)} (\${percentage}%)\`;
          }
        }
      }
    },
  };

  if (isLoading) {
    return <div className="h-[400px] flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-[400px]">
      <Doughnut options={options} data={chartData} />
    </div>
  );
}
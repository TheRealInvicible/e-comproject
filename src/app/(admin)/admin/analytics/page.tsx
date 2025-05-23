import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Analytics
          </h2>
        </div>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
import React from 'react';
import { useRetentionAnalytics } from '@/lib/hooks/use-admin-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function RetentionTable() {
  const { data, isLoading, error } = useRetentionAnalytics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Retention</CardTitle>
          <CardDescription>Cohort analysis of user engagement over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load retention data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const cohorts = data || [];

  // Find the maximum number of months to display
  const maxMonths = cohorts.reduce((max, cohort) => {
    return Math.max(max, cohort.retention.length);
  }, 0);

  // Helper to get color intensity based on percentage
  const getBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500 text-white';
    if (percentage >= 60) return 'bg-green-400 text-white';
    if (percentage >= 40) return 'bg-green-300 text-black';
    if (percentage >= 20) return 'bg-green-200 text-black';
    if (percentage > 0) return 'bg-green-100 text-black';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>User Retention (Cohort Analysis)</CardTitle>
        <CardDescription>
          Percentage of users who return to the app in subsequent months after registration.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[800px]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-2 font-medium text-muted-foreground w-32">Cohort</th>
                <th className="py-2 px-2 font-medium text-muted-foreground w-24">Users</th>
                {Array.from({ length: maxMonths }).map((_, i) => (
                  <th key={i} className="py-2 px-2 font-medium text-muted-foreground text-center w-16">
                    {i === 0 ? 'Month 0' : `+${i}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.month} className="border-b last:border-0 hover:bg-muted dark:bg-gray-900/50">
                  <td className="py-2 px-2 font-medium">{cohort.month}</td>
                  <td className="py-2 px-2 text-muted-foreground">{cohort.size}</td>
                  {Array.from({ length: maxMonths }).map((_, i) => {
                    const retentionData = cohort.retention.find((r) => r.month_offset === i);
                    
                    if (!retentionData) {
                      return <td key={i} className="py-2 px-2"></td>;
                    }

                    return (
                      <td key={i} className="py-1 px-1">
                        <div 
                          className={`w-full h-8 flex items-center justify-center rounded text-xs font-medium ${getBgColor(retentionData.percentage)}`}
                          title={`${retentionData.count} users (${retentionData.percentage}%)`}
                        >
                          {retentionData.percentage}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {cohorts.length === 0 && (
                <tr>
                  <td colSpan={maxMonths + 2} className="py-8 text-center text-muted-foreground">
                    No retention data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

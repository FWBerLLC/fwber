'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface FailedJob {
  id: number;
  uuid: string;
  connection: string;
  queue: string;
  payload: string;
  exception: string;
  failed_at: string;
}

interface FailedJobsResponse {
  data: FailedJob[];
  current_page: number;
  last_page: number;
  total: number;
}

export default function FailedJobsTable() {
  const [jobs, setJobs] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get<FailedJobsResponse>('/analytics/failed-jobs');
      setJobs(response.data || []);
    } catch (err) {
      console.error('Failed to fetch failed jobs:', err);
      setError('Failed to load failed jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRetry = async (uuid: string) => {
    try {
      setProcessing(uuid);
      await api.post(`/analytics/failed-jobs/${uuid}/retry`);
      setSuccess('Job queued for retry.');
      await fetchJobs();
    } catch (err) {
      console.error('Retry failed:', err);
      setError('Failed to retry job.');
    } finally {
      setProcessing(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this failed job?')) return;
    
    try {
      setProcessing(uuid);
      await api.delete(`/analytics/failed-jobs/${uuid}`);
      setSuccess('Job deleted.');
      await fetchJobs();
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete job.');
    } finally {
      setProcessing(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleRetryAll = async () => {
    if (!confirm('Are you sure you want to retry ALL failed jobs?')) return;

    try {
      setProcessing('all');
      await api.post('/analytics/failed-jobs/retry-all');
      setSuccess('All jobs queued for retry.');
      await fetchJobs();
    } catch (err) {
      console.error('Retry all failed:', err);
      setError('Failed to retry all jobs.');
    } finally {
      setProcessing(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleFlush = async () => {
    if (!confirm('Are you sure you want to DELETE ALL failed jobs? This cannot be undone.')) return;

    try {
      setProcessing('flush');
      await api.post('/analytics/failed-jobs/flush');
      setSuccess('All failed jobs flushed.');
      await fetchJobs();
    } catch (err) {
      console.error('Flush failed:', err);
      setError('Failed to flush jobs.');
    } finally {
      setProcessing(null);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">⚠️ Failed Jobs</h2>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted dark:bg-card" />
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">⚠️ Failed Jobs</h2>
          <button type="button" onClick={fetchJobs} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
          <p className="text-foreground dark:text-foreground font-medium">All systems operational</p>
          <p className="text-sm text-muted-foreground">No failed jobs detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card dark:bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground">⚠️ Failed Jobs</h2>
          <p className="text-sm text-muted-foreground">{jobs.length} jobs require attention</p>
        </div>
        <div className="flex gap-2">
          <button type="button"
            onClick={handleRetryAll}
            disabled={!!processing}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processing === 'all' ? 'animate-spin' : ''}`} />
            Retry All
          </button>
          <button type="button"
            onClick={handleFlush}
            disabled={!!processing}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Flush All
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-muted dark:bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job / Queue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Exception</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-card dark:bg-card divide-y divide-gray-200">
            {jobs.map((job) => {
              // Parse payload to get job name if possible
              let jobName = 'Unknown Job';
              try {
                const payloadObj = JSON.parse(job.payload);
                jobName = payloadObj.displayName || payloadObj.job || 'Unknown Job';
              } catch (e) {}

              return (
                <tr key={job.uuid} className="hover:bg-muted dark:bg-background">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground dark:text-foreground truncate max-w-xs" title={jobName}>
                      {jobName}
                    </div>
                    <div className="text-xs text-muted-foreground">{job.queue}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(job.failed_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-red-600 font-mono truncate max-w-xs" title={job.exception}>
                      {job.exception.substring(0, 100)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button"
                      onClick={() => handleRetry(job.uuid)}
                      disabled={!!processing}
                      className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50"
                      title="Retry"
                    >
                      <RefreshCw className={`h-4 w-4 ${processing === job.uuid ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button"
                      onClick={() => handleDelete(job.uuid)}
                      disabled={!!processing}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

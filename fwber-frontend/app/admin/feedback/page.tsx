'use client';

import { useState } from 'react';
import { useFeedback, FeedbackItem } from '@/lib/hooks/use-feedback';
import { format } from 'date-fns';
import { Loader2, CheckCircle, XCircle, AlertCircle, MessageSquare, Sparkles, Shield, Brain } from 'lucide-react';

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, updateStatus } = useFeedback(page);

  const handleStatusUpdate = (id: number, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      case 'neutral': return 'bg-muted text-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'feature': return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'safety': return <Shield className="w-4 h-4 text-orange-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">User Feedback</h1>
          <p className="text-muted-foreground">Manage bug reports, feature requests, and general feedback.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card dark:bg-card rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted dark:bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Analysis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card dark:bg-card divide-y divide-gray-200">
              {(data?.data || []).map((item: FeedbackItem) => (
                <tr key={item.id} className="hover:bg-muted dark:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground dark:text-foreground">
                      {item.user ? item.user.name : 'Anonymous'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.user ? item.user.email : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted dark:bg-card text-foreground dark:text-foreground capitalize">
                      {/* Icon placeholder - need to import Sparkles/Shield if used */}
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground dark:text-foreground max-w-md truncate" title={item.message}>
                      {item.message}
                    </div>
                    {item.page_url && (
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                        {item.page_url}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.is_analyzed ? (
                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSentimentColor(item.sentiment)} capitalize`}>
                          {item.sentiment || 'Unknown'}
                        </span>
                        {item.ai_analysis && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground max-w-xs">
                            <Brain className="w-3 h-3 mt-0.5 flex-shrink-0 text-purple-500" />
                            <span className="line-clamp-2" title={item.ai_analysis}>
                              {item.ai_analysis}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pending analysis...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {item.status !== 'resolved' && (
                        <button type="button"
                          onClick={() => handleStatusUpdate(item.id, 'resolved')}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Resolved"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {item.status !== 'dismissed' && (
                        <button type="button"
                          onClick={() => handleStatusUpdate(item.id, 'dismissed')}
                          className="text-muted-foreground hover:text-muted-foreground"
                          title="Dismiss"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="bg-card dark:bg-card px-4 py-3 flex items-center justify-between border-t border-border dark:border-border sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-border dark:border-border text-sm font-medium rounded-md text-foreground dark:text-muted-foreground bg-card dark:bg-card hover:bg-muted dark:bg-background disabled:opacity-50"
              >
                Previous
              </button>
              <button type="button"
                onClick={() => setPage(p => p + 1)}
                disabled={page === (data?.last_page || 1)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-border dark:border-border text-sm font-medium rounded-md text-foreground dark:text-muted-foreground bg-card dark:bg-card hover:bg-muted dark:bg-background disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-foreground dark:text-muted-foreground">
                  Showing page <span className="font-medium">{data?.current_page}</span> of <span className="font-medium">{data?.last_page}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border dark:border-border bg-card dark:bg-card text-sm font-medium text-muted-foreground hover:bg-muted dark:bg-background disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button type="button"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === (data?.last_page || 1)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border dark:border-border bg-card dark:bg-card text-sm font-medium text-muted-foreground hover:bg-muted dark:bg-background disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

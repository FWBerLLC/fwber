'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ShieldAlert, FileText, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ReportRecord {
  id: number | string;
  accused_user_id?: number;
  accused_name?: string;
  reason: string;
  details?: string | null;
  status: string;
  resolution_notes?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface UserSearchResult {
  id: number;
  name: string;
  display_name?: string;
}

const REPORT_REASONS = [
  'Harassment or abusive behavior',
  'Fake profile or impersonation',
  'Spam, scam, or solicitation',
  'Non-consensual or inappropriate content',
  'In-person safety concern',
  'Other community guideline violation',
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileOpen, setFileOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);

  // New report form state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [accusedId, setAccusedId] = useState('');
  const [accusedLabel, setAccusedLabel] = useState('');
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<ReportRecord[] | { reports: ReportRecord[] }>('/reports');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.reports) ? data.reports : []);
      setReports(list);
    } catch (e: any) {
      toast.error(e.message || 'Error loading reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<UserSearchResult[]>('/user/search', { params: { q: trimmed, limit: 6 } });
        setSearchResults(Array.isArray(res) ? res : []);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFileReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accusedId.trim() || !/^\d+$/.test(accusedId.trim())) {
      toast.error('Please select a user or enter a valid numeric User ID');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        accused_id: Number(accusedId.trim()),
        reason,
        details: details.trim() || undefined,
      });
      toast.success('Safety report submitted to moderation');
      setFileOpen(false);
      setAccusedId('');
      setAccusedLabel('');
      setSearchQuery('');
      setDetails('');
      await fetchReports();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit safety report');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    const normalized = (status || 'open').toLowerCase();
    if (normalized === 'resolved') return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300';
    if (normalized === 'pending' || normalized === 'open') return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300';
    return 'bg-muted text-foreground';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppHeader title="Safety Reports" />

        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-primary" />
              My Reports
            </h1>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setFileOpen(true)}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> File New Report
            </Button>
          </div>

          <Card className="bg-card shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Safety Center
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Track the status and moderator resolution notes for reports you have filed.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                We take community safety seriously. File a confidential report or review updates on your submitted cases below.
              </CardDescription>
            </CardHeader>
          </Card>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center p-12 bg-muted rounded-lg border border-border">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No reports filed</h3>
              <p className="text-muted-foreground mb-4">You have not submitted any moderation reports.</p>
              <Button type="button" variant="outline" onClick={() => setFileOpen(true)}>
                Submit a Safety Report
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const reportCode = String(report.id).slice(0, 8);
                const filedDate = report.created_at || report.createdAt;
                return (
                  <Card key={String(report.id)} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">Report #{reportCode}</h3>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadgeClass(report.status)}`}>
                            {String(report.status || 'OPEN').toUpperCase()}
                          </span>
                          {report.accused_name && (
                            <span className="text-xs text-muted-foreground">
                              • Account: {report.accused_name}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-1">
                          <span className="font-semibold text-foreground">Reason:</span> {report.reason}
                        </p>
                        {filedDate && (
                          <p className="text-muted-foreground text-xs">
                            Filed on: {new Date(filedDate).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* File New Report Modal */}
        <Dialog open={fileOpen} onOpenChange={setFileOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>File Confidential Safety Report</DialogTitle>
              <DialogDescription>
                Search for a member by name or enter their User ID. Reports are reviewed strictly by FWBer Trust &amp; Safety moderators.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFileReport} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-foreground mb-1">Search Member (optional)</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type a display name to look up..."
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-foreground"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1.5 rounded-lg border border-border bg-card divide-y divide-border max-h-40 overflow-y-auto">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setAccusedId(String(u.id));
                          setAccusedLabel(u.display_name || u.name);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between items-center text-xs"
                      >
                        <span className="font-medium text-foreground">{u.display_name || u.name}</span>
                        <span className="text-muted-foreground">ID #{u.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="report-user-id" className="block font-medium text-foreground mb-1">
                  Reported User ID {accusedLabel ? `(${accusedLabel})` : ''}
                </label>
                <input
                  id="report-user-id"
                  type="number"
                  min={1}
                  required
                  value={accusedId}
                  onChange={(e) => setAccusedId(e.target.value)}
                  placeholder="Numeric User ID (e.g. 42)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label htmlFor="report-reason" className="block font-medium text-foreground mb-1">
                  Reason
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-details" className="block font-medium text-foreground mb-1">
                  Incident Details
                </label>
                <textarea
                  id="report-details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe what happened, approximate time, and any relevant context..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground resize-none"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setFileOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Details Modal */}
        <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report #{selectedReport ? String(selectedReport.id).slice(0, 8) : ''}</DialogTitle>
              <DialogDescription>Moderation case summary and status.</DialogDescription>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadgeClass(selectedReport.status)}`}>
                    {String(selectedReport.status || 'OPEN').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">Reported Account</span>
                  <span className="font-medium text-foreground">
                    {selectedReport.accused_name || `User #${selectedReport.accused_user_id || 'Unknown'}`}
                  </span>
                </div>
                <div className="py-2 border-b border-border">
                  <span className="text-muted-foreground block mb-1">Reason</span>
                  <p className="font-medium text-foreground">{selectedReport.reason}</p>
                </div>
                <div className="py-2 border-b border-border">
                  <span className="text-muted-foreground block mb-1">Submitted Details</span>
                  <p className="text-foreground whitespace-pre-wrap">
                    {selectedReport.details || 'No additional written details provided.'}
                  </p>
                </div>
                {selectedReport.resolution_notes && (
                  <div className="py-2 border-b border-border">
                    <span className="text-muted-foreground block mb-1">Moderator Resolution Notes</span>
                    <p className="text-foreground">{selectedReport.resolution_notes}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-1">
                  Filed: {new Date(selectedReport.created_at || selectedReport.createdAt || Date.now()).toLocaleString()}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

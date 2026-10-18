'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api as apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface LogFile {
  name: string;
  size: number;
  updated_at: string;
}

interface LogContent {
  filename: string;
  content: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<LogFile[]>('/admin/logs');
      setLogs(data);
      setSelectedLog(prev => {
        if (data.length > 0 && !prev) {
          return data[0].name;
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogContent = async (filename: string) => {
    setLoadingContent(true);
    try {
      const data = await apiClient.get<LogContent>(`/admin/logs/${filename}`);
      setLogContent(data.content);
    } catch (error) {
      console.error(`Failed to fetch content for ${filename}:`, error);
      setLogContent('Failed to load log content.');
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (selectedLog) {
      fetchLogContent(selectedLog);
    }
  }, [selectedLog]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
      {/* Sidebar: Log List */}
      <Card className="md:col-span-1 flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Log Files</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="flex flex-col p-2 gap-1">
              {(logs || []).map((log) => (
                <Button
                  key={log.name}
                  variant={selectedLog === log.name ? 'secondary' : 'ghost'}
                  className="justify-start h-auto py-3 px-4 w-full text-left"
                  onClick={() => setSelectedLog(log.name)}
                >
                  <div className="flex flex-col w-full gap-1">
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{log.name}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatSize(log.size)}</span>
                      <span>{format(new Date(log.updated_at), 'MMM d, HH:mm')}</span>
                    </div>
                  </div>
                </Button>
              ))}
              {logs.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No logs found.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Content: Log Viewer */}
      <Card className="md:col-span-3 flex flex-col h-full">
        <CardHeader className="pb-3 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-mono">
              {selectedLog || 'Select a log file'}
            </CardTitle>
            {selectedLog && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectedLog && fetchLogContent(selectedLog)}
                  disabled={loadingContent}
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${loadingContent ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 bg-slate-950 text-slate-50 font-mono text-xs">
          <ScrollArea className="h-full w-full">
            <div className="p-4 whitespace-pre-wrap break-all">
              {loadingContent ? (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  Loading content...
                </div>
              ) : logContent ? (
                logContent
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  Select a file to view its content.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

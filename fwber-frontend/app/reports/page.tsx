'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ShieldAlert, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await fetch('/api/reports');
                if (!res.ok) throw new Error('Failed to fetch reports');
                const data = await res.json();
                setReports(data.reports || []);
            } catch (e: any) {
                toast.error(e.message || 'Error loading reports');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="w-8 h-8 text-primary" />
                    My Reports
                </h1>
                <Button variant="destructive">File New Report</Button>
            </div>

            <Card className="bg-card shadow-sm border border-border mb-8">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        Safety Center
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Track the status of reports you have filed against other users or content.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        We take your safety seriously. Review the status of your submitted reports here.
                    </CardDescription>
                </CardHeader>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : reports.length === 0 ? (
                <div className="text-center p-12 bg-muted rounded-lg border border-border">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No reports filed</h3>
                    <p className="text-muted-foreground">You have not submitted any moderation reports.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {(reports || []).map((report) => (
                        <Card key={report.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 flex flex-col md:flex-row gap-4 justify-between md:items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-lg">Report #{report.id.substring(0, 8)}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            report.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                            report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                            'bg-muted text-foreground'
                                        }`}>
                                            {report.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-sm mb-1"><span className="font-semibold">Reason:</span> {report.reason}</p>
                                    <p className="text-muted-foreground text-xs">Filed on: {new Date(report.createdAt).toLocaleDateString()}</p>
                                </div>
                                <Button variant="outline" size="sm">View Details</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Link as LinkIcon, Trash2, Shield, Plus, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function BurnerLinksPage() {
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLinks = async () => {
            try {
                const res = await fetch('/api/burner-links');
                if (!res.ok) throw new Error('Failed to fetch burner links');
                const data = await res.json();
                setLinks(data.links || []);
            } catch (e: any) {
                toast.error(e.message || 'Error loading burner links');
            } finally {
                setLoading(false);
            }
        };
        fetchLinks();
    }, []);

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-8 h-8 text-primary" />
                    Burner Links
                </h1>
                <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Create New Link
                </Button>
            </div>

            <Card className="bg-card shadow-sm border border-gray-100 mb-8">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        Disposable Profiles
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Create temporary links to your profile that expire or can be revoked at any time.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription>
                        Share your profile safely. Delete the link whenever you want to cut off access.
                    </CardDescription>
                </CardHeader>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : links.length === 0 ? (
                <div className="text-center p-12 bg-muted rounded-lg border border-border">
                    <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No active burner links</h3>
                    <p className="text-muted-foreground mb-4">You haven't created any temporary profile links yet.</p>
                    <Button variant="outline">Create your first link</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {links.map((link) => (
                        <Card key={link.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                            {link.isExpired && (
                                <div className="absolute top-0 right-0 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-bl-lg font-medium">
                                    EXPIRED
                                </div>
                            )}
                            <CardContent className="p-6">
                                <h3 className="font-bold text-lg mb-2">{link.name || 'Unnamed Link'}</h3>
                                <div className="flex items-center gap-2 p-3 bg-muted border rounded-md mb-4 font-mono text-sm break-all">
                                    {link.url}
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(link.url)}>
                                        <Copy className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>Created: {new Date(link.createdAt).toLocaleDateString()}</p>
                                    <p>Views: {link.views || 0}</p>
                                    <p>Expires: {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never'}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted px-6 py-3 border-t">
                                <Button variant="destructive" size="sm" className="w-full flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Revoke Link
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

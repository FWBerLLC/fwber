'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, RefreshCw, Smartphone, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SyncedContactsPage() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [query, setQuery] = useState('');
    const { toast } = useToast();

    const fetchContacts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.get<{ contacts?: any[] }>('/integrations/contacts/data');
            setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
        } catch (e: any) {
            toast({
                variant: 'destructive',
                description: e?.message || 'Error loading contacts',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchContacts();
    }, [fetchContacts]);

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            await api.post('/integrations/contacts/data/sync', {});
            toast({
                description: 'Contacts synced successfully',
            });
            await fetchContacts();
        } catch (e: any) {
            toast({
                variant: 'destructive',
                description: e?.message || 'Failed to trigger sync',
            });
        } finally {
            setSyncing(false);
        }
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return contacts;
        return contacts.filter((c) => {
            const name = `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.toLowerCase();
            const em = Array.isArray(c.emails) ? c.emails.join(' ') : String(c.emails || '');
            return name.includes(q) || em.toLowerCase().includes(q);
        });
    }, [contacts, query]);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background">
                <AppHeader />
                <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link href="/integrations" className="p-2 rounded-lg hover:bg-muted transition" title="Back to Connected Accounts Hub">
                                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                                    <Users className="w-8 h-8 text-primary" />
                                    Synced Contacts
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Also available directly inside the unified <Link href="/integrations?tab=contacts" className="text-primary underline">Connected Accounts Hub</Link>.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/integrations">
                                    <LinkIcon className="w-4 h-4 mr-1.5" />
                                    OAuth Providers
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManualSync}
                                disabled={syncing}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </Button>
                        </div>
                    </div>

                    <div className="relative max-w-md">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        <Input
                            placeholder="Search synced contacts..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-12 bg-muted/50 rounded-xl border border-border">
                            <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground">No contacts found</h3>
                            <p className="text-muted-foreground mb-4">
                                Connect Google, Outlook, or Facebook in the Connected Accounts Hub to sync contacts.
                            </p>
                            <Button asChild>
                                <Link href="/integrations">Open Connected Accounts Hub</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((contact) => {
                                const first = contact.firstName || contact.first_name || '';
                                const last = contact.lastName || contact.last_name || '';
                                const primaryEmail = Array.isArray(contact.emails) ? contact.emails[0] : contact.emails;
                                const primaryPhone = Array.isArray(contact.phones) ? contact.phones[0] : contact.phones;
                                return (
                                    <Card key={contact.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                                                {((first[0] || '') + (last[0] || '')).toUpperCase() || '?'}
                                            </div>
                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-bold truncate">
                                                        {`${first} ${last}`.trim() || primaryEmail || 'Contact'}
                                                    </h3>
                                                    {contact.provider && (
                                                        <Badge variant="outline" className="text-[10px] uppercase">
                                                            {contact.provider}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {primaryEmail && (
                                                    <p className="text-xs text-muted-foreground truncate">{primaryEmail}</p>
                                                )}
                                                {primaryPhone && (
                                                    <p className="text-xs text-muted-foreground truncate">{primaryPhone}</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}

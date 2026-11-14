'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Info,
    Link as LinkIcon,
    Smartphone,
    Users,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Search,
    Unplug,
    ShieldCheck,
    Loader2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProviderStatus {
    connected: boolean;
    configured: boolean;
    connected_at: string | null;
    updated_at: string | null;
    contacts_count: number;
}

interface SyncedContactItem {
    id: number;
    provider?: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    emails?: string[] | string | null;
    phones?: string[] | string | null;
    synced_at?: string | null;
}

const PROVIDER_META = [
    {
        id: 'google' as const,
        name: 'Google Contacts',
        badge: 'G',
        badgeClass: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400',
        description: 'Sync your Gmail and Android address book with read-only OAuth 2.0 scopes.',
        tooltip: 'Uses read-only Google People API scopes (contacts.readonly). FWBer never modifies your address book or emails anyone.',
    },
    {
        id: 'microsoft' as const,
        name: 'Outlook / Microsoft 365',
        badge: 'M',
        badgeClass: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
        description: 'Import contacts from Outlook, Live, Hotmail, and Microsoft 365 accounts.',
        tooltip: 'Uses Microsoft Graph Contacts.Read read-only permission with signed short-lived JWT state.',
    },
    {
        id: 'facebook' as const,
        name: 'Facebook Friends',
        badge: 'f',
        badgeClass: 'bg-indigo-600 text-white',
        description: 'Discover mutual Facebook friends who have also opted into FWBer friend discovery.',
        tooltip: 'Only surfaces mutual friends who also authorized Facebook discovery on FWBer.',
    },
];

function IntegrationsHubInner() {
    const searchParams = useSearchParams();
    const initialTab = searchParams?.get('tab') === 'contacts' ? 'contacts' : 'providers';
    const connectedBanner = searchParams?.get('connected');

    const [activeTab, setActiveTab] = useState<'providers' | 'contacts'>(initialTab);
    const [providers, setProviders] = useState<Record<string, ProviderStatus>>({
        google: { connected: false, configured: false, connected_at: null, updated_at: null, contacts_count: 0 },
        microsoft: { connected: false, configured: false, connected_at: null, updated_at: null, contacts_count: 0 },
        facebook: { connected: false, configured: false, connected_at: null, updated_at: null, contacts_count: 0 },
    });
    const [statusLoading, setStatusLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);

    const [contacts, setContacts] = useState<SyncedContactItem[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { toast } = useToast();

    const fetchStatus = useCallback(async () => {
        try {
            setStatusLoading(true);
            const res = await api.get<{ providers?: Record<string, ProviderStatus> }>('/integrations/contacts/status');
            if (res?.providers) {
                setProviders((prev) => ({ ...prev, ...res.providers }));
            }
        } catch (err) {
            console.error('Failed to load integration status:', err);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const fetchContacts = useCallback(async () => {
        try {
            setContactsLoading(true);
            const res = await api.get<{ contacts?: SyncedContactItem[] }>('/integrations/contacts/data');
            setContacts(Array.isArray(res?.contacts) ? res.contacts : []);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Could not load contacts',
                description: err?.message || 'Error loading synced contacts.',
            });
        } finally {
            setContactsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void fetchStatus();
        void fetchContacts();
    }, [fetchStatus, fetchContacts]);

    const handleConnect = async (provider: string) => {
        setConnecting(provider);
        try {
            // Request signed OAuth redirect URL via authenticated API client (attaches Bearer token)
            const res = await api.get<{ url?: string }>(`/integrations/contacts/auth/${provider}`);
            if (res?.url) {
                window.location.href = res.url;
                return;
            }
            throw new Error('No authorization URL returned by server.');
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Provider Unavailable',
                description:
                    err?.message ||
                    `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth credentials are not configured on this server yet.`,
            });
            setConnecting(null);
        }
    };

    const handleDisconnect = async (provider: string) => {
        setDisconnecting(provider);
        try {
            await api.delete(`/integrations/contacts/${provider}`);
            toast({
                title: 'Integration Disconnected',
                description: `Removed ${provider} connection and synced address book cache.`,
            });
            await Promise.all([fetchStatus(), fetchContacts()]);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Disconnect Failed',
                description: err?.message || 'Unable to revoke provider connection.',
            });
        } finally {
            setDisconnecting(null);
        }
    };

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            await api.post('/integrations/contacts/data/sync', {});
            toast({
                title: 'Contacts Synced',
                description: 'Imported the latest contacts from your connected providers.',
            });
            await Promise.all([fetchStatus(), fetchContacts()]);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: err?.message || 'Failed to synchronize contacts.',
            });
        } finally {
            setSyncing(false);
        }
    };

    const filteredContacts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return contacts;
        return contacts.filter((c) => {
            const full = `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''} ${c.provider || ''}`.toLowerCase();
            const emailStr = Array.isArray(c.emails) ? c.emails.join(' ') : String(c.emails || '');
            const phoneStr = Array.isArray(c.phones) ? c.phones.join(' ') : String(c.phones || '');
            return full.includes(q) || emailStr.toLowerCase().includes(q) || phoneStr.toLowerCase().includes(q);
        });
    }, [contacts, searchQuery]);

    const connectedCount = Object.values(providers).filter((p) => p?.connected).length;

    return (
        <ProtectedRoute>
            <TooltipProvider delayDuration={200}>
                <div className="min-h-screen bg-background">
                    <AppHeader />
                    <main className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2.5">
                                    <LinkIcon className="w-8 h-8 text-primary" />
                                    Connected Accounts &amp; Contact Sync
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button type="button" aria-label="About Connected Accounts" className="text-muted-foreground hover:text-foreground">
                                                <Info className="w-4 h-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-xs">
                                            Unified OAuth 2.0 provider hub and synced contact directory. Connect Google, Outlook, or Facebook to find mutual friends or prevent awkward overlaps — and revoke access anytime in one click.
                                        </TooltipContent>
                                    </Tooltip>
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Manage external OAuth connections and inspect imported address-book contacts in one place.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-3 py-1 text-xs">
                                    {connectedCount} Connected
                                </Badge>
                                <Badge variant="outline" className="px-3 py-1 text-xs">
                                    {contacts.length} Contacts
                                </Badge>
                            </div>
                        </div>

                        {connectedBanner && (
                            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-3 text-sm">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <span>
                                    Successfully linked <strong>{connectedBanner}</strong>! Switch to the <strong>Synced Contacts</strong> tab and click <em>Sync Now</em> to import your address book.
                                </span>
                            </div>
                        )}

                        {/* Consolidated Tab Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                            <div className="inline-flex rounded-xl bg-muted p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('providers')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                                        activeTab === 'providers'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <LinkIcon className="w-4 h-4" />
                                    OAuth Providers
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('contacts')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                                        activeTab === 'contacts'
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    Synced Contacts ({contacts.length})
                                </button>
                            </div>

                            {activeTab === 'contacts' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleManualSync}
                                            disabled={syncing || connectedCount === 0}
                                            className="flex items-center gap-2"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                                            {syncing ? 'Syncing...' : 'Sync Now'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                        {connectedCount === 0
                                            ? 'Connect at least one OAuth provider first to enable manual contact sync.'
                                            : 'Pull fresh contacts from all currently connected OAuth providers.'}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        {activeTab === 'providers' ? (
                            <>
                                {statusLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {PROVIDER_META.map((meta) => {
                                            const st = providers[meta.id] || {
                                                connected: false,
                                                configured: false,
                                                connected_at: null,
                                                updated_at: null,
                                                contacts_count: 0,
                                            };
                                            return (
                                                <Card key={meta.id} className="hover:shadow-md transition-shadow flex flex-col justify-between border-border bg-card">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${meta.badgeClass}`}>
                                                                {meta.badge}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {st.connected ? (
                                                                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                                                        <CheckCircle2 className="w-3 h-3" /> Connected
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                                                        Not Connected
                                                                    </span>
                                                                )}
                                                                {!st.configured && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 cursor-help">
                                                                                Server OAuth keys pending
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-xs text-xs">
                                                                            OAuth client credentials for {meta.name} have not been provisioned in the server environment yet.
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <CardTitle className="text-lg flex items-center gap-1.5">
                                                            {meta.name}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs text-xs">
                                                                    {meta.tooltip}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </CardTitle>
                                                        <CardDescription className="text-sm">{meta.description}</CardDescription>
                                                        {st.connected && (
                                                            <p className="text-xs text-muted-foreground pt-2">
                                                                {st.contacts_count} synced contact{st.contacts_count === 1 ? '' : 's'}
                                                            </p>
                                                        )}
                                                    </CardHeader>

                                                    <CardFooter className="pt-4 border-t border-border mt-4 flex gap-2">
                                                        <Button
                                                            variant={st.connected ? 'outline' : 'default'}
                                                            className="flex-1"
                                                            onClick={() => handleConnect(meta.id)}
                                                            disabled={connecting === meta.id || !st.configured}
                                                        >
                                                            {connecting === meta.id
                                                                ? 'Redirecting...'
                                                                : !st.configured
                                                                  ? 'Awaiting OAuth Keys'
                                                                  : st.connected
                                                                    ? 'Reconnect'
                                                                    : `Connect ${meta.name.split(' ')[0]}`}
                                                        </Button>
                                                        {st.connected && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDisconnect(meta.id)}
                                                                        disabled={disconnecting === meta.id}
                                                                        aria-label={`Disconnect ${meta.name}`}
                                                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                                    >
                                                                        <Unplug className="w-4 h-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-xs">
                                                                    Revoke {meta.name} &amp; purge imported contacts
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </CardFooter>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="p-4 bg-blue-500/10 text-blue-900 dark:text-blue-200 rounded-xl border border-blue-500/20 flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                                    <div className="text-sm leading-relaxed">
                                        <strong>Privacy-First OAuth 2.0:</strong> FWBer never asks for your email password and never messages or invites your contacts without your explicit action. Disconnecting a provider immediately deletes its OAuth token and cached contact entries.
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative max-w-md">
                                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                    <Input
                                        placeholder="Filter contacts by name, email, phone, or provider..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                {contactsLoading ? (
                                    <div className="flex justify-center p-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredContacts.length === 0 ? (
                                    <div className="text-center p-12 bg-muted/50 rounded-xl border border-border">
                                        <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {contacts.length === 0 ? 'No Synced Contacts Yet' : 'No Matching Contacts'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-md mx-auto">
                                            {contacts.length === 0
                                                ? 'Link Google Contacts, Microsoft 365, or Facebook under OAuth Providers, then click Sync Now.'
                                                : 'Try clearing or broadening your search filter.'}
                                        </p>
                                        {contacts.length === 0 && (
                                            <Button onClick={() => setActiveTab('providers')}>
                                                Configure OAuth Providers
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredContacts.map((contact) => {
                                            const first = contact.firstName || contact.first_name || '';
                                            const last = contact.lastName || contact.last_name || '';
                                            const initials = ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
                                            const primaryEmail = Array.isArray(contact.emails)
                                                ? contact.emails[0]
                                                : contact.emails || '';
                                            const primaryPhone = Array.isArray(contact.phones)
                                                ? contact.phones[0]
                                                : contact.phones || '';

                                            return (
                                                <Card key={contact.id} className="hover:shadow-md transition-shadow border-border bg-card">
                                                    <CardContent className="p-4 flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                                                            {initials}
                                                        </div>
                                                        <div className="overflow-hidden flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h3 className="font-semibold text-foreground truncate">
                                                                    {`${first} ${last}`.trim() || primaryEmail || 'Unnamed Contact'}
                                                                </h3>
                                                                {contact.provider && (
                                                                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                                                                        {contact.provider}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {primaryEmail && (
                                                                <p className="text-xs text-muted-foreground truncate mt-0.5">{primaryEmail}</p>
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
                        )}
                    </main>
                </div>
            </TooltipProvider>
        </ProtectedRoute>
    );
}

export default function IntegrationsPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            }
        >
            <IntegrationsHubInner />
        </Suspense>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, RefreshCw, Smartphone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SyncedContactsPage() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/integrations/contacts/data');
            if (!res.ok) throw new Error('Failed to fetch contacts');
            const data = await res.json();
            setContacts(data.contacts || []);
        } catch (e: any) {
            toast({
                variant: 'destructive',
                description: e.message || 'Error loading contacts',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/integrations/contacts/data/sync', { method: 'POST' });
            if (!res.ok) throw new Error('Sync failed');
            toast({
                description: 'Contacts synced successfully',
            });
            await fetchContacts();
        } catch (e: any) {
            toast({
                variant: 'destructive',
                description: e.message || 'Failed to trigger sync',
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <Users className="w-8 h-8 text-primary" />
                    Synced Contacts
                </h1>
                <Button
                    variant="outline"
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
            </div>

            <Card className="bg-card shadow-sm border border-gray-100 mb-8">
                <CardHeader>
                    <CardTitle className="text-xl">Your Network</CardTitle>
                    <CardDescription>
                        View contacts imported from Google, Microsoft, and Facebook. We highlight contacts who are already using the platform.
                    </CardDescription>
                </CardHeader>
            </Card>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : contacts.length === 0 ? (
                <div className="text-center p-12 bg-muted rounded-lg border border-border">
                    <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No contacts found</h3>
                    <p className="text-muted-foreground mb-4">You haven't synced any external accounts yet, or your accounts are empty.</p>
                    <Button onClick={() => window.location.href = '/integrations'}>Manage Integrations</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contacts.map((contact) => (
                        <Card key={contact.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0">
                                    {(contact.firstName?.[0] || '') + (contact.lastName?.[0] || '')}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold truncate">{contact.firstName} {contact.lastName}</h3>
                                    {contact.emails && (Array.isArray(contact.emails) ? contact.emails.length > 0 : !!contact.emails) && (
                                        <p className="text-sm text-muted-foreground truncate">{Array.isArray(contact.emails) ? contact.emails[0] : contact.emails}</p>
                                    )}
                                    {contact.phones && (Array.isArray(contact.phones) ? contact.phones.length > 0 : !!contact.phones) && (
                                        <p className="text-xs text-muted-foreground truncate">{Array.isArray(contact.phones) ? contact.phones[0] : contact.phones}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

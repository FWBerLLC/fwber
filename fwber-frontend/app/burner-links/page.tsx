'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { api } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Info, Link as LinkIcon, Trash2, Shield, Plus, Copy, MessageSquare, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface BurnerLinkItem {
  id: number;
  name?: string;
  token: string;
  url: string;
  chatroom_id?: number | null;
  expires_at?: string;
  expiresAt?: string;
  used_at?: string | null;
  isExpired?: boolean;
  views?: number;
  scanner?: {
    id: number;
    name: string;
    avatar_url?: string | null;
  } | null;
  created_at?: string;
  createdAt?: string;
}

export default function BurnerLinksPage() {
  const [links, setLinks] = useState<BurnerLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expiresHours, setExpiresHours] = useState('24');
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<BurnerLinkItem[] | { links: BurnerLinkItem[] }>('/burner-links');
      const list = Array.isArray(data) ? data : (Array.isArray(data?.links) ? data.links : []);
      setLinks(list);
    } catch (e: any) {
      toast.error(e.message || 'Error loading burner links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Burner link copied to clipboard!');
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.post<BurnerLinkItem>('/burner-links', {
        expires_in_hours: Number(expiresHours) || 24,
      });
      if (created?.url) {
        navigator.clipboard?.writeText(created.url).catch(() => {});
        toast.success('Burner link created and copied to clipboard!');
      } else {
        toast.success('Burner link created!');
      }
      setCreateOpen(false);
      await fetchLinks();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create burner link');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeLink = async (id: number) => {
    setRevokingId(id);
    try {
      await api.delete(`/burner-links/${id}`);
      setLinks((prev) => prev.filter((item) => item.id !== id));
      toast.success('Burner link revoked');
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke burner link');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppHeader title="Burner Links" />

        <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                Burner Links
              </h1>
              <Link
                href="/burner"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline"
              >
                <QrCode className="w-4 h-4" />
                Need an in-person QR code instead? Open Burner Bridge.
              </Link>
            </div>
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Create New Link
            </Button>
          </div>

          <Card className="bg-card shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                Disposable Invitation Links
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create single-use links that spin up a private burner chatroom and can be revoked anytime.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription>
                Share a private connection link without exposing your permanent handle. Revoke any link instantly to cut off access.
              </CardDescription>
            </CardHeader>
          </Card>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center p-12 bg-muted rounded-lg border border-border">
              <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No active burner links</h3>
              <p className="text-muted-foreground mb-4">You haven&apos;t created any temporary burner links yet.</p>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
                Create your first link
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {links.map((link) => {
                const createdIso = link.created_at || link.createdAt;
                const expiresIso = link.expires_at || link.expiresAt;
                const expired = Boolean(link.isExpired || (expiresIso && new Date() > new Date(expiresIso)));
                const claimed = Boolean(link.used_at);
                return (
                  <Card key={link.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                    {expired ? (
                      <div className="absolute top-0 right-0 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs px-2.5 py-1 rounded-bl-lg font-medium">
                        EXPIRED
                      </div>
                    ) : claimed ? (
                      <div className="absolute top-0 right-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-bl-lg font-medium">
                        CONNECTED
                      </div>
                    ) : null}
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-2">{link.name || `Burner Link #${link.id}`}</h3>
                      <div className="flex items-center gap-2 p-3 bg-muted border rounded-md mb-4 font-mono text-xs break-all">
                        <span className="flex-1">{link.url}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label="Copy link"
                          onClick={() => copyToClipboard(link.url)}
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {createdIso && <p>Created: {new Date(createdIso).toLocaleString()}</p>}
                        <p>Status: {claimed ? `Claimed by ${link.scanner?.name || 'Guest'}` : expired ? 'Expired' : 'Ready to scan'}</p>
                        <p>Expires: {expiresIso ? new Date(expiresIso).toLocaleString() : 'Never'}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted px-6 py-3 border-t flex gap-2">
                      {link.chatroom_id && (
                        <Button asChild variant="secondary" size="sm" className="flex-1">
                          <Link href={`/chatrooms/${link.chatroom_id}`}>
                            <MessageSquare className="w-4 h-4 mr-1.5" /> Open Chat
                          </Link>
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={revokingId === link.id}
                        onClick={() => handleRevokeLink(link.id)}
                        className="flex-1 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {revokingId === link.id ? 'Revoking...' : 'Revoke Link'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Burner Link</DialogTitle>
              <DialogDescription>
                Choose how long this single-use link remains valid before expiring automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label htmlFor="burner-expiry" className="block text-sm font-medium text-foreground mb-1.5">
                  Expiration Window
                </label>
                <select
                  id="burner-expiry"
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="1">1 Hour (Quick Meetup)</option>
                  <option value="6">6 Hours (Evening Event)</option>
                  <option value="24">24 Hours (Recommended)</option>
                  <option value="48">48 Hours (Weekend)</option>
                  <option value="72">72 Hours (Maximum)</option>
                </select>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Generating...' : 'Generate & Copy Link'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

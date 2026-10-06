'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { updateUserProfile } from '@/lib/api/profile';
import { api } from '@/lib/api/client';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Globe,
    Search,
    UserPlus,
    UserMinus,
    Shield,
    Info,
    ArrowLeft,
    Share2,
    MessageSquare,
    Radio,
    Send,
    Sparkles,
    CheckCircle2,
    ExternalLink,
    Eye,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
    buildFederationActorExplorerHref,
    formatFederationHandle,
    type FederationActor,
    type FederationConnection,
} from '@/lib/api/activitypub';

interface FederationFollowingResponse {
    following?: FederationConnection[];
}

interface FederationFollowersResponse {
    followers?: FederationConnection[];
}

interface FederationSearchResponse {
    actors?: FederationActor[];
}

export default function FederationSettingsPage() {
    const { token, user, updateUser } = useAuth();
    const { toast } = useToast();
    const [handle, setHandle] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isFederationSaving, setIsFederationSaving] = useState(false);
    const [results, setResults] = useState<FederationActor[]>([]);
    const [following, setFollowing] = useState<FederationConnection[]>([]);
    const [followers, setFollowers] = useState<FederationConnection[]>([]);
    const [activeTab, setActiveTab] = useState<'search' | 'following' | 'followers'>('search');
    const [selectedActor, setSelectedActor] = useState<FederationActor | null>(null);

    const isFederated = Boolean(user?.profile?.is_federated);

    const fetchConnections = useCallback(async () => {
        if (!token) return;
        try {
            const followingsRes = await api.get<FederationFollowingResponse>('/federation/following', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFollowing(Array.isArray(followingsRes.following) ? followingsRes.following : []);

            const followersRes = await api.get<FederationFollowersResponse>('/federation/followers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFollowers(Array.isArray(followersRes.followers) ? followersRes.followers : []);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
            setFollowing([]);
            setFollowers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleFederationToggle = async (checked: boolean) => {
        if (!token) {
            return;
        }

        try {
            setIsFederationSaving(true);
            await updateUserProfile(token, { is_federated: checked });
            if (user) {
                updateUser({
                    ...user,
                    profile: {
                        ...user.profile,
                        is_federated: checked,
                    },
                });
            }
            toast({
                title: checked ? 'Federation enabled' : 'Federation disabled',
                description: checked
                    ? 'Your public profile can now be discovered via WebFinger and ActivityPub.'
                    : 'Your public profile is now isolated to fwber.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Federation update failed',
                description: 'Could not update your federation visibility right now.',
            });
        } finally {
            setIsFederationSaving(false);
        }
    };

    const handleFollow = async (actorId: string) => {
        if (!token) return;
        try {
            await api.post('/federation/follow', { actor_id: actorId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({
                title: "Follow Request Sent",
                description: "You are now following this federated actor.",
            });
            fetchConnections();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Follow Failed",
                description: "Could not send follow request to the remote server.",
            });
        }
    };

    const handleUnfollow = async (actorId: string) => {
        if (!token) return;
        try {
            await api.post('/federation/unfollow', { actor_id: actorId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({
                title: "Unfollowed",
                description: "You have unfollowed this federated actor.",
            });
            fetchConnections();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Unfollow Failed",
                description: "Could not send unfollow request to the remote server.",
            });
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!handle.includes('@')) {
            toast({
                variant: "destructive",
                title: "Invalid Handle",
                description: "Handles must be in the format @user@domain.com",
            });
            return;
        }

        try {
            setIsSearching(true);
            const response = await api.get<FederationSearchResponse>(`/federation/search?q=${encodeURIComponent(handle)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setResults(Array.isArray(response.actors) ? response.actors : []);
            setActiveTab('search');
        } catch (error) {
            console.error('Federated search failed:', error);
            setResults([]);
            toast({
                variant: "destructive",
                title: "Search Failed",
                description: "Could not locate that actor on the Fediverse.",
            });
        } finally {
            setIsSearching(false);
        }
    };

    const federatedHandle = user?.email ? `@${user.email.split('@')[0]}@api.fwber.site` : '';
    const followedActorIds = new Set(following.map((connection) => connection.actor_uri));

    const copyFederatedHandle = async () => {
        if (!federatedHandle) {
            return;
        }

        try {
            await navigator.clipboard.writeText(federatedHandle);
            toast({
                title: 'Federated handle copied',
                description: 'Share it on other ActivityPub servers so people can follow you.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Copy failed',
                description: 'Could not copy your federated handle to the clipboard.',
            });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AppHeader title="Global Federation" />
            <div className="max-w-4xl mx-auto space-y-8 pb-24 px-4 pt-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-900 dark:text-white">
                            Global Federation
                        </h1>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
                            <Globe className="w-3 h-3" /> ActivityPub / WebFinger Gateway
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/settings/federation/activity">
                        <Button variant="outline" size="sm" className="border-purple-200 text-purple-600 hover:bg-purple-50">
                            <Radio className="w-4 h-4 mr-2" /> Activity Center
                        </Button>
                    </Link>
                    <Link href="/settings/federation/outbox">
                        <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                            <Send className="w-4 h-4 mr-2" /> Outbox
                        </Button>
                    </Link>
                    <Link href="/settings/federation/feed">
                        <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                            <MessageSquare className="w-4 h-4 mr-2" /> View Global Feed
                        </Button>
                    </Link>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 self-start sm:self-auto">BETA</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className={isFederated ? 'border-emerald-200 dark:border-emerald-900/30' : 'border-amber-200 dark:border-amber-900/30'}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className={`w-4 h-4 ${isFederated ? 'text-emerald-500' : 'text-amber-500'}`} />
                                Federation Visibility
                            </CardTitle>
                            <CardDescription>
                                Control whether your public fwber profile is discoverable from the wider Fediverse.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white dark:bg-gray-800 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="space-y-1">
                                    <Label htmlFor="federation-visibility-toggle" className="font-semibold text-sm text-zinc-900 dark:text-white">
                                        ActivityPub broadcasting
                                    </Label>
                                    <p className="text-xs text-zinc-500">
                                        {isFederated
                                            ? 'Your federated handle is live and other servers can discover your public profile.'
                                            : 'Turn this on before sharing your federated handle outside fwber.'}
                                    </p>
                                </div>
                                <Switch
                                    id="federation-visibility-toggle"
                                    checked={isFederated}
                                    onCheckedChange={handleFederationToggle}
                                    disabled={isFederationSaving}
                                />
                            </div>
                            <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                                {isFederated
                                    ? 'Followers on other ActivityPub servers can resolve your handle and initiate follows.'
                                    : 'Followers can still exist locally, but your handle should not be promoted until federation is enabled.'}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                        <button 
                            onClick={() => setActiveTab('search')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'search' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Search
                        </button>
                        <button 
                            onClick={() => setActiveTab('following')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'following' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Following ({following.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('followers')}
                            className={`pb-2 px-4 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'followers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Followers ({followers.length})
                        </button>
                    </div>

                    {activeTab === 'search' && (
                        <Card className="border-blue-100 dark:border-blue-900/30">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Search className="w-4 h-4" /> Discover External Actors
                                </CardTitle>
                                <CardDescription>Search for users on Mastodon, Threads, or other fwber nodes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <Input 
                                        placeholder="@username@mastodon.social"
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                        disabled={isSearching}
                                    />
                                    <Button type="submit" disabled={isSearching || !handle} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                                    </Button>
                                </form>

                                {results.length > 0 && (
                                    <div className="mt-8 space-y-4">
                                        {results.map((actor) => {
                                            const isFollowing = followedActorIds.has(actor.id);
                                            return (
                                                <div key={actor.id} className="p-4 border rounded-xl flex items-center justify-between bg-white dark:bg-gray-800 dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                                                            {actor.icon && <Image src={actor.icon.url} alt="" fill sizes="40px" className="object-cover" />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={buildFederationActorExplorerHref(actor.id)}
                                                                    className="font-bold text-sm hover:text-blue-600 dark:hover:text-blue-400"
                                                                >
                                                                    {formatFederationHandle(actor.preferredUsername, actor.server, actor.id)}
                                                                </Link>
                                                                <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter text-blue-500 border-blue-200 bg-blue-50">Remote</Badge>
                                                            </div>
                                                            <p className="text-xs text-zinc-500">{actor.name || 'External Actor'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                                            onClick={() => setSelectedActor(actor)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Details
                                                        </Button>
                                                        <Button asChild size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                                                            <Link href={buildFederationActorExplorerHref(actor.id)}>
                                                                Explore
                                                            </Link>
                                                        </Button>
                                                        {isFollowing ? (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                                onClick={() => handleUnfollow(actor.id)}
                                                                disabled={!isFederated}
                                                            >
                                                                <UserMinus className="w-4 h-4 mr-2" />
                                                                Unfollow
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                                                onClick={() => handleFollow(actor.id)}
                                                                disabled={!isFederated}
                                                            >
                                                                <UserPlus className="w-4 h-4 mr-2" />
                                                                Follow
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'following' && (
                        <div className="space-y-4">
                            {following.length === 0 ? (
                                <p className="text-center py-12 text-zinc-500 italic">You aren&apos;t following anyone yet.</p>
                            ) : (
                                following.map((f) => (
                                    <div key={f.id} className="p-4 border rounded-xl flex items-center justify-between bg-white dark:bg-gray-800 dark:bg-zinc-900 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {f.username?.[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={buildFederationActorExplorerHref(f.actor_uri)}
                                                        className="font-bold text-sm hover:text-blue-600 dark:hover:text-blue-400"
                                                    >
                                                        {formatFederationHandle(f.username, f.domain, f.actor_uri)}
                                                    </Link>
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter text-blue-500 border-blue-200 bg-blue-50">Remote</Badge>
                                                </div>
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Status: {f.status}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{f.status || 'pending'}</Badge>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                onClick={() => handleUnfollow(f.actor_uri)}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'followers' && (
                        <div className="space-y-4">
                            {followers.length === 0 ? (
                                <p className="text-center py-12 text-zinc-500 italic">No one is following you yet.</p>
                            ) : (
                                followers.map((f) => (
                                    <div key={f.id} className="p-4 border rounded-xl flex items-center justify-between bg-white dark:bg-gray-800 dark:bg-zinc-900 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                                {f.username?.[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={buildFederationActorExplorerHref(f.actor_uri)}
                                                        className="font-bold text-sm hover:text-blue-600 dark:hover:text-blue-400"
                                                    >
                                                        {formatFederationHandle(f.username, f.domain, f.actor_uri)}
                                                    </Link>
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter text-blue-500 border-blue-200 bg-blue-50">Remote</Badge>
                                                </div>
                                                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Remote Follower</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <Card className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Privacy Isolation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-zinc-500 space-y-2 leading-relaxed">
                            <p>Federated interactions are isolated from your local proximity data. External servers will never receive your exact coordinates.</p>
                            <p>Only your public profile and ActivityPub-compatible posts are shared with the global Fediverse.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Info Column */}
                <div className="space-y-6">
                    <Card className="border-dashed border-2">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase font-black tracking-tighter italic">Your Federated ID</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg font-mono text-[10px] break-all border border-zinc-200 dark:border-zinc-700">
                                {federatedHandle || 'Loading...'}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-[10px] font-bold uppercase tracking-widest text-zinc-400"
                                onClick={copyFederatedHandle}
                                disabled={!federatedHandle || !isFederated}
                            >
                                <Share2 className="w-3 h-3 mr-2" /> Copy Federated Handle
                            </Button>
                            {!isFederated && (
                                <p className="text-[10px] text-amber-600">
                                    Enable federation visibility before sharing this handle externally.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                            <Info className="w-3 h-3" /> Federation FAQ
                        </h4>
                        <ul className="text-[10px] text-zinc-500 space-y-2 font-medium">
                            <li>- Can I match with users on Mastodon? <br/><span className="text-zinc-400 font-normal">Matching is limited to local fwber nodes for safety.</span></li>
                            <li>- Who can see my face reveals? <br/><span className="text-zinc-400 font-normal">Reveals are only visible within the fwber E2E encrypted layer.</span></li>
                            <li>- Why are some follows pending? <br/><span className="text-zinc-400 font-normal">Remote servers still need to accept or process the follow handshake.</span></li>
                        </ul>
                    </div>
                </div>
            </div>

                <Dialog open={Boolean(selectedActor)} onOpenChange={(open) => !open && setSelectedActor(null)}>
                    <DialogContent className="sm:max-w-xl">
                        {selectedActor ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                    <div className="relative h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                                        {selectedActor.icon?.url ? (
                                            <Image src={selectedActor.icon.url} alt="" fill sizes="48px" className="object-cover" />
                                        ) : null}
                                    </div>
                                    <div>
                                        <Link
                                            href={buildFederationActorExplorerHref(selectedActor.id)}
                                            className="text-base font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            {formatFederationHandle(selectedActor.preferredUsername, selectedActor.server, selectedActor.id)}
                                        </Link>
                                        <p className="text-sm text-zinc-500">{selectedActor.name || 'External Actor'}</p>
                                    </div>
                                </DialogTitle>
                                <DialogDescription>
                                    Review the remote profile before opening a follow relationship across servers.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Server</p>
                                    <p className="mt-1 text-sm text-zinc-900 dark:text-white">{selectedActor.server}</p>
                                </div>

                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Summary</p>
                                    <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                                        {selectedActor.summary || 'This remote actor has not published a summary yet.'}
                                    </p>
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                    <Button asChild variant="outline">
                                        <Link href={buildFederationActorExplorerHref(selectedActor.id)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Open Explorer
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(selectedActor.id, '_blank', 'noopener,noreferrer')}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Open Actor URL
                                    </Button>
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                            void handleFollow(selectedActor.id);
                                            setSelectedActor(null);
                                        }}
                                        disabled={followedActorIds.has(selectedActor.id) || !isFederated}
                                    >
                                        {followedActorIds.has(selectedActor.id) ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                        {followedActorIds.has(selectedActor.id) ? 'Already Following' : 'Follow Actor'}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : null}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

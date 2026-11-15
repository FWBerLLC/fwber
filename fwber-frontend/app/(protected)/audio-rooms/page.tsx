'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Users, PlusCircle, Compass, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';

interface AudioRoom {
    id: number;
    name: string | null;
    topic: string;
    participants_count: number;
    distance_meters?: number | null;
    ranking_score?: number | null;
    scene_signals?: {
        headline?: string;
        matched_topics: Array<{
            id: number;
            slug: string;
            label: string;
            emoji?: string | null;
        }>;
        matched_tags: string[];
        score_boost: number;
    } | null;
    host: {
        id: number;
        name: string;
    };
}

interface AudioRoomRankingResponse {
    data?: AudioRoom[];
    rooms?: AudioRoom[];
    meta?: {
        ranking_strategy?: {
            trusted_hosts: boolean;
            scene_alignment: boolean;
            participant_health: boolean;
            freshness: boolean;
            distance: boolean;
            summary: string;
        } | null;
    };
}

export default function AudioRoomsLobby() {
    const [rooms, setRooms] = useState<AudioRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoomTopic, setNewRoomTopic] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [rankingSummary, setRankingSummary] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const fetchRooms = async () => {
        try {
            const response = await apiClient.get<AudioRoomRankingResponse>('/audio-rooms', {
                params: {
                    ranking_strategy: 'trust-aware',
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                },
            });
            const roomList = response.data.data ?? response.data.rooms ?? [];
            setRooms(roomList);
            setRankingSummary(response.data.meta?.ranking_strategy?.summary ?? null);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            fetchRooms();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            () => {
                fetchRooms();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchRooms();
        // Set up polling for active lobby
        const interval = setInterval(fetchRooms, 10000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location?.latitude, location?.longitude]);

    const createRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomTopic.trim()) return;

        setIsCreating(true);
        try {
            const response = await apiClient.post<{ id: number }>('/audio-rooms', {
                topic: newRoomTopic
            });
            toast({ title: 'Room created', description: 'Entering audio stage...' });
            router.push(`/audio-rooms/${response.data.id}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to create room.' });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AppHeader title="Audio Rooms" />

            <div className="container mx-auto max-w-4xl px-4 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="flex items-center gap-2 text-3xl font-bold">
                            <Mic className="h-8 w-8 text-primary" />
                            Audio Rooms
                        </h1>
                        <p className="mt-1 text-muted-foreground">Drop-in voice conversations with nearby users.</p>
                    </div>
                </div>

                {rankingSummary && (
                    <Card className="mb-6 border-cyan-200 bg-cyan-50">
                        <CardContent className="p-4">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                                <Compass className="h-4 w-4" />
                                <span>Trust-aware audio ranking</span>
                            </div>
                            <p className="text-sm text-cyan-900 dark:text-cyan-100">{rankingSummary}</p>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <Card className="h-fit border-border bg-card md:col-span-1">
                        <CardHeader>
                            <CardTitle>Host a Room</CardTitle>
                            <CardDescription>Start your own conversation stage.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={createRoom} className="space-y-4">
                                <div>
                                    <Input
                                        placeholder="What do you want to talk about?"
                                        value={newRoomTopic}
                                        onChange={(e) => setNewRoomTopic(e.target.value)}
                                        maxLength={100}
                                    />
                                </div>
                                <Button type="submit" className="w-full gap-2" disabled={isCreating || !newRoomTopic.trim()}>
                                    {isCreating ? 'Setting up stage...' : <><PlusCircle className="h-4 w-4" /> Start Room</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 md:col-span-2">
                        <h2 className="mb-4 text-xl font-semibold">Active Stages</h2>
                        {(Array.isArray(rooms) ? rooms : []).map(room => (
                                <Card key={room.id} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => router.push(`/audio-rooms/${room.id}`)}>
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold">{room.topic}</h3>
                                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                                Hosted by {room.host.name}
                                            </p>
                                            {typeof room.ranking_score === 'number' && (
                                                <p className="text-xs font-medium text-cyan-700">
                                                    Ranked {Math.round(room.ranking_score)}
                                                </p>
                                            )}
                                            {room.distance_meters != null && (
                                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    {Math.round((room.distance_meters / 100)) / 10} km away
                                                </p>
                                            )}
                                            {room.scene_signals && (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {(Array.isArray(room.scene_signals.matched_topics) ? room.scene_signals.matched_topics : []).slice(0, 2).map(topic => (
                                                        <span key={topic.slug} className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                                                            {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                                                        </span>
                                                    ))}
                                                    {(Array.isArray(room.scene_signals.matched_tags) ? room.scene_signals.matched_tags : []).slice(0, 2).map(tag => (
                                                        <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground">
                                                <Users className="h-4 w-4" />
                                                {room.participants_count}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/audio-rooms/${room.id}`);
                                                }}
                                            >
                                                Join
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

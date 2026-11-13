'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, LogOut, Loader2, User as UserIcon, Hand } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import { useWebRTC } from '@/lib/hooks/useWebRTC';
import { getSharedSocket } from '@/lib/hooks/use-socket-logic';
import { useAuth } from '@/lib/auth-context';
import { usePusherLogic } from '@/lib/hooks/use-pusher-logic';

interface RoomParticipant {
    id: number;
    user_id: number;
    role: 'speaker' | 'listener';
    is_muted: boolean;
    user: {
        id: number;
        name: string;
    }
}

interface RoomDetails {
    id: number;
    topic: string;
    host_id: number;
    participants: RoomParticipant[];
}

export default function ActiveAudioRoom() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();

    const [room, setRoom] = useState<RoomDetails | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [loading, setLoading] = useState(true);

    // Get Echo instance
    const { echo } = usePusherLogic({ autoConnect: true });

    const { startLocalAudio, stopLocalAudio, toggleMute, createOfferForPeer, remoteStreams } = useWebRTC({
        roomId: id,
        currentUserId: user?.id || 0,
        echoInstance: echo
    });

    const fetchRoomDetails = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Join room via API
            const resp = await apiClient.post<{ room: RoomDetails, participants: RoomParticipant[] }>(`/audio-rooms/${id}/join`);
            setRoom(resp.data.room);

            // If we're a speaker, offer to other speakers
            const me = resp.data.participants.find(p => p.user_id === user?.id);
            if (me?.role === 'speaker' || resp.data.room.host_id === user?.id) {
                resp.data.participants.forEach(p => {
                    if (p.user_id !== user?.id && (p.role === 'speaker' || p.user_id === resp.data.room.host_id)) {
                        createOfferForPeer(p.user_id);
                    }
                });
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Cannot join room', description: error.response?.data?.message || 'Room might be ended.' });
            router.push('/audio-rooms');
        } finally {
            setLoading(false);
        }
    }, [id, user?.id, createOfferForPeer, toast, router]);

    useEffect(() => {
        fetchRoomDetails();

        return () => {
            // Leave room when unmounting
            stopLocalAudio();
            if (user?.id) {
                apiClient.post(`/audio-rooms/${id}/leave`).catch(() => { });
            }
        };
    }, [fetchRoomDetails, id, stopLocalAudio, user?.id]);

    useEffect(() => {
        if (!room) return;
        startLocalAudio();
    }, [room, startLocalAudio]);

    useEffect(() => {
        if (!echo || !room) return;

        const channel = echo.join(`audio-rooms.${id}`);

        channel.listen('.ParticipantJoined', (e: any) => {
            setRoom(prev => {
                if (!prev) return prev;
                // Add participant if not exists
                const exists = prev.participants.find(p => p.user_id === e.participant.user_id);
                if (exists) return prev;
                return { ...prev, participants: [...prev.participants, e.participant] };
            });

            // If the new participant is a speaker and we are a speaker, create an offer
            const me = room.participants.find(p => p.user_id === user?.id) || (room.host_id === user?.id ? { role: 'speaker' } : null);
            if (me?.role === 'speaker' && (e.participant.role === 'speaker' || e.participant.user_id === room.host_id)) {
                // To avoid glare, higher ID sends offer
                if ((user?.id || 0) > e.participant.user_id) {
                    // Small delay to ensure they've set up their peer connection listener
                    setTimeout(() => createOfferForPeer(e.participant.user_id), 1000);
                }
            }
        });

        channel.listen('.ParticipantLeft', (e: any) => {
            setRoom(prev => {
                if (!prev) return prev;
                return { ...prev, participants: prev.participants.filter(p => p.user_id !== e.user_id) };
            });
            // If host left, maybe boot everyone or show message
            if (e.user_id === room.host_id) {
                toast({ title: 'Room Ended', description: 'The host has left the room.' });
                router.push('/audio-rooms');
            }
        });

        return () => {
            echo.leave(`audio-rooms.${id}`);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [echo, room?.id, user?.id, createOfferForPeer, id, router, toast]);

    // Presence over the shared Socket.io socket. The backend emits
    // ParticipantJoined/ParticipantLeft on join/leave (the Echo listeners
    // above only fire where a Reverb deployment exists). Handlers mirror
    // the Echo ones, normalizing the flat broadcast participant into the
    // page's { user: { name } } shape.
    useEffect(() => {
        if (!room || !user?.id) return;
        const socket = getSharedSocket();
        if (!socket) return;

        const onJoined = (e: any) => {
            if (e.room_id != id || !e.participant) return;
            const p = e.participant;
            setRoom(prev => {
                if (!prev) return prev;
                if (prev.participants.find(x => x.user_id === p.user_id)) return prev;
                return {
                    ...prev,
                    participants: [...prev.participants, {
                        id: p.user_id,
                        user_id: p.user_id,
                        role: p.role,
                        is_muted: p.is_muted ?? true,
                        user: { id: p.user_id, name: p.name || 'Unknown' },
                    } as RoomParticipant],
                };
            });
            const meNow = room.participants.find(x => x.user_id === user?.id) || (room.host_id === user?.id ? { role: 'speaker' } as any : null);
            if (meNow?.role === 'speaker' && (p.role === 'speaker' || p.user_id === room.host_id)) {
                if ((user?.id || 0) > p.user_id) {
                    setTimeout(() => createOfferForPeer(p.user_id), 1000);
                }
            }
        };

        const onLeft = (e: any) => {
            if (e.room_id != id) return;
            setRoom(prev => {
                if (!prev) return prev;
                return { ...prev, participants: prev.participants.filter(x => x.user_id !== e.user_id) };
            });
            if (e.user_id === room.host_id) {
                toast({ title: 'Room Ended', description: 'The host has left the room.' });
                router.push('/audio-rooms');
            }
        };

        socket.on('ParticipantJoined', onJoined);
        socket.on('ParticipantLeft', onLeft);
        return () => {
            socket.off('ParticipantJoined', onJoined);
            socket.off('ParticipantLeft', onLeft);
        };
    }, [room, user?.id, createOfferForPeer, id, router, toast]);

    // Listen for private signals (like raise-hand)
    useEffect(() => {
        if (!echo || !user?.id) return;
        const channel = echo.private(`users.${user.id}`);

        channel.listen('.AudioRoomSignal', (e: any) => {
            if (e.room_id == id && e.type === 'raise-hand') {
                toast({
                    title: 'Audience Request',
                    description: 'A listener has raised their hand to speak!',
                    duration: 4000
                });
            }
        });

    }, [echo, user?.id, id, toast]);

    // Render remote audio streams
    useEffect(() => {
        // Attach streams to audio elements dynamically
        Object.entries(remoteStreams).forEach(([peerId, stream]) => {
            let audioEl = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `audio-peer-${peerId}`;
                audioEl.autoplay = true;
                // Hide it
                audioEl.style.display = 'none';
                document.body.appendChild(audioEl);
            }
            if (audioEl.srcObject !== stream) {
                audioEl.srcObject = stream;
            }
        });

        return () => {
            // Cleanup audio elements
            Object.keys(remoteStreams).forEach(peerId => {
                const el = document.getElementById(`audio-peer-${peerId}`);
                if (el) el.remove();
            });
        };
    }, [remoteStreams]);

    const handleToggleMute = () => {
        toggleMute();
        setIsMuted(!isMuted);
    };

    const handleLeave = async () => {
        await apiClient.post(`/audio-rooms/${id}/leave`);
        router.push('/audio-rooms');
    };

    if (loading || !room) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Connecting to audio relays...</p>
            </div>
        );
    }

    const speakers = room.participants.filter(p => p.role === 'speaker' || p.user_id === room.host_id);
    const listeners = room.participants.filter(p => p.role === 'listener' && p.user_id !== room.host_id);
    const isHost = user?.id === room.host_id;
    const me = room.participants.find(p => p.user_id === user?.id) || (isHost ? { role: 'speaker' } as any : null);

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4 h-full flex flex-col">
            <Card className="flex-1 flex flex-col border-border bg-card shadow-lg overflow-hidden">
                <CardHeader className="border-b bg-muted/20 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Audio Stage</span>
                            </div>
                            <CardTitle className="text-2xl">{room.topic}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLeave} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <LogOut className="w-4 h-4 mr-2" /> Leave Quietly
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Speakers Grid */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Speakers</h3>
                        <div className="flex flex-wrap gap-4">
                            {(Array.isArray(speakers) ? speakers : []).map(speaker => (
                                <div key={speaker.id} className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-2xl w-24 text-center relative border border-secondary">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary border-dashed">
                                        <UserIcon className="w-8 h-8" />
                                    </div>
                                    <span className="text-sm font-medium truncate w-full">{speaker.user.name}</span>
                                    {speaker.user_id === room.host_id && (
                                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">HOST</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Listeners Grid */}
                    {listeners.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Listening In</h3>
                            <div className="flex flex-wrap gap-3">
                                {(Array.isArray(listeners) ? listeners : []).map(listener => (
                                    <div key={listener.id} className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-full">
                                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                                            <UserIcon className="w-3 h-3" />
                                        </div>
                                        <span className="text-xs font-medium">{listener.user.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Bottom Controls */}
                <div className="p-4 border-t bg-muted/20 flex justify-center gap-4">
                    {me?.role === 'speaker' || isHost ? (
                        <Button
                            size="lg"
                            variant={isMuted ? "outline" : "default"}
                            className={`rounded-full w-16 h-16 p-0 ${isMuted ? 'border-destructive text-destructive' : ''}`}
                            onClick={handleToggleMute}
                        >
                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            variant="secondary"
                            className="rounded-full w-16 h-16 p-0 hover:bg-primary/20 hover:text-primary transition"
                            onClick={() => {
                                toast({ title: 'Hand Raised', description: 'The host will see your request to speak.' });
                                apiClient.post(`/audio-rooms/${id}/signal`, {
                                    target_user_id: room.host_id,
                                    type: 'raise-hand',
                                    payload: {}
                                }).catch(() => { });
                            }}
                        >
                            <Hand className="w-6 h-6" />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}

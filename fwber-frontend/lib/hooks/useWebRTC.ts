import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { getSharedSocket } from './use-socket-logic';

interface UseWebRTCProps {
    roomId: string;
    currentUserId: number;
    echoInstance: any;
}

/**
 * ICE servers for peer connections. STUN alone fails for peers behind
 * strict/symmetric NATs; when TURN is provisioned, set NEXT_PUBLIC_TURN_URL
 * (plus username/credential) and relay candidates flow through it. Kept
 * env-driven so no credentials are ever hardcoded in the bundle source.
 */
function buildIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
    ];
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    if (turnUrl) {
        servers.push({
            urls: turnUrl,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        });
    }
    return servers;
}

export function useWebRTC({ roomId, currentUserId, echoInstance }: UseWebRTCProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});

    const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);

    const getPeerConnection = useCallback((peerId: number) => {
        if (peersRef.current.has(peerId)) {
            return peersRef.current.get(peerId)!;
        }

        const pc = new RTCPeerConnection({
            iceServers: buildIceServers()
        });

        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await apiClient.post(`/audio-rooms/${roomId}/signal`, {
                    target_user_id: peerId,
                    type: 'ice-candidate',
                    payload: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStreams(prev => ({
                    ...prev,
                    [peerId]: event.streams[0]
                }));
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                peersRef.current.delete(peerId);
                setRemoteStreams(prev => {
                    const updated = { ...prev };
                    delete updated[peerId];
                    return updated;
                });
            }
        };

        // Add local tracks if we have any
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        peersRef.current.set(peerId, pc);
        return pc;
    }, [roomId]);

    const startLocalAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);
            localStreamRef.current = stream;

            // Add tracks to all existing peer connections
            peersRef.current.forEach((pc) => {
                stream.getTracks().forEach((track) => {
                    // Check if sender already exists to avoid duplicates
                    const senders = pc.getSenders();
                    const hasTrack = senders.find(s => s.track === track);
                    if (!hasTrack) {
                        pc.addTrack(track, stream);
                    }
                });
            });

            return stream;
        } catch (err) {
            console.error('Error accessing microphone', err);
            throw err;
        }
    };

    const stopLocalAudio = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            localStreamRef.current = null;
        }
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

    const createOfferForPeer = useCallback(async (peerId: number) => {
        const pc = getPeerConnection(peerId);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await apiClient.post(`/audio-rooms/${roomId}/signal`, {
                target_user_id: peerId,
                type: 'offer',
                payload: offer
            });
        } catch (err) {
            console.error(`Error creating offer for peer ${peerId}`, err);
        }
    }, [getPeerConnection, roomId]);

    const handleReceiveSignal = useCallback(async (signalData: { sender_id: number, type: string, payload: any }) => {
        const peerId = signalData.sender_id;
        if (peerId === currentUserId) return; // Ignore own signals

        const pc = getPeerConnection(peerId);

        try {
            if (signalData.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signalData.payload));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                await apiClient.post(`/audio-rooms/${roomId}/signal`, {
                    target_user_id: peerId,
                    type: 'answer',
                    payload: answer
                });
            } else if (signalData.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signalData.payload));
            } else if (signalData.type === 'ice-candidate') {
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(signalData.payload));
                }
            }
        } catch (err) {
            console.error(`Error handling signal from peer ${peerId}`, err);
        }
    }, [currentUserId, getPeerConnection, roomId]);

    // Receive signals over the shared Socket.io connection. The backend
    // relays `AudioRoomSignal` to the target's `user:{id}` room (REST
    // /signal and the `audio_signal` socket event share that contract).
    // The legacy Echo listener below stays as a fallback for any Reverb
    // deployment, but Socket.io is the transport the TS backend serves.
    useEffect(() => {
        if (!currentUserId) return;
        const socket = getSharedSocket();
        if (!socket) return;

        const handleSignal = (e: any) => {
            if (e && e.room_id == roomId) {
                handleReceiveSignal({
                    sender_id: e.sender_id,
                    type: e.type,
                    payload: e.payload
                });
            }
        };

        socket.on('AudioRoomSignal', handleSignal);
        return () => {
            socket.off('AudioRoomSignal', handleSignal);
        };
    }, [currentUserId, roomId, handleReceiveSignal]);

    // Setup Echo listeners for signaling (legacy fallback)
    useEffect(() => {
        if (!echoInstance || !currentUserId) return;

        const channel = echoInstance.private(`users.${currentUserId}`);

        const handleSignal = (e: any) => {
            // e could be the event payload
            if (e.room_id == roomId) {
                handleReceiveSignal({
                    sender_id: e.sender_id,
                    type: e.type,
                    payload: e.payload
                });
            }
        };

        channel.listen('.AudioRoomSignal', handleSignal);

        return () => {
            // Note: We don't necessarily leave the channel here if it's reused, 
            // but we should ideally remove the listener if Echo supports it,
            // or we just let it be if the component unmounts.
            // For safety, stop all peer connections on unmount.
        };
    }, [echoInstance, currentUserId, roomId, handleReceiveSignal]);

    // Cleanup peer connections on unmount
    useEffect(() => {
        const currentPeersRef = peersRef.current;
        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            // Close all peer connections
            currentPeersRef.forEach(peer => peer.close());
        };
    }, [localStream]);

    return {
        localStream,
        remoteStreams,
        startLocalAudio,
        stopLocalAudio,
        toggleMute,
        createOfferForPeer
    };
}


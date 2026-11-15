'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/lib/hooks/use-websocket';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Ghost } from 'lucide-react';
import { initiateCall, updateCallStatus } from '@/lib/api/video';
import { useVideoFaceBlur } from '@/lib/hooks/use-video-face-blur';

interface VideoCallModalProps {
  recipientId: string;
  recipientName?: string;
  initialCallId?: number;
  isOpen: boolean;
  onClose: () => void;
  isIncoming?: boolean;
}

/**
 * Dynamically builds RTCPeerConnection ICE servers.
 *
 * WHY THIS DESIGN:
 * STUN alone fails for ~15-20% of peers behind symmetric/carrier-grade NATs.
 * Mirroring `useWebRTC.ts` (Audio Rooms), we read optional `NEXT_PUBLIC_TURN_URL`
 * (+ `NEXT_PUBLIC_TURN_USERNAME` / `NEXT_PUBLIC_TURN_CREDENTIAL`) at runtime so
 * TURN relay candidates work automatically whenever provisioned without hardcoding
 * credentials in client source.
 */
function buildIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      ...(process.env.NEXT_PUBLIC_TURN_USERNAME
        ? { username: process.env.NEXT_PUBLIC_TURN_USERNAME }
        : {}),
      ...(process.env.NEXT_PUBLIC_TURN_CREDENTIAL
        ? { credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }
        : {}),
    });
  }
  return { iceServers };
}

export function VideoCallModal({
  recipientId,
  recipientName,
  initialCallId,
  isOpen,
  onClose,
  isIncoming = false,
}: VideoCallModalProps) {
  const { token } = useAuth();
  const { sendVideoSignal, videoSignals } = useWebSocket();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [callId, setCallId] = useState<number | null>(initialCallId ?? null);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  // Refs avoid stale React closure captures inside RTCPeerConnection event callbacks
  const callIdRef = useRef<number | null>(initialCallId ?? null);
  const connectedAtRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const wasOpenRef = useRef(false);
  // Monotonic `_seq` cursor into `videoSignals` so rapid `offer` + `candidate` bursts
  // arriving within the same tick/render cycle are processed strictly in order rather
  // than dropping `offer` when `videoSignals[videoSignals.length - 1]` is already a candidate.
  const processedSeqRef = useRef<number>(0);

  const syncCallId = useCallback((id: number | null) => {
    callIdRef.current = id;
    setCallId(id);
  }, []);

  const releaseMediaAndPeer = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidates.current = [];
    setIncomingOffer(null);
    setIsMuted(false);
    setIsVideoOff(false);
    connectedAtRef.current = null;
  }, []);

  /**
   * Terminates or declines the active call.
   *
   * `notifyPeer = false` is passed when responding to a remote `'bye'`/`'hangup'`/`'rejected'`
   * signal so the two peers do not ping-pong `'bye'` packets back and forth while
   * `VideoCallModal` remains mounted inside `MessagesPage`.
   */
  const endCall = useCallback(
    async (options: { notifyPeer?: boolean; statusOverride?: 'ended' | 'rejected' | 'missed' } = {}) => {
      if (endingRef.current) return;
      endingRef.current = true;
      const { notifyPeer = true, statusOverride } = options;
      const activeCallId = callIdRef.current;
      const elapsedSeconds = connectedAtRef.current
        ? Math.max(0, Math.round((Date.now() - connectedAtRef.current) / 1000))
        : undefined;

      releaseMediaAndPeer();

      if (notifyPeer && recipientId) {
        sendVideoSignal(recipientId, { type: 'bye' }, activeCallId || undefined);
      }

      if (activeCallId && token && notifyPeer) {
        const finalStatus = statusOverride ?? 'ended';
        try {
          await updateCallStatus(token, activeCallId, finalStatus, elapsedSeconds);
        } catch (e) {
          console.error('Failed to update call status:', e);
        }
      }

      syncCallId(null);
      setCallStatus('ended');
      onClose();
    },
    [recipientId, releaseMediaAndPeer, sendVideoSignal, syncCallId, token, onClose],
  );

  const rejectCall = useCallback(() => {
    void endCall({ notifyPeer: true, statusOverride: 'rejected' });
  }, [endCall]);

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(buildIceServers());

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendVideoSignal(
            recipientId,
            { type: 'candidate', candidate: event.candidate },
            callIdRef.current || undefined,
          );
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          if (!connectedAtRef.current) {
            connectedAtRef.current = Date.now();
          }
          setCallStatus('connected');
          if (callIdRef.current && token) {
            updateCallStatus(token, callIdRef.current, 'connected').catch(console.error);
          }
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          void endCall({ notifyPeer: true });
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [recipientId, sendVideoSignal, endCall, token],
  );

  const startCall = useCallback(
    async (stream: MediaStream) => {
      setCallStatus('calling');

      let newCallId: number | undefined;
      if (token) {
        try {
          const call = await initiateCall(token, recipientId);
          syncCallId(call.id);
          newCallId = call.id;
        } catch (e) {
          console.error('Failed to initiate call log:', e);
        }
      }

      const pc = createPeerConnection(stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendVideoSignal(recipientId, { type: 'offer', sdp: offer }, newCallId);
    },
    [createPeerConnection, recipientId, sendVideoSignal, syncCallId, token],
  );

  const handleSignal = useCallback(
    async (signal: any, signalCallId?: number) => {
      if (!signal || !signal.type) return;

      if (signal.type === 'ringing') {
        if (signalCallId && !callIdRef.current) syncCallId(signalCallId);
        if (isIncoming) setCallStatus('ringing');
      } else if (signal.type === 'offer') {
        setIncomingOffer(signal.sdp);
        if (signalCallId) syncCallId(signalCallId);
        setCallStatus('ringing');
      } else if (signal.type === 'answer') {
        const pc = peerConnectionRef.current;
        if (pc && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          while (pendingCandidates.current.length > 0) {
            const queued = pendingCandidates.current.shift();
            if (queued) await pc.addIceCandidate(queued);
          }
        }
      } else if (signal.type === 'candidate' || signal.type === 'ice-candidate') {
        if (!signal.candidate) return;
        const candidate = new RTCIceCandidate(signal.candidate);
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(candidate);
        } else {
          pendingCandidates.current.push(candidate);
        }
      } else if (signal.type === 'bye' || signal.type === 'hangup' || signal.type === 'rejected') {
        void endCall({ notifyPeer: false });
      }
    },
    [endCall, isIncoming, syncCallId],
  );

  const { processedStream, isBlurEnabled, toggleBlur, isModelLoaded } = useVideoFaceBlur(localStream);

  // Reset modal session cleanly whenever `isOpen` transitions between closed and open.
  // Because `MessagesPage` keeps `<VideoCallModal>` mounted while a conversation is selected,
  // failing to reset here previously left `callStatus === 'ended'` and stopped tracks on
  // any second call within the same conversation.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      endingRef.current = false;
      setError(null);
      syncCallId(initialCallId ?? null);
      setCallStatus(isIncoming ? 'ringing' : 'idle');

      const signals = videoSignals || [];
      const maxSeq = signals.reduce(
        (m: number, s: any) => Math.max(m, Number(s?._seq || 0)),
        0,
      );

      if (isIncoming) {
        // Locate the newest recent `offer` (within 60s) from `recipientId` so we capture
        // BOTH the triggering `offer` and any ICE `candidate`s that arrived milliseconds later
        // before React finished mounting/opening the dialog.
        const nowMs = Date.now();
        let offerIdx = -1;
        for (let i = signals.length - 1; i >= 0; i--) {
          const sig = signals[i];
          const ts = sig?.timestamp ? Date.parse(sig.timestamp) : nowMs;
          const fresh = Number.isNaN(ts) || nowMs - ts < 60_000;
          if (
            fresh &&
            String(sig?.from_user_id) === String(recipientId) &&
            sig?.signal?.type === 'offer'
          ) {
            offerIdx = i;
            break;
          }
        }

        if (offerIdx !== -1) {
          const startSeq = Number(signals[offerIdx]?._seq || 0);
          // Rewind cursor just before `offer` so the signal-drain effect below processes
          // the `offer` and every subsequent `candidate` in arrival order.
          processedSeqRef.current = Math.max(0, startSeq - 1);
        } else {
          processedSeqRef.current = maxSeq;
        }
      } else {
        // Outgoing call: ignore historical signals from earlier calls.
        processedSeqRef.current = maxSeq;
      }
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      endingRef.current = false;
      releaseMediaAndPeer();
      syncCallId(null);
      setCallStatus('idle');
      setError(null);
    }
  }, [isOpen, isIncoming, initialCallId, recipientId, releaseMediaAndPeer, syncCallId, videoSignals]);

  // Initialize local camera + microphone stream when open
  useEffect(() => {
    if (!isOpen || localStream || error) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (isIncoming) {
          setCallStatus('ringing');
        }
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        if (!cancelled) {
          setError('Could not access camera/microphone. Please check browser permissions.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, isIncoming, localStream, error]);

  // Start outgoing call once face-blur pipeline exposes `processedStream`
  useEffect(() => {
    if (isOpen && processedStream && !isIncoming && callStatus === 'idle') {
      void startCall(processedStream);
    }
  }, [isOpen, processedStream, isIncoming, callStatus, startCall]);

  // Keep PIP local video preview bound to `processedStream`
  useEffect(() => {
    const videoElement = localVideoRef.current;
    if (videoElement && processedStream) {
      videoElement.srcObject = processedStream;
    }
  }, [processedStream]);

  // Keep remote video element bound whenever `remoteStream` updates
  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    if (videoElement && remoteStream) {
      videoElement.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Drain all newly arrived signals in strict `_seq` order while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const signals = videoSignals || [];
    if (signals.length === 0) return;

    const pendingToProcess: any[] = [];
    let highestSeq = processedSeqRef.current;

    for (let i = 0; i < signals.length; i++) {
      const sig = signals[i];
      const seq = Number(sig?._seq ?? i + 1);
      if (seq <= processedSeqRef.current) continue;
      if (seq > highestSeq) highestSeq = seq;
      if (String(sig?.from_user_id) === String(recipientId)) {
        pendingToProcess.push(sig);
      }
    }

    processedSeqRef.current = highestSeq;
    if (pendingToProcess.length === 0) return;

    void (async () => {
      for (const item of pendingToProcess) {
        await handleSignal(item.signal, item.call_id);
      }
    })();
  }, [isOpen, videoSignals, recipientId, handleSignal]);

  const acceptCall = async () => {
    if (!processedStream || !incomingOffer) return;

    const pc = createPeerConnection(processedStream);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      if (candidate) await pc.addIceCandidate(candidate);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendVideoSignal(recipientId, { type: 'answer', sdp: answer }, callIdRef.current || undefined);
    connectedAtRef.current = Date.now();
    setCallStatus('connected');

    if (callIdRef.current && token) {
      updateCallStatus(token, callIdRef.current, 'connected').catch(console.error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void endCall({ notifyPeer: true });
      }}
    >
      <DialogContent className="sm:max-w-[900px] h-[80vh] dark:bg-background dark:border-border p-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">
          {recipientName ? `Video Call with ${recipientName}` : 'Video Call'}
        </DialogTitle>
        <div className="relative flex-1 bg-black">
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-4 text-center">
              <p className="text-xl font-semibold mb-2">Camera / Microphone Error</p>
              <p className="mb-4">{error}</p>
              <button
                type="button"
                onClick={() => void endCall({ notifyPeer: true })}
                className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {callStatus === 'calling'
                    ? `Calling${recipientName ? ` ${recipientName}` : ''}...`
                    : 'Waiting for video...'}
                </div>
              )}

              <div className="absolute bottom-4 right-4 w-48 h-36 bg-background rounded-lg overflow-hidden border border-border shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          )}

          {callStatus === 'ringing' && isIncoming && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
              <div className="text-2xl font-semibold text-white mb-2">
                Incoming Video Call
              </div>
              {recipientName && (
                <div className="text-sm text-neutral-300 mb-6">{recipientName}</div>
              )}
              {!incomingOffer && (
                <div className="text-xs text-neutral-400 mb-4">
                  Negotiating encrypted media session...
                </div>
              )}
              <div className="flex gap-8">
                <Button
                  size="lg"
                  aria-label="Accept video call"
                  disabled={!processedStream || !incomingOffer}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-full w-16 h-16 p-0"
                  onClick={acceptCall}
                >
                  <Phone className="w-8 h-8" />
                </Button>
                <Button
                  size="lg"
                  aria-label="Decline video call"
                  className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16 p-0"
                  onClick={rejectCall}
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <TooltipProvider>
          <div className="h-20 bg-background flex items-center justify-center gap-6 border-t border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`rounded-full w-12 h-12 ${
                    isMuted ? 'bg-red-500/20 text-red-500' : 'bg-card text-foreground'
                  }`}
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff /> : <Mic />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? 'Unmute Microphone' : 'Mute Microphone'}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="End video call"
                  className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
                  onClick={() => void endCall({ notifyPeer: true })}
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>End Call</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                  className={`rounded-full w-12 h-12 ${
                    isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-card text-foreground'
                  }`}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff /> : <Video />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}</TooltipContent>
            </Tooltip>

            {isModelLoaded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle privacy face blur"
                    className={`rounded-full w-12 h-12 ${
                      isBlurEnabled ? 'bg-blue-500/20 text-blue-500' : 'bg-card text-foreground'
                    }`}
                    onClick={toggleBlur}
                  >
                    <Ghost />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isBlurEnabled ? 'Disable Privacy Face Blur' : 'Enable Privacy Face Blur'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

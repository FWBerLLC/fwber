'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/lib/hooks/use-websocket';
import { useAuth } from '@/lib/auth-context';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Ghost } from 'lucide-react';
import { initiateCall, updateCallStatus } from '@/lib/api/video';
import { useVideoFaceBlur } from '@/lib/hooks/use-video-face-blur';

interface VideoCallModalProps {
  recipientId: string;
  isOpen: boolean;
  onClose: () => void;
  isIncoming?: boolean;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function VideoCallModal({ recipientId, isOpen, onClose, isIncoming = false }: VideoCallModalProps) {
  const { user, token } = useAuth();
  const { sendVideoSignal, videoSignals } = useWebSocket();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [callId, setCallId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);

  const endCall = useCallback(async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Send bye signal
    sendVideoSignal(recipientId, { type: 'bye' }, callId || undefined);
    
    // Update DB status
    if (callId && token) {
        try {
            await updateCallStatus(token, callId, 'ended');
        } catch (e) {
            console.error('Failed to update call status:', e);
        }
    }

    setCallStatus('ended');
    onClose();
  }, [localStream, recipientId, sendVideoSignal, onClose, callId, token]);

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendVideoSignal(recipientId, { type: 'candidate', candidate: event.candidate }, callId || undefined);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        if (callId && token) {
            updateCallStatus(token, callId, 'connected').catch(console.error);
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [recipientId, sendVideoSignal, endCall, callId, token]);

  const startCall = useCallback(async (stream: MediaStream) => {
    setCallStatus('calling');
    
    // Initiate call in DB
    let newCallId: number | undefined;
    if (token) {
        try {
            const call = await initiateCall(token, recipientId);
            setCallId(call.id);
            newCallId = call.id;
        } catch (e) {
            console.error('Failed to initiate call log:', e);
        }
    }

    const pc = createPeerConnection(stream);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    sendVideoSignal(recipientId, { type: 'offer', sdp: offer }, newCallId);
  }, [createPeerConnection, recipientId, sendVideoSignal, token]);

  const handleSignal = useCallback(async (signal: any, signalCallId?: number) => {
    if (signal.type === 'offer') {
      setIncomingOffer(signal.sdp);
      if (signalCallId) setCallId(signalCallId);
      setCallStatus('ringing');
    } else if (signal.type === 'answer') {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      }
    } else if (signal.type === 'candidate') {
      const candidate = new RTCIceCandidate(signal.candidate);
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } else {
        pendingCandidates.current.push(candidate);
      }
    } else if (signal.type === 'bye') {
      endCall();
    }
  }, [endCall]);

  const { processedStream, isBlurEnabled, toggleBlur, isModelLoaded } = useVideoFaceBlur(localStream);

  // Initialize local stream
  useEffect(() => {
    if (isOpen && !localStream && !error) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          setLocalStream(stream);
          if (isIncoming) {
            setCallStatus('ringing');
          }
        })
        .catch(err => {
          console.error('Error accessing media devices:', err);
          setError('Could not access camera/microphone. Please check permissions.');
        });
    }
  }, [isOpen, isIncoming, localStream, error]);

  // Start call when processed stream is ready
  useEffect(() => {
    if (processedStream && !isIncoming && callStatus === 'idle') {
      startCall(processedStream);
    }
  }, [processedStream, isIncoming, callStatus, startCall]);

  // Update local video preview with processed stream
  useEffect(() => {
    // Check if the ref is available and has an element
    const videoElement = localVideoRef.current;
    if (videoElement && processedStream) {
      videoElement.srcObject = processedStream;
    }
  }, [processedStream]);

  // Handle incoming signals
  useEffect(() => {
    const lastSignal = videoSignals[videoSignals.length - 1];
    if (!lastSignal || lastSignal.from_user_id !== recipientId) return;

    handleSignal(lastSignal.signal, lastSignal.call_id);
  }, [videoSignals, recipientId, handleSignal]);

  const acceptCall = async () => {
    if (!processedStream || !incomingOffer) return;
    
    const pc = createPeerConnection(processedStream);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    
    // Process pending candidates now that remote description is set
    while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        if (candidate) await pc.addIceCandidate(candidate);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    sendVideoSignal(recipientId, { type: 'answer', sdp: answer }, callId || undefined);
    setCallStatus('connected');
    
    if (callId && token) {
        updateCallStatus(token, callId, 'connected').catch(console.error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => endCall()}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] dark:bg-background dark:border-border p-0 overflow-hidden flex flex-col">
        <div className="relative flex-1 bg-black">
          {/* Error State */}
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-4 text-center">
              <p className="text-xl font-semibold mb-2">Camera Error</p>
              <p className="mb-4">{error}</p>
              <button type="button" 
                onClick={onClose} 
                className="dark:bg-muted hover:dark:bg-muted text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Remote Video */}
              {remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {callStatus === 'calling' ? 'Calling...' : 'Waiting for video...'}
                </div>
              )}

              {/* Local Video (PIP) */}
              <div className="absolute bottom-4 right-4 w-48 h-36 dark:bg-background rounded-lg overflow-hidden border dark:border-border shadow-xl">
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

          {/* Incoming Call Overlay */}
          {callStatus === 'ringing' && isIncoming && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
              <div className="text-2xl text-white mb-8">Incoming Video Call</div>
              <div className="flex gap-8">
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 rounded-full w-16 h-16 p-0"
                  onClick={acceptCall}
                >
                  <Phone className="w-8 h-8" />
                </Button>
                <Button 
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700 rounded-full w-16 h-16 p-0"
                  onClick={endCall}
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="h-20 dark:bg-background flex items-center justify-center gap-6 border-t dark:border-border">
          <Button 
            variant="ghost" 
            size="icon"
            className={`rounded-full w-12 h-12 ${isMuted ? 'bg-red-500/20 text-red-500' : 'dark:bg-card text-white'}`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          
          <Button 
            variant="destructive" 
            size="icon"
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
            onClick={endCall}
          >
            <PhoneOff className="w-8 h-8" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            className={`rounded-full w-12 h-12 ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'dark:bg-card text-white'}`}
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff /> : <Video />}
          </Button>

          {isModelLoaded && (
            <Button 
              variant="ghost" 
              size="icon"
              className={`rounded-full w-12 h-12 ${isBlurEnabled ? 'bg-blue-500/20 text-blue-500' : 'dark:bg-card text-white'}`}
              onClick={toggleBlur}
              title="Toggle Face Blur"
            >
              <Ghost />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

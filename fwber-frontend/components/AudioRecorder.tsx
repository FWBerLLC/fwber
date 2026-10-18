'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Send, Trash2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioFile: File, duration: number) => void;
  isSending?: boolean;
  onRecordingStateChange?: (isActive: boolean) => void;
  onError?: (error: string) => void;
}

export default function AudioRecorder({ 
  onRecordingComplete, 
  isSending, 
  onRecordingStateChange,
  onError 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Determine supported mime type
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Let the browser choose default
  };

  // Helper to notify parent of state changes
  const notifyStateChange = (active: boolean) => {
    if (onRecordingStateChange) {
      onRecordingStateChange(active);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        
        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      notifyStateChange(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      const errorMessage = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please check your permissions.'
        : 'Could not access microphone.';
      
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Still active because we have a blob to preview
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Ensure tracks are stopped
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setAudioBlob(null);
    setDuration(0);
    notifyStateChange(false);
  };

  const sendRecording = () => {
    if (audioBlob) {
      // Determine file extension based on mime type
      const mimeType = audioBlob.type;
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      
      const file = new File([audioBlob], `voice-message.${ext}`, { type: mimeType });
      onRecordingComplete(file, duration);
      
      // Cleanup
      setAudioBlob(null);
      setDuration(0);
      notifyStateChange(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-muted dark:bg-card dark:dark:bg-muted p-2 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground w-10">{formatDuration(duration)}</span>
          <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 w-40 md:w-48" />
        </div>
        <button type="button"
          onClick={() => {
            setAudioBlob(null);
            setDuration(0);
            notifyStateChange(false);
          }}
          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
          title="Delete"
          type="button"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button
          onClick={sendRecording}
          disabled={isSending}
          className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50"
          title="Send"
          type="button"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg w-full animate-pulse">
        <div className="flex-1 flex items-center gap-2">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
          <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
            Recording {formatDuration(duration)}
          </span>
        </div>
        <button
          onClick={cancelRecording}
          className="p-2 text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:dark:bg-muted rounded-full transition-colors"
          title="Cancel"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={stopRecording}
          className="p-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-full transition-colors"
          title="Stop & Review"
          type="button"
        >
          <Square className="h-5 w-5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="p-2 text-muted-foreground hover:text-white hover:dark:bg-muted rounded-full transition-colors"
      title="Record Voice Message"
      type="button"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}

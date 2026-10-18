'use client';

import React from 'react';
import { MessageStatus } from '@/lib/hooks/use-websocket';
import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';

interface MessageStatusIndicatorProps {
  status?: MessageStatus;
  className?: string;
  showText?: boolean;
}

/**
 * Visual indicator for message delivery and read status
 * - Sending: Clock icon (gray)
 * - Sent: Single check (gray)
 * - Delivered: Double check (gray)
 * - Read: Double check (blue)
 * - Failed: X icon (red)
 */
export function MessageStatusIndicator({ 
  status = 'sent', 
  className = '',
  showText = false 
}: MessageStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className={`w-4 h-4 text-muted-foreground ${className}`} />;
      case 'sent':
        return <Check className={`w-4 h-4 text-muted-foreground ${className}`} />;
      case 'delivered':
        return <CheckCheck className={`w-4 h-4 text-muted-foreground ${className}`} />;
      case 'read':
        return <CheckCheck className={`w-4 h-4 text-blue-500 ${className}`} />;
      case 'failed':
        return <XCircle className={`w-4 h-4 text-red-500 ${className}`} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      case 'failed':
        return 'Failed to send';
      default:
        return '';
    }
  };

  const statusTextColor = 
    status === 'failed' ? 'text-red-500' : 
    status === 'read' ? 'text-blue-500' : 
    'text-muted-foreground';

  return (
    <div className="flex items-center gap-1">
      {getStatusIcon()}
      {showText && (
        <span className={`text-xs ${statusTextColor}`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}

/**
 * Formatted timestamp with relative time
 */
export function MessageTimestamp({ 
  timestamp, 
  className = '' 
}: { 
  timestamp: string | number | Date; 
  className?: string 
}) {
  const formatTime = (ts: string | number | Date) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // Format as date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <span className={`text-xs text-muted-foreground ${className}`} title={new Date(timestamp).toLocaleString()}>
      {formatTime(timestamp)}
    </span>
  );
}

/**
 * Combined message metadata display (timestamp + status)
 */
export function MessageMetadata({ 
  timestamp, 
  status,
  isOwnMessage = false,
  className = '' 
}: { 
  timestamp: string | number | Date;
  status?: MessageStatus;
  isOwnMessage?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MessageTimestamp timestamp={timestamp} />
      {isOwnMessage && status && <MessageStatusIndicator status={status} />}
    </div>
  );
}

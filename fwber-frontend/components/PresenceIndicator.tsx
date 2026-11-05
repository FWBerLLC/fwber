'use client'

import React from 'react'
import Image from 'next/image'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  lastSeen?: string;
  className?: string;
}

/**
 * Visual presence indicator showing user online status
 * - Online: Green dot
 * - Away: Yellow dot
 * - Busy: Red dot
 * - Offline: Gray dot
 */
export function PresenceIndicator({ 
  status, 
  size = 'md',
  showLabel = false,
  lastSeen,
  className = '' 
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-muted',
  };

  const labelText = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy',
    offline: lastSeen ? getLastSeenText(lastSeen) : 'Offline',
  };

  function getLastSeenText(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Active just now';
    if (diff < 3600000) return `Active ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `Active ${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `Active ${Math.floor(diff / 86400000)}d ago`;
    return `Last seen ${date.toLocaleDateString()}`;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} ${colorClasses[status]} rounded-full border-2 border-white`} />
      {showLabel && (
        <span className="text-sm text-muted-foreground dark:text-muted-foreground">
          {labelText[status]}
        </span>
      )}
    </div>
  );
}

/**
 * User avatar with presence indicator
 */
interface UserAvatarProps {
  name: string;
  imageUrl?: string;
  status?: PresenceStatus;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ 
  name, 
  imageUrl, 
  status = 'offline',
  size = 'md',
  className = '' 
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const indicatorPosition = {
    sm: 'bottom-0 right-0',
    md: 'bottom-0 right-0',
    lg: 'bottom-0.5 right-0.5',
    xl: 'bottom-1 right-1',
  };

  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`relative inline-block ${className}`}>
      {imageUrl ? (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative`}>
          <Image 
            src={imageUrl} 
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-red-600 flex items-center justify-center text-white font-bold`}>
          {initial}
        </div>
      )}
      {status && (
        <div className={`absolute ${indicatorPosition[size]}`}>
          <PresenceIndicator status={status} size={size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm'} />
        </div>
      )}
    </div>
  );
}

/**
 * Online users list component
 */
interface OnlineUsersListProps {
  users: Array<{
    user_id: string;
    status?: string;
    last_seen?: string;
    metadata?: { name?: string; avatar?: string };
  }>;
  className?: string;
  onUserClick?: (userId: string) => void;
}

export function OnlineUsersList({ users, className = '', onUserClick }: OnlineUsersListProps) {
  return (
    <div className={`dark:bg-card rounded-lg p-4 ${className}`}>
      <h3 className="text-white font-semibold mb-3">Online Now ({users.length})</h3>
      <div className="space-y-2">
        {users.map(user => (
          <button type="button"
            key={user.user_id}
            onClick={() => onUserClick?.(user.user_id)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:dark:bg-muted transition-colors text-left"
          >
            <UserAvatar 
              name={user.metadata?.name || user.user_id}
              imageUrl={user.metadata?.avatar}
              status={user.status as PresenceStatus || 'offline'}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {user.metadata?.name || user.user_id}
              </p>
              <PresenceIndicator 
                status={user.status as PresenceStatus || 'offline'}
                lastSeen={user.last_seen}
                showLabel
              />
            </div>
          </button>
        ))}
        {users.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No users online</p>
        )}
      </div>
    </div>
  );
}

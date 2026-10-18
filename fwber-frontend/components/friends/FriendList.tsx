'use client';

import Link from 'next/link';
import { PresenceIndicator } from '@/components/realtime/PresenceComponents';
import TipButton from '@/components/tipping/TipButton';
import { MessageSquare, User, Trash2 } from 'lucide-react';

interface Friend {
  id: number;
  name: string;
  email: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface FriendListProps {
  friends: Friend[];
  onRemoveFriend: (friendId: number) => void;
}

export default function FriendList({ friends, onRemoveFriend }: FriendListProps) {
  if (friends.length === 0) {
    return (
      <div className="text-center py-8 bg-card dark:bg-card rounded-lg shadow">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No friends yet</p>
        <p className="text-sm text-muted-foreground">Search for users above to add friends</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <div 
          key={friend.id} 
          className="flex items-center justify-between p-4 bg-card dark:bg-card rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            {/* Avatar with presence indicator */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {(friend.profile?.display_name || friend.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5">
                <PresenceIndicator userId={String(friend.id)} size="sm" />
              </div>
            </div>
            
            {/* Friend info */}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground dark:text-foreground">
                  {friend.profile?.display_name || friend.name}
                </p>
                <PresenceIndicator userId={String(friend.id)} showLabel size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">{friend.email}</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <TipButton
              recipientId={friend.id}
              recipientName={friend.profile?.display_name || friend.name}
              compact={true}
            />
            <Link
              href={`/messages?user=${friend.id}`}
              className="flex items-center gap-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Link>
            <Link
              href={`/profile/${friend.id}`}
              className="flex items-center gap-1 px-3 py-2 bg-muted dark:bg-card hover:bg-muted text-foreground dark:text-muted-foreground rounded-lg text-sm font-medium transition-colors"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button type="button"
              onClick={() => onRemoveFriend(friend.id)}
              className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              title="Remove friend"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

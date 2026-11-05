import React from 'react';
import Link from 'next/link';
import { Users, Lock, Globe, Coins, Hash } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Group } from '@/lib/api/groups';
import { useJoinGroup, useLeaveGroup } from '@/lib/hooks/use-groups';
import { useWallet } from '@/lib/hooks/useWallet';

interface GroupCardProps {
  group: Group & { token_entry_fee?: number };
}

export function GroupCard({ group }: GroupCardProps) {
  const joinGroup = useJoinGroup();
  const leaveGroup = useLeaveGroup();
  const { data: wallet } = useWallet();

  const isMember = group.is_member;
  
  const handleJoin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (group.token_entry_fee && group.token_entry_fee > 0) {
        if (!confirm(`Join this group for ${group.token_entry_fee} tokens?`)) return;
    }
    joinGroup.mutate(group.id);
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to leave this group?')) {
        leaveGroup.mutate(group.id);
    }
  };

  return (
    <Link href={`/groups/${group.id}`}>
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{group.icon || '👥'}</span>
              <CardTitle className="text-lg">{group.name}</CardTitle>
            </div>
            <div className="flex flex-col gap-1 items-end">
                {group.privacy === 'private' ? (
                <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Private</Badge>
                ) : (
                <Badge variant="outline"><Globe className="w-3 h-3 mr-1" /> Public</Badge>
                )}
                {group.token_entry_fee && group.token_entry_fee > 0 && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        <Coins className="w-3 h-3 mr-1" /> {group.token_entry_fee} FWB
                    </Badge>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {group.description || 'No description provided.'}
          </p>
          {(group.category || (group.tags && group.tags.length > 0)) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {group.category && (
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                  <Hash className="mr-1 h-3 w-3" />
                  <span>{group.category}</span>
                </span>
              )}
              {group.tags?.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-muted dark:bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {group.member_count} members
            </div>
            {isMember && <span className="text-green-600 font-medium text-xs">Joined</span>}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            variant={isMember ? "outline" : "default"}
            onClick={isMember ? handleLeave : handleJoin}
          >
            {isMember ? 'Leave Group' : (group.token_entry_fee && group.token_entry_fee > 0 ? `Join (${group.token_entry_fee} 🪙)` : 'Join Group')}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

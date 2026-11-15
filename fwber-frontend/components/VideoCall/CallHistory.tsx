import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getCallHistory, VideoCallLog } from '@/lib/api/video';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';

export function CallHistory() {
  const { token, user } = useAuth();
  const [history, setHistory] = useState<VideoCallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getCallHistory(token)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading history...</div>;
  }

  if (!Array.isArray(history) || history.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No call history yet.</div>;
  }

  return (
    <div className="space-y-2">
      {(history || []).map((call) => {
        const isCaller = Number(call.caller_id) === Number(user?.id);
        const otherUser = call.other_user || (isCaller ? call.receiver : call.caller);
        const displayName = otherUser?.display_name || otherUser?.name || call.partner_name || 'Unknown User';
        const date = new Date(call.started_at || call.created_at); // Fallback to created_at if started_at is null

        let Icon = Phone;
        let color = 'text-muted-foreground';

        if (call.status === 'missed') {
          Icon = PhoneMissed;
          color = 'text-red-500';
        } else if (call.status === 'rejected') {
          Icon = PhoneMissed;
          color = 'text-amber-500';
        } else if (isCaller) {
          Icon = PhoneOutgoing;
          color = 'text-blue-500';
        } else {
          Icon = PhoneIncoming;
          color = 'text-green-500';
        }

        return (
          <div key={call.id} className="flex items-center justify-between p-3 bg-card dark:bg-card rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-muted dark:bg-background ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-foreground dark:text-foreground">{displayName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {date.toLocaleDateString()} {date.toLocaleTimeString()}
                  {Boolean(call.duration && call.duration > 0) && (
                    <>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(call.duration!)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium capitalize text-muted-foreground">
              {call.status}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

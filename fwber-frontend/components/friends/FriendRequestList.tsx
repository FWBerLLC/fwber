'use client';

interface FriendRequest {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  user?: {
    id: number;
    name?: string;
    email?: string;
  };
}

interface FriendRequestListProps {
  friendRequests: FriendRequest[];
  onRespondToRequest: (requesterUserId: number, status: 'accepted' | 'declined') => void;
}

export default function FriendRequestList({ friendRequests, onRespondToRequest }: FriendRequestListProps) {
  return (
    <div className="space-y-4">
      {friendRequests.map((request) => (
        <div key={request.id} className="flex items-center justify-between p-4 bg-card dark:bg-card rounded-lg shadow">
          <div>
            <p className="font-semibold">{request.user?.name || 'Unknown User'}</p>
            <p className="text-sm text-muted-foreground">{request.user?.email || ''}</p>
          </div>
          <div className="space-x-4">
            <button type="button"
              onClick={() => request.user?.id && onRespondToRequest(request.user.id, 'accepted')}
              disabled={!request.user?.id}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Accept
            </button>
            <button type="button"
              onClick={() => request.user?.id && onRespondToRequest(request.user.id, 'declined')}
              disabled={!request.user?.id}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HeartHandshake, Link2, Search, UserPlus, Users } from 'lucide-react';
import FriendList from '@/components/friends/FriendList';
import FriendRequestList from '@/components/friends/FriendRequestList';
import { api } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/use-toast';
import {
  createRelationshipLink,
  deleteRelationshipLink,
  getPendingRelationshipLinkRequests,
  getRelationshipLinks,
  respondToRelationshipLink,
  updateRelationshipLink,
  type RelationshipLink,
  type RelationshipLinkType,
  type RelationshipLinkVisibility,
} from '@/lib/api/relationships';

interface FriendUser {
  id: number;
  name: string;
  email: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface FriendRequest {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  user?: FriendUser;
}

const relationshipTypeOptions: RelationshipLinkType[] = ['dating', 'partner', 'spouse', 'other'];
const relationshipVisibilityOptions: RelationshipLinkVisibility[] = ['public', 'friends', 'private'];

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [relationshipLinks, setRelationshipLinks] = useState<RelationshipLink[]>([]);
  const [relationshipRequests, setRelationshipRequests] = useState<RelationshipLink[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipLinkType>('dating');
  const [relationshipVisibility, setRelationshipVisibility] = useState<RelationshipLinkVisibility>('friends');
  const [relationshipNote, setRelationshipNote] = useState('');
  const [loading, setLoading] = useState(true);
  const { success, error, ToastContainer } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [friendsRes, requestsRes, linksRes, linkRequestsRes] = await Promise.all([
        api.get<FriendUser[]>('/friends'),
        api.get<FriendRequest[]>('/friends/requests'),
        getRelationshipLinks(),
        getPendingRelationshipLinkRequests(),
      ]);
      setFriends(Array.isArray(friendsRes) ? friendsRes : []);
      setRequests(Array.isArray(requestsRes) ? requestsRes : []);
      setRelationshipLinks(Array.isArray(linksRes) ? linksRes : []);
      setRelationshipRequests(Array.isArray(linkRequestsRes) ? linkRequestsRes : []);
    } catch (err) {
      console.error('Error fetching friends data:', err);
      error('Failed to load friends data');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await api.get<FriendUser[]>('/friends/search', {
        params: { q: searchQuery },
      });
      setSearchResults(Array.isArray(response) ? response : []);
      setActiveTab('search');
    } catch (err) {
      console.error('Error searching users:', err);
      error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (userId: number) => {
    try {
      await api.post('/friends/requests', { friend_id: userId });
      success('Friend request sent');
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      console.error('Error sending friend request:', err);
      error('Failed to send friend request');
    }
  };

  const handleRespondToRequest = async (requesterUserId: number, status: 'accepted' | 'declined') => {
    try {
      await api.post(`/friends/requests/${requesterUserId}`, { status });
      success(status === 'accepted' ? 'Friend request accepted' : 'Friend request rejected');
      fetchData();
    } catch (err) {
      console.error('Error responding to friend request:', err);
      error(`Failed to ${status === 'accepted' ? 'accept' : 'reject'} friend request`);
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    

    try {
      await api.delete(`/friends/${friendId}`);
      success('Friend removed');
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      setRelationshipLinks((prev) => prev.filter((link) => link.related_user?.id !== friendId));
    } catch (err) {
      console.error('Error removing friend:', err);
      error('Failed to remove friend');
    }
  };

  const handleCreateRelationshipLink = async () => {
    if (!selectedFriendId) {
      error('Choose a friend first.');
      return;
    }

    try {
      await createRelationshipLink({
        related_user_id: Number(selectedFriendId),
        relationship_type: relationshipType,
        visibility: relationshipVisibility,
        note: relationshipNote.trim() || undefined,
      });
      setSelectedFriendId('');
      setRelationshipType('dating');
      setRelationshipVisibility('friends');
      setRelationshipNote('');
      success('Relationship link request sent.');
      fetchData();
    } catch (err) {
      console.error('Error creating relationship link:', err);
      error('Failed to send relationship link request');
    }
  };

  const handleRespondToRelationshipLink = async (linkId: number, status: 'accepted' | 'declined') => {
    try {
      await respondToRelationshipLink(linkId, status);
      success(status === 'accepted' ? 'Relationship link confirmed.' : 'Relationship link request declined.');
      fetchData();
    } catch (err) {
      console.error('Error responding to relationship link:', err);
      error('Failed to respond to relationship link request');
    }
  };

  const handleUpdateRelationshipLink = async (
    linkId: number,
    payload: Partial<{ relationship_type: RelationshipLinkType; visibility: RelationshipLinkVisibility; note: string | null }>
  ) => {
    try {
      const updatedLink = await updateRelationshipLink(linkId, payload);
      setRelationshipLinks((prev) => prev.map((link) => (link.id === linkId ? updatedLink : link)));
      success('Relationship link updated.');
    } catch (err) {
      console.error('Error updating relationship link:', err);
      error('Failed to update relationship link');
    }
  };

  const handleDeleteRelationshipLink = async (linkId: number) => {
    

    try {
      await deleteRelationshipLink(linkId);
      setRelationshipLinks((prev) => prev.filter((link) => link.id !== linkId));
      success('Relationship link removed.');
    } catch (err) {
      console.error('Error deleting relationship link:', err);
      error('Failed to remove relationship link');
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <ToastContainer />
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Friends & Connections</h1>
          <p className="text-muted-foreground">Manage your friends, requests, and mutual relationship links</p>
        </div>

        <form onSubmit={handleSearch} className="flex w-full gap-2 md:w-auto">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={activeTab === 'friends' ? 'default' : 'outline'}
          onClick={() => setActiveTab('friends')}
          className="flex gap-2"
        >
          <Users className="h-4 w-4" />
          Friends ({friends.length})
        </Button>
        <Button
          variant={activeTab === 'requests' ? 'default' : 'outline'}
          onClick={() => setActiveTab('requests')}
          className="flex gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Requests ({requests.length})
        </Button>
        <Button
          variant={activeTab === 'relationships' ? 'default' : 'outline'}
          onClick={() => setActiveTab('relationships')}
          className="flex gap-2"
        >
          <HeartHandshake className="h-4 w-4" />
          Links ({relationshipLinks.length})
        </Button>
        <Button
          variant={activeTab === 'relationship-requests' ? 'default' : 'outline'}
          onClick={() => setActiveTab('relationship-requests')}
          className="flex gap-2"
        >
          <Link2 className="h-4 w-4" />
          Link Requests ({relationshipRequests.length})
        </Button>
        {searchResults.length > 0 && (
          <Button
            variant={activeTab === 'search' ? 'default' : 'outline'}
            onClick={() => setActiveTab('search')}
          >
            Search Results
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <FriendList friends={friends} onRemoveFriend={handleRemoveFriend} />
              )}

              {activeTab === 'requests' && (
                <FriendRequestList
                  friendRequests={requests}
                  onRespondToRequest={handleRespondToRequest}
                />
              )}

              {activeTab === 'relationships' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Create a relationship link</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Relationship links require mutual confirmation and work only with accepted friends.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Friend</span>
                        <select
                          value={selectedFriendId}
                          onChange={(e) => setSelectedFriendId(e.target.value)}
                          className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
                        >
                          <option value="">Select a friend</option>
                          {(friends || []).map((friend) => (
                            <option key={friend.id} value={friend.id}>
                              {friend.profile?.display_name || friend.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Relationship type</span>
                        <select
                          value={relationshipType}
                          onChange={(e) => setRelationshipType(e.target.value as RelationshipLinkType)}
                          className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
                        >
                          {relationshipTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Visibility</span>
                        <select
                          value={relationshipVisibility}
                          onChange={(e) => setRelationshipVisibility(e.target.value as RelationshipLinkVisibility)}
                          className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
                        >
                          {relationshipVisibilityOptions.map((option) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Note</span>
                        <input
                          value={relationshipNote}
                          onChange={(e) => setRelationshipNote(e.target.value)}
                          maxLength={280}
                          placeholder="Optional context for the other person"
                          className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button onClick={handleCreateRelationshipLink}>Send link request</Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {relationshipLinks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No confirmed relationship links yet.</p>
                    ) : (
                      (relationshipLinks || []).map((link) => (
                        <RelationshipLinkCard
                          key={link.id}
                          link={link}
                          onSave={handleUpdateRelationshipLink}
                          onDelete={handleDeleteRelationshipLink}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'relationship-requests' && (
                <div className="space-y-4">
                  {relationshipRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending relationship link requests.</p>
                  ) : (
                    (relationshipRequests || []).map((link) => (
                      <div key={link.id} className="rounded-lg border border-border dark:border-border p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold text-foreground dark:text-foreground">
                              {link.related_user?.display_name || link.related_user?.name || 'Connection'} wants to link as{' '}
                              {link.relationship_type_label.toLowerCase()}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Visibility: {link.visibility_label}
                            </p>
                            {link.note && (
                              <p className="mt-2 text-sm text-muted-foreground">{link.note}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleRespondToRelationshipLink(link.id, 'accepted')}>Accept</Button>
                            <Button variant="outline" onClick={() => handleRespondToRelationshipLink(link.id, 'declined')}>
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'search' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Search Results</h3>
                  {searchResults.length === 0 ? (
                    <p className="text-muted-foreground">No users found</p>
                  ) : (
                    <div className="grid gap-4">
                      {(searchResults || []).map((user: FriendUser) => (
                        <div key={user.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              {user.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => sendFriendRequest(user.id)}>
                            Add Friend
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RelationshipLinkCard({
  link,
  onSave,
  onDelete,
}: {
  link: RelationshipLink;
  onSave: (
    linkId: number,
    payload: Partial<{ relationship_type: RelationshipLinkType; visibility: RelationshipLinkVisibility; note: string | null }>
  ) => void;
  onDelete: (linkId: number) => void;
}) {
  const [relationshipType, setRelationshipType] = useState<RelationshipLinkType>(link.relationship_type);
  const [visibility, setVisibility] = useState<RelationshipLinkVisibility>(link.visibility);
  const [note, setNote] = useState(link.note || '');

  return (
    <div className="rounded-2xl border border-border dark:border-border p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold text-foreground dark:text-foreground">
            {link.related_user?.display_name || link.related_user?.name || 'Connection'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmed {link.confirmed_at ? new Date(link.confirmed_at).toLocaleDateString() : 'recently'}
          </p>
        </div>
        <Button variant="outline" onClick={() => onDelete(link.id)}>
          Remove
        </Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Relationship type</span>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipLinkType)}
            className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
          >
            {relationshipTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Visibility</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as RelationshipLinkVisibility)}
            className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
          >
            {relationshipVisibilityOptions.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            className="w-full rounded-lg border border-border dark:border-border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => onSave(link.id, { relationship_type: relationshipType, visibility, note: note || null })}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

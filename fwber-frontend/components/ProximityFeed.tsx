"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { proximityApi } from '@/lib/api/proximity';
import type { ProximityArtifact, ProximityChatroom } from '@/types/proximity';
import { MapPin, Send, AlertTriangle, Trash2, Clock, User, MessageSquare, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import InspireQuote from './InspireQuote';
import ArtifactVoting from './proximity/ArtifactVoting';
import ArtifactComments from './proximity/ArtifactComments';

export default function ProximityFeed() {
  const router = useRouter();
  const { token: authToken, user } = useAuth();
  // Allow mock token for testing or fallback to stored token
  const token = authToken || (typeof window !== 'undefined' ? (localStorage.getItem('fwber_token') || localStorage.getItem('mock_auth_token')) : null);

  const [artifacts, setArtifacts] = useState<ProximityArtifact[]>([]);
  const [chatrooms, setChatrooms] = useState<ProximityChatroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [newArtifactContent, setNewArtifactContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [expandedCommentsId, setExpandedCommentsId] = useState<number | null>(null);

  // Get user location
  useEffect(() => {
    // Dev/Test bypass
    if (typeof window !== 'undefined' && localStorage.getItem('mock_geo')) {
      setLocation({ lat: 40.7128, lng: -74.0060 });
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Could not get your location. Please enable location services.");
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setIsLoading(false);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    if (!token || !location) return;

    try {
      setIsLoading(true);

      const [artifactsRes, chatroomsRes] = await Promise.allSettled([
        proximityApi.getArtifactsFeed(location.lat, location.lng, 5000, undefined, token),
        proximityApi.findNearbyChatrooms(location.lat, location.lng, 5000, token)
      ]);

      if (artifactsRes.status === 'fulfilled') {
        setArtifacts(artifactsRes.value.artifacts);
      } else {
        console.error("Failed to load artifacts", artifactsRes.reason);
      }

      if (chatroomsRes.status === 'fulfilled') {
        setChatrooms(chatroomsRes.value.chatrooms);
      } else {
        console.warn("Failed to load chatrooms", chatroomsRes.reason);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load local pulse.");
    } finally {
      setIsLoading(false);
    }
  }, [token, location]);

  useEffect(() => {
    if (location && token) {
      loadFeed();
    }
  }, [location, token, loadFeed]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !location || !newArtifactContent.trim()) return;

    try {
      setIsPosting(true);
      await proximityApi.createArtifact({
        type: 'board_post',
        content: newArtifactContent,
        lat: location.lat,
        lng: location.lng,
      }, token);
      setNewArtifactContent('');
      loadFeed(); // Reload feed
    } catch (err) {
      console.error(err);
      alert("Failed to post artifact.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleFlag = async (id: number) => {
    if (!token) return;
    if (!confirm("Report this content as inappropriate?")) return;
    try {
      await proximityApi.flagArtifact(id, token);
      alert("Content reported. Thank you.");
      // Optimistically remove or hide
      setArtifacts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to report content.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!confirm("Delete this post?")) return;
    try {
      await proximityApi.deleteArtifact(id, token);
      setArtifacts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete post.");
    }
  };

  const toggleComments = (id: number) => {
    setExpandedCommentsId(prev => prev === id ? null : id);
  };

  const handleLeaveRoom = async (e: React.MouseEvent, roomId: number) => {
    e.stopPropagation(); // Prevent navigation
    if (!token || !confirm("Are you sure you want to leave this chatroom?")) return;

    try {
      await proximityApi.leaveChatroom(roomId, token);
      // Optimistically update UI
      setChatrooms(prev => prev.map(room =>
        room.id === roomId ? { ...room, is_member: false } : room
      ));
    } catch (err) {
      console.error(err);
      alert("Failed to leave room.");
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        <AlertTriangle className="h-10 w-10 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading && !artifacts.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        Finding local pulse...
        <div data-testid="debug-info" className="hidden">
          {JSON.stringify({ hasToken: !!token, hasLocation: !!location, isLoading })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <InspireQuote />
      {/* Post Input */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <form onSubmit={handlePost}>
          <textarea
            className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3"
            rows={3}
            placeholder="What's happening nearby?"
            value={newArtifactContent}
            onChange={(e) => setNewArtifactContent(e.target.value)}
          />
          <div className="flex justify-between items-center mt-3">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location ? "Location acquired" : "Locating..."}
            </div>
            <button
              type="submit"
              disabled={isPosting || !location || !newArtifactContent.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Post
            </button>
          </div>
        </form>
      </div>

      {/* Chatrooms Section */}
      {chatrooms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Nearby Chatrooms
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {chatrooms.map(room => (
              <div key={room.id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-purple-500 hover:shadow-md transition-shadow cursor-pointer">
                <h4 className="font-bold text-gray-900 dark:text-white">{room.name}</h4>
                {room.description && <p className="text-sm text-gray-600 mb-2">{room.description}</p>}
                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                  <span>{room.active_members_count} active</span>
                  <span>{location ? `${Math.round(getDistanceFromLatLonInM(location.lat, location.lng, room.lat, room.lng))}m away` : 'Nearby'}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => router.push(`/proximity-chatrooms/${room.id}`)}
                    className={`flex-1 text-white text-sm font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 ${room.is_member
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                  >
                    {room.is_member ? 'Enter Room' : 'Join Room'}
                  </button>

                  {room.is_member && (
                    <button type="button"
                      onClick={(e) => handleLeaveRoom(e, room.id)}
                      className="bg-gray-100 dark:bg-gray-800 hover:bg-red-100 text-gray-500 hover:text-red-600 py-2 px-3 rounded transition-colors border border-gray-200 dark:border-gray-700"
                      title="Leave Room"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {artifacts.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <div className="mb-2">📡</div>
            No activity nearby. Be the first to post!
          </div>
        ) : (
          artifacts.map((artifact) => (
            <div key={artifact.id} className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex gap-3 ${artifact.type === 'promotion' ? 'border border-amber-300 bg-amber-50/30' : ''}`}>

              {/* Left Column: Voting (Hidden for Promotions currently though backend supports it) */}
              {!artifact.type?.includes('promotion') && (
                <ArtifactVoting
                  artifactId={artifact.id}
                  initialScore={artifact.votes_sum_value || 0}
                  initialUserVote={artifact.user_vote || 0}
                />
              )}

              {/* Right Column: Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full ${artifact.type === 'promotion' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {artifact.type === 'promotion' ? (
                        <div className="h-4 w-4 flex items-center justify-center font-bold">P</div>
                      ) : (
                        <User className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-sm">
                        {artifact.type === 'promotion'
                          ? (artifact.meta?.merchant_name || "Merchant Promotion")
                          : `User #${artifact.user_id}`
                        }
                      </span>
                      {artifact.type === 'promotion' && (
                        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Sponsored</span>
                      )}
                    </div>
                    {!artifact.type?.includes('promotion') && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-1">
                        <Clock className="h-3 w-3" />
                        {new Date(artifact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.id === artifact.user_id ? (
                      <button type="button"
                        onClick={() => handleDelete(artifact.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button type="button"
                        onClick={() => handleFlag(artifact.id)}
                        className="text-gray-400 hover:text-yellow-600"
                        title="Report"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Promotion Content */}
                {artifact.type === 'promotion' && artifact.meta && (
                  <div className="mb-2 p-2 bg-amber-100/50 rounded border border-amber-200">
                    {artifact.meta.title && <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1">{artifact.meta.title}</h4>}
                    <div className="flex justify-between items-center">
                      {artifact.meta.discount && <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded text-xs">-{artifact.meta.discount}% OFF</span>}
                      {artifact.meta.promo_code && <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 border border-gray-200 dark:border-gray-700">CODE: {artifact.meta.promo_code}</span>}
                    </div>
                  </div>
                )}

                <p className="text-gray-800 dark:text-gray-100 mb-3 whitespace-pre-wrap">{artifact.content}</p>

                <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-full">
                      <MapPin className="h-3 w-3" />
                      {location ? `${Math.round(getDistanceFromLatLonInM(location.lat, location.lng, artifact.lat, artifact.lng))}m away` : 'Nearby'}
                    </span>
                    <button type="button"
                      onClick={() => toggleComments(artifact.id)}
                      className="flex items-center gap-1 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-full transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {artifact.comments_count || 0} {artifact.comments_count === 1 ? 'Comment' : 'Comments'}
                    </button>
                    {!artifact.type?.includes('promotion') && (
                      <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(artifact.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <ArtifactComments
                  artifactId={artifact.id}
                  isOpen={expandedCommentsId === artifact.id}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

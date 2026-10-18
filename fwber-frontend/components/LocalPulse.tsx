'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLocalPulse, useCreateProximityArtifact, useFlagProximityArtifact, useVoteArtifact, useCommentArtifact } from '@/lib/hooks/use-proximity';
import { useLocalPulseRealtime } from '@/lib/hooks/use-local-pulse-realtime';
import { useTopics } from '@/lib/hooks/use-topics';
import { useActiveQuests, useAcceptQuest, useCompleteQuest } from '@/lib/hooks/use-quests';
import { EvolvingAvatar } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/utils/avatar';

import { apiClient } from '@/lib/api/client';
import {
  MapPin,
  MessageCircle,
  Users,
  Target,
  CheckCircle2,
  Heart,
  Clock,
  AlertCircle,
  Send,
  Flag,
  Megaphone,
  StickyNote,
  Sparkles,
  Coins,
  Camera,
  Tag,
  ShoppingBag,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { ProximityArtifact, MatchCandidate, ArtifactType } from '@/types/proximity';
import ARView from './ar/ARView';
import { ZKProver } from './proximity/ZKProver';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

const ArtifactTypeIcon = ({ type }: { type: ArtifactType }) => {
  switch (type) {
    case 'chat':
      return <MessageCircle className="h-5 w-5" />;
    case 'board_post':
      return <StickyNote className="h-5 w-5" />;
    case 'announce':
      return <Megaphone className="h-5 w-5" />;
    case 'token_drop':
      return <Coins className="h-5 w-5" />;
    case 'promotion':
      return <ShoppingBag className="h-5 w-5" />;
  }
};

const ArtifactCard = ({
  artifact,
  onFlag,
  onClaim,
  onVote,
  onComment
}: {
  artifact: ProximityArtifact;
  onFlag: (id: number) => void;
  onClaim: (id: number) => void;
  onVote: (id: number, value: number) => void;
  onComment: (id: number, content: string, parentId?: string) => void;
}) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (showComments) {
      apiClient.get(`/proximity/artifacts/${artifact.id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setComments(res.data.data || []));
    }
  }, [showComments, artifact.id, token]);

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h remaining`;
    if (minutes > 0) return `${minutes}m remaining`;
    return 'Expiring soon';
  };

  const typeColors = {
    chat: 'bg-blue-50 border-blue-200 text-blue-800',
    board_post: 'bg-green-50 border-green-200 text-green-800',
    announce: 'bg-purple-50 border-purple-200 text-purple-800',
    token_drop: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    promotion: 'bg-amber-50 border-amber-200 text-amber-900 ring-1 ring-amber-300',
  };

  const isClaimed = artifact.meta?.claimed;
  const amount = artifact.meta?.amount;
  const isPromotion = artifact.type === 'promotion';
  const hasVoting = !isPromotion && artifact.type !== 'token_drop';
  const score = artifact.votes_sum_value ?? 0;
  const userVote = artifact.user_vote ?? 0;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(artifact.id, commentText);
    setCommentText('');
    // For simplicity, we trigger a refetch via the parent, but we could also append locally
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onComment(artifact.id, replyText, parentId.toString());
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className={`rounded-lg border p-4 flex gap-4 ${typeColors[artifact.type]} ${isPromotion ? 'shadow-sm' : ''}`}>
      {/* Vote Component */}
      {hasVoting && (
        <div className="flex flex-col items-center justify-start space-y-1 w-8 flex-shrink-0">
          <button type="button"
            onClick={() => onVote(artifact.id, userVote === 1 ? 0 : 1)}
            className={`p-1 rounded hover:bg-black/5 transition-colors ${userVote === 1 ? 'text-orange-600' : 'text-muted-foreground'}`}
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <span className={`font-bold text-sm ${userVote === 1 ? 'text-orange-600' : userVote === -1 ? 'text-blue-600' : 'text-foreground dark:text-muted-foreground'}`}>
            {score}
          </span>
          <button type="button"
            onClick={() => onVote(artifact.id, userVote === -1 ? 0 : -1)}
            className={`p-1 rounded hover:bg-black/5 transition-colors ${userVote === -1 ? 'text-blue-600' : 'text-muted-foreground'}`}
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <ArtifactTypeIcon type={artifact.type} />
            <span className="text-xs font-medium uppercase">{artifact.type.replace('_', ' ')}</span>

            {artifact.type === 'token_drop' && amount && (
              <span className="text-xs font-bold bg-yellow-200 px-2 py-0.5 rounded-full">{amount} FWB</span>
            )}

            {isPromotion && artifact.meta?.discount && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {artifact.meta.discount}% OFF
              </span>
            )}
          </div>
          <button type="button"
            onClick={() => onFlag(artifact.id)}
            className="text-muted-foreground hover:text-red-600 transition-colors"
            title="Flag for review"
          >
            <Flag className="h-4 w-4" />
          </button>
        </div>

        {isPromotion && artifact.meta?.merchant_name && (
          <div className="text-xs font-semibold text-amber-800 mb-1">
            {artifact.meta.merchant_name}
          </div>
        )}

        <p className="text-sm mb-3 font-medium">{artifact.content}</p>

        {artifact.scene_signals && (
          <div className="mb-3 rounded-xl border border-black/10 bg-card dark:dark:bg-card/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
              <Tag className="h-3.5 w-3.5" />
              <span>Scene aligned +{Math.round(artifact.scene_signals.score_boost * 100)} pts</span>
            </div>
            {artifact.scene_signals.headline && (
              <p className="mb-2 text-sm text-foreground dark:text-muted-foreground">{artifact.scene_signals.headline}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(artifact.scene_signals.matched_topics) ? artifact.scene_signals.matched_topics : []).map((topic) => (
                <span
                  key={`scene-topic-${artifact.id}-${topic.slug}`}
                  className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800"
                >
                  {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                </span>
              ))}
              {(Array.isArray(artifact.scene_signals.matched_tags) ? artifact.scene_signals.matched_tags : []).map((tag) => (
                <span
                  key={`scene-tag-${artifact.id}-${tag}`}
                  className="rounded-full dark:bg-background/5 px-2.5 py-1 text-xs font-medium text-foreground dark:text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {isPromotion && artifact.meta?.promo_code && (
          <div className="mb-3 bg-card dark:dark:bg-card/50 p-2 rounded border border-amber-200 border-dashed text-center">
            <span className="text-xs text-amber-800 block mb-1">PROMO CODE</span>
            <span className="font-mono font-bold text-lg tracking-wider select-all">
              {artifact.meta.promo_code}
            </span>
          </div>
        )}

        {artifact.type === 'token_drop' && !isClaimed && (
          <div className="mb-3">
            <button type="button"
              onClick={() => onClaim(artifact.id)}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded shadow-sm flex justify-center items-center gap-2"
            >
              <Coins className="w-4 h-4" />
              Claim {amount} FWB
            </button>
          </div>
        )}

        {artifact.type === 'token_drop' && isClaimed && (
          <div className="mb-3 text-center text-xs font-bold text-muted-foreground bg-muted dark:bg-card py-2 rounded">
            CLAIMED
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-muted-foreground">
          <div className="flex space-x-3">
            {hasVoting && (
              <button type="button"
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-1 hover:text-foreground dark:text-foreground transition-colors p-1 rounded hover:bg-black/5"
              >
                <MessageCircle className="h-3 w-3" />
                <span className="font-medium">{artifact.comments_count ?? 0} Comments</span>
              </button>
            )}
            <div className="flex items-center space-x-1 p-1">
              <MapPin className="h-3 w-3" />
              <span>{Math.round(artifact.radius)}m radius</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 p-1">
            <Clock className="h-3 w-3" />
            <span>{getTimeRemaining(artifact.expires_at)}</span>
          </div>
        </div>

        {/* Comment Entry Area */}
        {showComments && hasVoting && (
          <div className="mt-4 pt-3 border-t border-black/10">
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {comments.filter(c => !c.parent_id).map(comment => (
                <div key={comment.id} className="space-y-2">
                  <div className="bg-card/50 dark:dark:bg-card/50 p-2 rounded">
                    <p className="text-sm">{comment.content}</p>
                    <button type="button"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-[10px] text-blue-600 font-bold uppercase mt-1"
                    >
                      Reply
                    </button>
                  </div>

                  {/* Replies */}
                  <div className="ml-4 space-y-2 border-l-2 border-black/5 pl-2">
                    {comments.filter(c => c.parent_id === comment.id).map(reply => (
                      <div key={reply.id} className="bg-card/30 dark:dark:bg-card/30 p-2 rounded">
                        <p className="text-xs">{reply.content}</p>
                      </div>
                    ))}

                    {replyingTo === comment.id && (
                      <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 px-2 py-1 text-xs bg-card dark:bg-card border border-border dark:border-border rounded focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Reply
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-1.5 text-sm bg-card dark:bg-card border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const CandidateCard = ({ candidate }: { candidate: MatchCandidate }) => {
  const [showZkProver, setShowZkProver] = useState(false);

  const getCompatibilityBadges = (indicators: string[]) => {
    const badges: Record<string, { label: string; color: string }> = {
      shared_relationship_goals: { label: 'Shared Goals', color: 'bg-pink-100 text-pink-800' },
      active_locally: { label: 'Active Nearby', color: 'bg-green-100 text-green-800' },
    };

    return indicators.map(indicator => badges[indicator] || { label: indicator, color: 'bg-muted text-foreground' });
  };

  return (
    <div className="bg-card dark:bg-card rounded-lg border border-border dark:border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <EvolvingAvatar
            src={getAvatarUrl(candidate.avatar, candidate.user_id)}
            alt={candidate.name || "Candidate"}
            size="md"
            emotion={
              (candidate.emotion?.toLowerCase() === 'excited' || candidate.emotion?.toLowerCase() === 'happy') ? 'happy' :
              (candidate.emotion?.toLowerCase() === 'thoughtful' || candidate.emotion?.toLowerCase() === 'mysterious') ? 'mysterious' :
              (candidate.emotion?.toLowerCase() === 'cynical' || candidate.emotion?.toLowerCase() === 'intense') ? 'intense' :
              'neutral'
            }
          />
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-lg font-semibold">{candidate.age}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground capitalize">{candidate.gender}</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{candidate.distance_miles.toFixed(1)} miles away</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button"
            onClick={() => setShowZkProver(true)}
            title="Verify proximity"
            className="bg-indigo-100 text-indigo-700 p-2 rounded-full hover:bg-indigo-200 transition-colors"
          >
            <ShieldCheck className="h-5 w-5" />
          </button>
          <button aria-label="Like" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </div>

      {candidate.compatibility_indicators.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {getCompatibilityBadges(candidate.compatibility_indicators).map((badge, i) => (
            <span
              key={i}
              className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {candidate.last_seen && (
        <div className="mt-2 text-xs text-muted-foreground">
          Last seen {candidate.last_seen}
        </div>
      )}

      <Dialog open={showZkProver} onOpenChange={setShowZkProver}>
        <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 flex justify-center">
          <ZKProver
            targetEntityType="user"
            targetEntityId={candidate.user_id}
            onProofVerified={() => setTimeout(() => setShowZkProver(false), 2000)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface LocalPulseProps {
  initialTopicSlug?: string;
  compact?: boolean;
}

export default function LocalPulse({ initialTopicSlug, compact = false }: LocalPulseProps) {
  const { token } = useAuth();
  const { data: activeQuests = [] } = useActiveQuests();
  const acceptQuestMutation = useAcceptQuest();
  const completeQuestMutation = useCompleteQuest();

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
  });
  const [radius, setRadius] = useState(1000);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAR, setShowAR] = useState(false);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState(initialTopicSlug ?? '');
  const [newArtifact, setNewArtifact] = useState({
    type: 'chat' as ArtifactType,
    content: '',
  });
  const [dropAmount, setDropAmount] = useState('');
  const { data: topics = [] } = useTopics({ featured: true });

  useEffect(() => {
    if (initialTopicSlug) {
      setSelectedTopicSlug(initialTopicSlug);
      return;
    }

    if (typeof window !== 'undefined') {
      const topicFromQuery = new URLSearchParams(window.location.search).get('topic');
      if (topicFromQuery) {
        setSelectedTopicSlug(topicFromQuery);
      }
    }
  }, [initialTopicSlug]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.slug === selectedTopicSlug) ?? null,
    [topics, selectedTopicSlug]
  );

  const createArtifact = useCreateProximityArtifact();
  const flagArtifact = useFlagProximityArtifact();
  const voteArtifact = useVoteArtifact();
  const commentArtifact = useCommentArtifact();

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
        });
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: `Location error: ${error.message}`,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const { data: localPulse, isLoading, error, refetch } = useLocalPulse(
    {
      lat: location.latitude || 0,
      lng: location.longitude || 0,
      radius,
      topic_slug: selectedTopicSlug || undefined,
    },
    token,
    !!location.latitude && !!location.longitude
  );

  const handleCreateArtifact = async () => {
    if (!location.latitude || !location.longitude || !token) return;

    try {
      await createArtifact.mutateAsync({
        data: {
          type: newArtifact.type,
          content: newArtifact.content,
          lat: location.latitude,
          lng: location.longitude,
          radius,
          amount: newArtifact.type === 'token_drop' ? parseFloat(dropAmount) : undefined,
          topic_slug: selectedTopicSlug || undefined,
        },
        token,
      });

      setNewArtifact({ type: 'chat', content: '' });
      setDropAmount('');
      setShowCreateForm(false);
      refetch();
    } catch (err) {
      console.error('Failed to create artifact:', err);
      alert('Failed to post artifact. Do you have enough tokens?');
    }
  };

  const handleFlagArtifact = async (id: number) => {
    if (!token) return;

    try {
      await flagArtifact.mutateAsync({ id, token });
    } catch (err) {
      console.error('Failed to flag artifact:', err);
    }
  };

  const handleVoteArtifact = async (id: number, value: number) => {
    if (!token) return;
    try {
      await voteArtifact.mutateAsync({ id, vote: value, token });
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleCommentArtifact = async (id: number, content: string, parentId?: string) => {
    if (!token || !content.trim()) return;
    try {
      await commentArtifact.mutateAsync({ id, content, parent_id: parentId, token });
    } catch (err) {
      console.error('Failed to comment:', err);
    }
  };

  const handleClaimArtifact = async (id: number) => {
    if (!location.latitude || !location.longitude || !token) return;
    try {
      await apiClient.post(`/proximity/artifacts/${id}/claim`, {
        lat: location.latitude,
        lng: location.longitude
      });
      alert('Claimed successfully! Check your wallet.');
      refetch();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Claim failed. You might be too far away.');
    }
  };

  if (!token) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">Authentication Required</h3>
        <p className="text-muted-foreground">Please log in to view Local Pulse</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Establish real-time subscription to Local Pulse updates */}
      <LiveStatusBanner />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Local Pulse</h1>
                <p className="text-muted-foreground">
                  {selectedTopic ? `Discover nearby people and conversations around ${selectedTopic.label}.` : 'Discover nearby people and conversations'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!compact && (
                <button type="button"
                  onClick={() => setShowAR(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>AR View</span>
                </button>
              )}
              <button type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Post</span>
            </button>
          </div>
        </div>

        {/* Radius Selector */}
        <div className="bg-card dark:bg-card rounded-lg shadow-sm border p-4">
          <div className={`grid gap-4 ${compact ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
            <label htmlFor="radius-select" className="block">
              <span className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Search Radius</span>
              <select
                id="radius-select"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={500}>500m (~0.3 miles)</option>
                <option value={1000}>1km (~0.6 miles)</option>
                <option value={2000}>2km (~1.2 miles)</option>
                <option value={5000}>5km (~3 miles)</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Topic Filter</span>
              <select
                value={selectedTopicSlug}
                onChange={(e) => setSelectedTopicSlug(e.target.value)}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All scenes</option>
                {topics.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedTopic && (
            <div className="mt-4 rounded-2xl bg-purple-50 px-4 py-3 text-sm text-purple-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {selectedTopic.emoji ? `${selectedTopic.emoji} ` : ''}{selectedTopic.label}
                  </div>
                  <p className="mt-1 text-purple-800">{selectedTopic.description}</p>
                </div>
                <Link href={`/topics/${selectedTopic.slug}`} className="shrink-0 font-semibold text-purple-700 hover:text-purple-800">
                  Open hub
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Status */}
      {location.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-600">{location.error}</p>
          </div>
        </div>
      )}

      {/* Create Artifact Form */}
      {showCreateForm && (
        <div className="bg-card dark:bg-card rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create Proximity Post</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(['chat', 'board_post', 'announce', 'token_drop'] as const).map((type) => (
                  <button type="button"
                    key={type}
                    onClick={() => setNewArtifact({ ...newArtifact, type })}
                    className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${newArtifact.type === type
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-border hover:border-border'
                      }`}
                  >
                    <ArtifactTypeIcon type={type} />
                    <span className="text-xs block mt-1 capitalize text-center">{type.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {newArtifact.type === 'token_drop' && (
              <div>
                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Amount (FWB)</label>
                <input
                  type="number"
                  min="1"
                  value={dropAmount}
                  onChange={(e) => setDropAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="How many tokens to drop?"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Content</label>
              <textarea
                value={newArtifact.content}
                onChange={(e) => setNewArtifact({ ...newArtifact, content: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={newArtifact.type === 'token_drop' ? "Message for the finder..." : "What's happening nearby?"}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {newArtifact.content.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Attach to topic</label>
              <select
                value={selectedTopicSlug}
                onChange={(e) => setSelectedTopicSlug(e.target.value)}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No topic</option>
                {topics.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-muted dark:bg-card text-foreground dark:text-muted-foreground px-4 py-2 rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button type="button"
                onClick={handleCreateArtifact}
                disabled={!newArtifact.content.trim() || createArtifact.isPending || (newArtifact.type === 'token_drop' && !dropAmount)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createArtifact.isPending ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading Local Pulse...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-red-800">Error loading Local Pulse</h3>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </div>
      )}

      {/* Local Pulse Content */}
      {localPulse && (
        <div className={`grid grid-cols-1 gap-6 ${compact ? '' : 'lg:grid-cols-3'}`}>

          {/* Active Quests Feed Integration */}
          {activeQuests.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-foreground dark:text-foreground">Active Neighborhood Quests</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeQuests.map((quest: any) => {
                  const isAccepted = quest.user_quests && quest.user_quests.length > 0;
                  return (
                    <div key={quest.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Target className="w-16 h-16" />
                      </div>
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">{quest.title}</h4>
                      <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">{quest.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Coins className="w-3 h-3 mr-1" />
                          {quest.token_reward} FWB
                        </span>
                        {isAccepted ? (
                          <button type="button"
                            onClick={() => completeQuestMutation.mutate({ questId: quest.id })}
                            disabled={completeQuestMutation.isPending}
                            className="flex items-center text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 cursor-pointer bg-green-50 px-3 py-1.5 rounded transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete Quest
                          </button>
                        ) : (
                          <button type="button"
                            onClick={() => acceptQuestMutation.mutate(quest.id)}
                            disabled={acceptQuestMutation.isPending}
                            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded transition-colors"
                          >
                            Accept Quest
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proximity Artifacts (2 columns on large screens) */}
          <div className={`${compact ? '' : 'lg:col-span-2'} space-y-4`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground dark:text-foreground flex items-center space-x-2">
                <MessageCircle className="h-6 w-6" />
                <span>{selectedTopic ? `${selectedTopic.label} Activity` : 'Nearby Activity'}</span>
                {localPulse?.meta && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({localPulse.meta.artifacts_count || 0})
                  </span>
                )}
              </h2>
            </div>

            {localPulse.meta.ranking_strategy && (
              <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                Ranked using scene alignment, trusted connections, and freshness.
              </div>
            )}

            {localPulse.artifacts.length === 0 ? (
              <div className="text-center py-12 bg-muted dark:bg-background rounded-lg">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-2">No nearby activity</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to post something in your area!
                </p>
                <button type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Post
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {localPulse.artifacts.map((artifact) => (
                  <ArtifactCard
                    key={`artifact-${artifact.id}`}
                    artifact={artifact}
                    onFlag={handleFlagArtifact}
                    onClaim={handleClaimArtifact}
                    onVote={handleVoteArtifact}
                    onComment={handleCommentArtifact}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Match Candidates (1 column on large screens) */}
          {!compact && <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground dark:text-foreground flex items-center space-x-2">
                <Users className="h-6 w-6" />
                <span>Nearby Matches</span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({localPulse.meta.candidates_count})
                </span>
              </h2>
            </div>

            {localPulse.candidates.length === 0 ? (
              <div className="text-center py-8 bg-muted dark:bg-background rounded-lg">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No compatible matches nearby
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {localPulse.candidates.map((candidate) => (
                  <CandidateCard key={candidate.user_id} candidate={candidate} />
                ))}
              </div>
            )}
          </div>}
        </div>
      )}

      {/* AR View Overlay */}
      {showAR && localPulse && location.latitude && location.longitude && (
        <ARView
          artifacts={localPulse.artifacts}
          candidates={localPulse.candidates}
          userLocation={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          onClose={() => setShowAR(false)}
        />
      )}

      {/* Meta Info */}
      {localPulse && localPulse.meta && (
        <div className="mt-8 bg-muted dark:bg-background rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-foreground dark:text-foreground">{localPulse.meta.artifacts_count || 0}</div>
              <div className="text-muted-foreground">Posts</div>
            </div>
            <div>
              <div className="font-semibold text-foreground dark:text-foreground">{localPulse.meta.candidates_count || 0}</div>
              <div className="text-muted-foreground">Matches</div>
            </div>
            <div>
              <div className="font-semibold text-foreground dark:text-foreground">{(radius / 1000).toFixed(1)}km</div>
              <div className="text-muted-foreground">Radius</div>
            </div>
            <div>
              <div className="font-semibold text-foreground dark:text-foreground">
                {location.latitude?.toFixed(3)}, {location.longitude?.toFixed(3)}
              </div>
              <div className="text-muted-foreground">Location</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveStatusBanner() {
  const { isConnected, error } = useLocalPulseRealtime();
  if (error) {
    return (
      <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
        Live updates degraded; retrying...
      </div>
    );
  }
  return (
    <div className="mb-4 flex items-center space-x-2 text-sm text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted'}`} />
      <span>{isConnected ? 'Live updates on' : 'Live updates connecting...'}</span>
    </div>
  );
}

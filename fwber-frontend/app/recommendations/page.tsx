"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  Compass,
  Layers,
  Loader2,
  MapPin,
  Newspaper,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import {
  useTrendingRecommendations,
  usePersonalizedFeed,
  useRecommendationFeedback,
  useAIRecommendations,
  useLocationRecommendations,
  useCollaborativeRecommendations,
  useContentRecommendations,
  useMixedRecommendations,
  useRecommendationCache,
} from '@/lib/hooks/use-recommendations';
import type { FeedItem, Recommendation, TrendingContent } from '@/lib/api/recommendations';
import { api } from '@/lib/api/client';

type RecommendationTab =
  | 'mixed'
  | 'ai'
  | 'location'
  | 'collaborative'
  | 'content'
  | 'trending'
  | 'feed';

const TAB_CONFIG: Array<{
  id: RecommendationTab;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  { id: 'mixed', label: 'Mixed', description: 'All recommendation types', icon: Layers },
  { id: 'ai', label: 'AI', description: 'AI-generated picks', icon: Brain },
  { id: 'location', label: 'Nearby', description: 'Location-aware matches', icon: MapPin },
  { id: 'collaborative', label: 'Collaborative', description: 'Based on similar users', icon: Users },
  { id: 'content', label: 'Content', description: 'Content-based suggestions', icon: Newspaper },
  { id: 'trending', label: 'Trending', description: 'Popular right now', icon: TrendingUp },
  { id: 'feed', label: 'Feed', description: 'Your personalized feed', icon: Sparkles },
];

export default function RecommendationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<RecommendationTab>('mixed');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { clearCache, refreshRecommendations } = useRecommendationCache();
  const feedbackMutation = useRecommendationFeedback();

  useEffect(() => {
    if (!navigator.geolocation || !isAuthenticated) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [isAuthenticated]);

  const { data: mixedRecommendations, isLoading: isLoadingMixed } = useMixedRecommendations({
    limit: 10,
    context: userLocation
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: 5000,
        }
      : undefined,
    enabled: isAuthenticated,
  });

  const { data: aiRecommendations, isLoading: isLoadingAI } = useAIRecommendations({
    limit: 5,
    context: userLocation
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }
      : undefined,
    enabled: isAuthenticated,
  });

  const { data: locationRecommendations, isLoading: isLoadingLocation } = useLocationRecommendations({
    limit: 5,
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    radius: 5000,
    enabled: isAuthenticated && !!userLocation,
  });

  const { data: collaborativeRecommendations, isLoading: isLoadingCollaborative } = useCollaborativeRecommendations({
    limit: 5,
    enabled: isAuthenticated,
  });

  const { data: contentRecommendations, isLoading: isLoadingContent } = useContentRecommendations({
    limit: 5,
    enabled: isAuthenticated,
  });

  const { data: trendingRecommendations, isLoading: isLoadingTrending } = useTrendingRecommendations({
    limit: 5,
    timeframe: '24h',
    enabled: isAuthenticated,
  });

  const { data: personalizedFeed, isLoading: isLoadingFeed } = usePersonalizedFeed({
    page: 1,
    per_page: 20,
    enabled: isAuthenticated,
  });

  const handleRecommendationAction = async (
    recommendationId: string,
    action: 'click' | 'like' | 'dislike' | 'share' | 'ignore',
    contentId: string,
    rating?: number
  ) => {
    try {
      if (action === 'like' || action === 'dislike') {
        // Send actual match action
        await api.post('/matches/action', {
          target_user_id: parseInt(contentId),
          action: action === 'like' ? 'like' : 'pass',
        });
      }
      await feedbackMutation.mutateAsync({
        recommendation_id: recommendationId,
        action,
        content_id: contentId,
        rating,
      });
      if (action === 'like' || action === 'dislike') {
        refreshRecommendations();
      }
    } catch (error) {
      console.error('Failed to submit action:', error);
    }
  };

  const currentItems = useMemo(() => {
    let items: any[] = [];
    switch (activeTab) {
      case 'mixed':
        items = mixedRecommendations?.recommendations || [];
        break;
      case 'ai':
        items = aiRecommendations?.recommendations || [];
        break;
      case 'location':
        items = locationRecommendations?.recommendations || [];
        break;
      case 'collaborative':
        items = collaborativeRecommendations?.recommendations || [];
        break;
      case 'content':
        items = contentRecommendations?.recommendations || [];
        break;
      case 'trending':
        items = trendingRecommendations?.trending || [];
        break;
      case 'feed':
        items = personalizedFeed?.feed || [];
        break;
      default:
        items = [];
    }
    return Array.isArray(items) ? items : [];
  }, [
    activeTab,
    aiRecommendations,
    collaborativeRecommendations,
    contentRecommendations,
    locationRecommendations,
    mixedRecommendations,
    personalizedFeed,
    trendingRecommendations,
  ]);

  const isCurrentLoading = useMemo(() => {
    switch (activeTab) {
      case 'mixed':
        return isLoadingMixed;
      case 'ai':
        return isLoadingAI;
      case 'location':
        return isLoadingLocation;
      case 'collaborative':
        return isLoadingCollaborative;
      case 'content':
        return isLoadingContent;
      case 'trending':
        return isLoadingTrending;
      case 'feed':
        return isLoadingFeed;
      default:
        return false;
    }
  }, [
    activeTab,
    isLoadingAI,
    isLoadingCollaborative,
    isLoadingContent,
    isLoadingFeed,
    isLoadingLocation,
    isLoadingMixed,
    isLoadingTrending,
  ]);

  const mixedMetadata = activeTab === 'mixed' ? mixedRecommendations?.metadata : null;
  const currentRankingStrategy = useMemo(() => {
    const metadata = (() => {
      switch (activeTab) {
        case 'mixed': return mixedRecommendations?.metadata;
        case 'ai': return aiRecommendations?.metadata;
        case 'location': return locationRecommendations?.metadata;
        case 'collaborative': return collaborativeRecommendations?.metadata;
        case 'content': return contentRecommendations?.metadata;
        case 'feed': return personalizedFeed?.metadata;
        default: return null;
      }
    })();
    return metadata?.ranking_strategy ?? null;
  }, [
    activeTab,
    aiRecommendations?.metadata,
    collaborativeRecommendations?.metadata,
    contentRecommendations?.metadata,
    locationRecommendations?.metadata,
    mixedRecommendations?.metadata,
    personalizedFeed?.metadata,
  ]);

  const renderRecommendationCard = (recommendation: Recommendation, index: number) => {
    const title = recommendation.content.title || recommendation.content.name || `Recommendation ${index + 1}`;
    const description = recommendation.content.description || recommendation.reason;
    const contentId = String(recommendation.content.id || recommendation.id);

    return (
      <Card key={recommendation.id || `${activeTab}-${index}`} className="h-full border-border dark:border-border bg-card dark:border-gray-800 dark:bg-background overflow-hidden">
        {(recommendation as any).compatibility_score && (
          <div className="bg-purple-600/10 border-b border-purple-500/20 py-2 px-4 flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
              <Sparkles size={12} />
              AI Compatibility
            </span>
            <Badge variant="outline" className="bg-purple-500/20 border-purple-500/30 text-purple-200">
              {Math.round((recommendation as any).compatibility_score)}% Match
            </Badge>
          </div>
        )}
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200">
                {recommendation.type.toUpperCase()}
              </Badge>
              <CardTitle className="text-xl text-foreground dark:text-foreground">{title}</CardTitle>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {Math.round(recommendation.score)}%
            </Badge>
          </div>
          <CardDescription className="text-sm text-muted-foreground dark:text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendation.scene_signals && (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/20">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                <Compass className="h-3.5 w-3.5" />
                Scene-aligned +{Math.round(recommendation.scene_signals.score_boost * 100)} pts
              </div>
              {recommendation.scene_signals.headline && (
                <p className="mb-2 text-sm text-foreground dark:text-muted-foreground dark:text-foreground">{recommendation.scene_signals.headline}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(recommendation.scene_signals.matched_topics) ? recommendation.scene_signals.matched_topics : []).map((topic: any) => (
                  <Badge key={topic.slug} variant="outline" className="border-cyan-300 bg-card dark:bg-card text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-200">
                    {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                  </Badge>
                ))}
                {(Array.isArray(recommendation.scene_signals.matched_tags) ? recommendation.scene_signals.matched_tags : []).map((tag: string) => (
                  <Badge key={tag} variant="secondary">#{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {recommendation.content.distance ? <Badge variant="outline">{Math.round(recommendation.content.distance)}m away</Badge> : null}
            {recommendation.source ? <Badge variant="outline">{recommendation.source}</Badge> : null}
            {recommendation.sources?.length ? <Badge variant="outline">{recommendation.sources.join(', ')}</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleRecommendationAction(recommendation.id, 'like', contentId, 5)}
            >
              Like
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleRecommendationAction(recommendation.id, 'dislike', contentId, 1)}
            >
              Pass
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleRecommendationAction(recommendation.id, 'share', contentId)}
            >
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTrendingCard = (item: TrendingContent, index: number) => (
    <Card key={item.id || `${activeTab}-${index}`} className="h-full border-border dark:border-border bg-card dark:border-gray-800 dark:bg-background">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              {item.type}
            </Badge>
            <CardTitle className="text-xl text-foreground dark:text-foreground">{item.title}</CardTitle>
          </div>
          <Badge variant="secondary">#{index + 1}</Badge>
        </div>
        <CardDescription className="text-sm text-muted-foreground dark:text-muted-foreground">
          {item.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Engagement score</span>
          <span className="font-medium text-foreground dark:text-foreground">{item.engagement_score.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Trending since</span>
          <span className="font-medium text-foreground dark:text-foreground">{new Date(item.trending_since).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderFeedCard = (item: FeedItem, index: number) => {
    const title = item.content?.title || item.content?.name || `Feed item ${index + 1}`;
    const description = item.reason || item.content?.description || 'Personalized recommendation item';

    return (
      <Card key={item.id || `${activeTab}-${index}`} className="h-full border-border dark:border-border bg-card dark:border-gray-800 dark:bg-background">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                {item.type}
              </Badge>
              <CardTitle className="text-xl text-foreground dark:text-foreground">{title}</CardTitle>
            </div>
            {typeof item.score === 'number' ? <Badge variant="secondary">{Math.round(item.score)}%</Badge> : null}
          </div>
          <CardDescription className="text-sm text-muted-foreground dark:text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {item.scene_signals && (
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/50 dark:bg-cyan-950/20">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                <Compass className="h-3.5 w-3.5" />
                Scene cue
              </div>
              {item.scene_signals.headline && (
                <p className="mb-2 text-sm text-foreground dark:text-muted-foreground dark:text-foreground">{item.scene_signals.headline}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(item.scene_signals.matched_topics) ? item.scene_signals.matched_topics : []).map((topic: any) => (
                  <Badge key={topic.slug} variant="outline" className="border-cyan-300 bg-card dark:bg-card text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-200">
                    {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                  </Badge>
                ))}
                {(Array.isArray(item.scene_signals.matched_tags) ? item.scene_signals.matched_tags : []).map((tag: string) => (
                  <Badge key={tag} variant="secondary">#{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          {item.timestamp ? (
            <div className="flex items-center justify-between gap-3">
              <span>Updated</span>
              <span className="font-medium text-foreground dark:text-foreground">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const renderCurrentCard = (item: Recommendation | TrendingContent | FeedItem, index: number) => {
    if (activeTab === 'trending') {
      return renderTrendingCard(item as TrendingContent, index);
    }

    if (activeTab === 'feed') {
      return renderFeedCard(item as FeedItem, index);
    }

    return renderRecommendationCard(item as Recommendation, index);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground dark:text-foreground">
                  <Sparkles className="h-8 w-8 text-purple-500" />
                  Recommendations
                </h1>
                <p className="mt-1 text-muted-foreground dark:text-muted-foreground">
                  Personalized discovery across AI, collaborative, nearby, and trending signals.
                </p>
              </div>
              <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200">
                Discovery Hub
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back Home
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  clearCache();
                  refreshRecommendations();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Cache
              </Button>
              <Button type="button" variant="outline" onClick={refreshRecommendations}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <Card className="border-border dark:border-border bg-card dark:border-gray-800 dark:bg-background">
            <CardHeader>
              <CardTitle className="text-lg text-foreground dark:text-foreground">Context</CardTitle>
              <CardDescription>
                Recommendation quality improves when location and recent activity are available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userLocation ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                  Location enabled near {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}.
                </div>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                  Location is unavailable, so nearby recommendations may be limited until the browser shares position.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-200'
                      : 'border-border bg-card text-muted-foreground hover:border-purple-200 hover:text-purple-700 dark:border-gray-800 dark:bg-background dark:text-muted-foreground dark:hover:border-purple-900 dark:hover:text-purple-200'
                  }`}
                  title={tab.description}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="space-y-6">
            {currentRankingStrategy ? (
              <Card className="border-cyan-200 bg-cyan-50 dark:border-cyan-900/50 dark:bg-cyan-950/20">
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                    <Compass className="h-4 w-4" />
                    Ranking strategy
                  </div>
                  <p className="text-sm text-foreground dark:text-muted-foreground dark:text-foreground">{currentRankingStrategy.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {currentRankingStrategy.base_relevance ? <Badge variant="outline">Base relevance</Badge> : null}
                    {currentRankingStrategy.trusted_connections ? <Badge variant="outline">Trusted connections</Badge> : null}
                    {currentRankingStrategy.scene_alignment ? <Badge variant="outline">Scene alignment</Badge> : null}
                    {currentRankingStrategy.freshness ? <Badge variant="outline">Freshness</Badge> : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
            {isCurrentLoading || authLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : Array.isArray(currentItems) && currentItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {currentItems.map((item, index) => renderCurrentCard(item, index))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-border bg-card dark:border-border dark:bg-background">
                <CardContent className="py-12 text-center">
                  <p className="text-lg font-medium text-foreground dark:text-foreground">
                    No recommendations available for this category yet.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                    Try refreshing, enabling location, or checking back after more activity.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {mixedMetadata ? (
            <Card className="border-border dark:border-border bg-card dark:border-gray-800 dark:bg-background">
              <CardHeader>
                <CardTitle className="text-lg text-foreground dark:text-foreground">Mixed recommendation metadata</CardTitle>
                <CardDescription>Live details for the current combined recommendation batch.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="mt-1 text-lg font-semibold text-foreground dark:text-foreground">{mixedMetadata.total}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Types</p>
                  <p className="mt-1 text-sm font-medium text-foreground dark:text-foreground">
                    {Array.isArray(mixedMetadata.types) ? mixedMetadata.types.join(', ') : ''}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Generated</p>
                  <p className="mt-1 text-sm font-medium text-foreground dark:text-foreground">
                    {new Date(mixedMetadata.generated_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Cache hit</p>
                  <p className={`mt-1 text-sm font-medium ${mixedMetadata.cache_hit ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {mixedMetadata.cache_hit ? 'Yes' : 'No'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}

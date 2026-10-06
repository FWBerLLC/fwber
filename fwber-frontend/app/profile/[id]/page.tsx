'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { getPublicProfile, type UserProfile } from '@/lib/api/profile';
import { performMatchAction } from '@/lib/api/matches';
import { api } from '@/lib/api/client';
import { PresenceIndicator } from '@/components/realtime/PresenceComponents';
import TipButton from '@/components/tipping/TipButton';
import PhotoRevealGate from '@/components/PhotoRevealGate';
import { EvolvingAvatar } from '@/components/ui/EvolvingAvatar';
import { RelationshipTier } from '@/lib/relationshipTiers';
import { photoAPI } from '@/lib/api/photos';
import GiftShopModal from '@/components/gifts/GiftShopModal';
import { BookHeart, Compass, Gift, HeartHandshake, ShieldCheck, Sparkles, Globe, Copy } from 'lucide-react';
import { VouchBadge } from '@/components/profile/VouchBadge';
import { useMatchCompatibility } from '@/lib/hooks/use-compatibility';
import { useToast } from '@/components/ToastProvider';
import { MatchInsights } from '@/components/matches/MatchInsights';

export default function PublicProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const wingmanId = searchParams.get('wingman');
  const { token, user } = useAuth();

  // Safely extract id - useParams returns string | string[] | undefined
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null;
  const numericId = id ? parseInt(id, 10) : NaN;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPerformed, setActionPerformed] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const { showSuccess, showError } = useToast();
  const { data: compatibility } = useMatchCompatibility(id || '');

  const loadProfile = useCallback(async () => {
    if (!token || !id || isNaN(numericId)) {
      setError('Invalid profile ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getPublicProfile(token, numericId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [token, id, numericId]);

  const recordAssist = useCallback(async () => {
    try {
      await api.post('/wingman/assist', {
        subject_id: Number(id),
        wingman_id: Number(wingmanId),
      });
      // Assist recorded successfully
    } catch (err) {
      console.error('Failed to record assist', err);
    }
  }, [id, wingmanId]);

  useEffect(() => {
    if (token && id) {
      loadProfile();
    }
  }, [token, id, loadProfile]);

  // Record profile view (fire and forget, with deduplication on backend)
  useEffect(() => {
    if (token && numericId && user && numericId !== user.id) {
      api.post(`/profile/${numericId}/view`).catch(() => {
        // Silently fail — view tracking should never block UX
      });
    }
  }, [token, numericId, user?.id]);

  useEffect(() => {
    // Record Wingman Assist if present
    if (token && wingmanId && id && !actionPerformed) {
      recordAssist();
    }
  }, [token, wingmanId, id, actionPerformed, recordAssist]);

  const handleAction = async (action: 'like' | 'pass') => {
    if (!token || !profile) return;

    // Use Number(id) to ensure it's a numeric ID as expected by performMatchAction
    const targetUserId = Number(id);

    if (isNaN(targetUserId)) {
      showError('Error', 'Invalid user ID.');
      return;
    }

    try {
      await performMatchAction(targetUserId, action);
      setActionPerformed(true);
      if (action === 'like') {
        showSuccess('Liked!', 'If they like you back, it\'s a match!');
      } else {
        showSuccess('Passed', 'You won\'t see this profile again.');
      }
    } catch (err) {
      showError('Action Failed', 'Failed to perform action. Please try again.');
    }
  };

  const handleTokenUnlock = async (photoId: string) => {
    try {
      const res = await photoAPI.unlockPhoto(photoId);
      if (res.success) {
        showSuccess('Photo Unlocked!', res.message);
        loadProfile(); // Refresh
      }
    } catch (e: any) {
      showError('Unlock Failed', e.message || 'Unlock failed');
    }
  };

  if (isLoading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!profile) return <div className="p-8">Profile not found</div>;

	const p = profile.profile || ({ display_name: 'User' } as any);
	const photos = Array.isArray(p.photos) ? p.photos : [];

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
				<div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
					{/* Main Photo & Header */}
					<div className="relative h-96 w-full bg-gray-200 dark:bg-gray-700 flex justify-center items-center">
						{photos[0] ? (
							<EvolvingAvatar
								src={photos[0].url}
								alt={p.display_name || 'User'}
								size="2xl"
								emotion={(p.current_emotion as any) || 'neutral'}
								className="w-64 h-64 border-4 shadow-xl mb-4"
							/>
						) : (
							<div className="flex items-center justify-center h-full text-4xl text-gray-400">
								{(p.display_name?.[0] || '?').toUpperCase()}
							</div>
						)}

						{wingmanId && (
							<div className="absolute top-4 left-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg animate-bounce z-10">
								🧚 Wingman Recommended!
							</div>
						)}

						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

						<div className="absolute bottom-0 left-0 right-0 p-8 text-white">
							<div className="flex justify-between items-end">
								<div>
									<div className="flex items-center gap-3 mb-1">
										<h1 className="text-3xl font-bold flex items-center gap-2">
											{p.display_name || 'Anonymous'}, {p.age || '??'}
											<PresenceIndicator userId={String(profile.id)} />
										</h1>
										{compatibility && (
											<div className="flex items-center gap-1 bg-purple-500/30 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-purple-200 border border-purple-400/30">
												<Sparkles size={12} className="text-purple-300" />
												{compatibility.score}% Match
											</div>
										)}
									</div>
									<p className="text-gray-200">
										{p.location?.city || 'Unknown'}, {p.location?.state || 'Location'}
									</p>
								</div>
								<TipButton
									recipientId={profile.id}
									recipientName={p.display_name || 'User'}
								/>
							</div>
						</div>
					</div>

					{/* Body */}
					<div className="p-8">
						{p.vouches && p.vouches.length > 0 && (
							<div className="flex gap-2 mb-6 flex-wrap">
								<VouchBadge
									type="safe"
									count={p.vouches.filter((v: any) => v.type === 'safe').length}
								/>
								<VouchBadge
									type="fun"
									count={p.vouches.filter((v: any) => v.type === 'fun').length}
								/>
								<VouchBadge
									type="hot"
									count={p.vouches.filter((v: any) => v.type === 'hot').length}
								/>
							</div>
						)}
						<div>
							<div className="flex justify-between items-center w-full">
								<div>
									<h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
										{p.display_name || 'Anonymous'}, {p.age || '??'}
										<PresenceIndicator userId={String(profile.id)} />
									</h1>

									{/* Vouches Summary */}
									{p.vouches && p.vouches.length > 0 && (
										<div className="flex gap-2 mt-2 flex-wrap">
											<VouchBadge
												type="safe"
												count={
													p.vouches.filter((v: any) => v.type === 'safe').length
												}
											/>
											<VouchBadge
												type="fun"
												count={
													p.vouches.filter((v: any) => v.type === 'fun').length
												}
											/>
											<VouchBadge
												type="hot"
												count={
													p.vouches.filter((v: any) => v.type === 'hot').length
												}
											/>
										</div>
									)}

									<p className="text-gray-600 dark:text-gray-400 mt-1">
										{p.location?.city || 'Unknown'}, {p.location?.state || 'Location'}
									</p>
								</div>
								<TipButton
									recipientId={profile.id}
									recipientName={p.display_name || 'User'}
								/>
							</div>
						</div>

            <div className="prose dark:prose-invert mb-8">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold mb-0">About</h3>
                {p.is_federated && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                            @{profile.name || 'user'}@api.fwber.site
                        </span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`@${profile.name}@api.fwber.site`);
                                showSuccess('Handle Copied', 'Federated handle copied to clipboard');
                            }}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                        >
                            <Copy className="w-3 h-3 text-blue-400" />
                        </button>
                    </div>
                )}
              </div>
              <p>{p.bio || 'No bio yet.'}</p>
            </div>

            {p.scene_summary && (
              <div className="mb-8 rounded-3xl border border-cyan-100 bg-cyan-50/80 p-5 shadow-sm dark:border-cyan-900/40 dark:bg-cyan-950/20">
                <div className="mb-4 flex items-center gap-2">
                  <Compass className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  <h3 className="text-lg font-semibold">Scene Summary</h3>
                </div>
                {p.scene_summary.headline && (
                  <p className="mb-4 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-200">{p.scene_summary.headline}</p>
                )}
                {(p.scene_summary.followed_topics || []).length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(p.scene_summary.followed_topics || []).map((topic) => (
                      <span
                        key={topic.slug}
                        className="rounded-full border border-cyan-200 bg-white dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200"
                      >
                        {topic.emoji ? `${topic.emoji} ` : ''}{topic.label}
                      </span>
                    ))}
                  </div>
                )}
                {(p.scene_summary.scene_tags || []).length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(p.scene_summary.scene_tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-3 dark:bg-gray-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Followed topics</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{p.scene_summary.stats.followed_topic_count}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 dark:bg-gray-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Visible notes</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{p.scene_summary.stats.visible_journal_count}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 dark:bg-gray-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Public groups</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{p.scene_summary.stats.public_group_count}</p>
                  </div>
                </div>
              </div>
            )}

            {(p.journals && p.journals.length > 0) && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <BookHeart className="h-5 w-5 text-pink-500" />
                  <h3 className="text-lg font-semibold">Field Notes</h3>
                </div>
                <div className="space-y-4">
                  {(p.journals || []).map((journal) => (
                    <article
                      key={journal.id}
                      className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
                      style={{ borderLeftColor: journal.accent_color || '#ec4899', borderLeftWidth: '4px' }}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {journal.visibility_label}
                        </span>
                        {journal.circle_group?.name && (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                            {journal.circle_group.name}
                          </span>
                        )}
                        {journal.mood_emoji && <span className="text-base">{journal.mood_emoji}</span>}
                      </div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                        {journal.title || 'Untitled field note'}
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                        {journal.content}
                      </p>
                      {journal.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(journal.tags || []).map((tag) => (
                            <span key={tag} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {(p.relationship_links && p.relationship_links.length > 0) && (
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-rose-500" />
                  <h3 className="text-lg font-semibold">Relationship Links</h3>
                </div>
                <div className="space-y-4">
                  {(p.relationship_links || []).map((link) => (
                    <article
                      key={link.id}
                      className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white dark:bg-gray-800 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                          {link.relationship_type_label}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {link.visibility_label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                        Linked with {link.related_user?.display_name || link.related_user?.name || 'a connection'}
                      </p>
                      {link.note && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{link.note}</p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Gate */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Photos</h3>
              <PhotoRevealGate
                photos={photos.map(ph => ({
                  id: String(ph.id),
                  url: ph.url,
                  isPrimary: ph.is_primary,
                  type: 'real',
                  isPrivate: ph.is_private,
                  isUnlocked: ph.is_unlocked,
                  unlockPrice: ph.unlock_price
                })) || []}
                currentTier={RelationshipTier.DISCOVERY}
                onTokenUnlock={handleTokenUnlock}
              />
            </div>

            {/* Match Insights & Narrative (v2.1.9) */}
            <div className="mb-8">
              <MatchInsights matchId={id || ''} />
            </div>

            {/* Actions */}
            {!actionPerformed ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => handleAction('pass')}
                    className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 dark:text-white rounded-full font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => handleAction('like')}
                    className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-semibold hover:opacity-90 transition-opacity shadow-lg"
                  >
                    Like
                  </button>
                </div>

                <button
                  onClick={() => setIsGiftModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full font-medium hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
                >
                  <Gift className="w-4 h-4" />
                  Send Gift
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 italic">
                You have already acted on this profile.
              </div>
            )}
          </div>
        </div>
      </div>

      {profile && (
        <GiftShopModal
          isOpen={isGiftModalOpen}
          onClose={() => setIsGiftModalOpen(false)}
          receiverId={profile.id}
          receiverName={p?.display_name || 'User'}
        />
      )}
    </ProtectedRoute>
  );
}

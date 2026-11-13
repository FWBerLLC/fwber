import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { createNotification } from './notifications.js';
import { pushMatchNotification, pushNotification } from '../socket.js';
import { filePathToUrl } from '../lib/photos.js';
import { checkAndUnlockAchievements } from '../lib/achievements.js';

const router = Router();

/**
 * GET /api/matches - Get potential matches for the authenticated user
 * Query params: limit, offset, min_score, max_distance
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const userLat = req.query.latitude ? parseFloat(String(req.query.latitude)) : null;
    const userLng = req.query.longitude ? parseFloat(String(req.query.longitude)) : null;
    const requestedFilters = {
      smoking: typeof req.query.smoking === 'string' ? req.query.smoking : '',
      drinking: typeof req.query.drinking === 'string' ? req.query.drinking : '',
      body_type: typeof req.query.body_type === 'string' ? req.query.body_type : '',
      height_min: req.query.height_min ? parseInt(String(req.query.height_min), 10) : null,
      interests: parseCsvParam(req.query.interests),
      cannabis: typeof req.query.cannabis === 'string' ? req.query.cannabis : '',
      diet: typeof req.query.diet === 'string' ? req.query.diet : '',
      has_pets: parseBooleanParam(req.query.has_pets),
      has_children: parseBooleanParam(req.query.has_children),
      wants_children: parseBooleanParam(req.query.wants_children),
      politics: typeof req.query.politics === 'string' ? req.query.politics : '',
      religion: typeof req.query.religion === 'string' ? req.query.religion : '',
      zodiac: typeof req.query.zodiac === 'string' ? req.query.zodiac : '',
      hair_color: typeof req.query.hair_color === 'string' ? req.query.hair_color : '',
      eye_color: typeof req.query.eye_color === 'string' ? req.query.eye_color : '',
      skin_tone: typeof req.query.skin_tone === 'string' ? req.query.skin_tone : '',
      ethnicity: typeof req.query.ethnicity === 'string' ? req.query.ethnicity : '',
      facial_hair: typeof req.query.facial_hair === 'string' ? req.query.facial_hair : '',
      fitness_level: typeof req.query.fitness_level === 'string' ? req.query.fitness_level : '',
      clothing_style: typeof req.query.clothing_style === 'string' ? req.query.clothing_style : '',
      dominant_hand: typeof req.query.dominant_hand === 'string' ? req.query.dominant_hand : '',
      tattoos: parseBooleanParam(req.query.tattoos),
      piercings: parseBooleanParam(req.query.piercings),
    };

    // Exclude existing matches and self
    const existingMatches = await prisma.matches.findMany({
      where: { OR: [{ user1_id: userId }, { user2_id: userId }] },
      select: { user1_id: true, user2_id: true },
    });
    const excludeIds = new Set<string>([userId.toString()]);
    existingMatches.forEach((m: any) => { excludeIds.add(m.user1_id.toString()); excludeIds.add(m.user2_id.toString()); });

    // Get current user's profile for preference matching
    const myProfile = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    const myPrefs: any = parseJson(myProfile?.preferences);
    const myInterests: string[] = parseArr(myProfile?.interests);
    const myLookingFor: string[] = parseArr(myProfile?.looking_for);
    const myGender = myProfile?.gender;
    const myOrientation = myProfile?.sexual_orientation;
    const myAge = myProfile?.date_of_birth
      ? new Date().getFullYear() - new Date(myProfile.date_of_birth as any).getFullYear()
      : null;

    // Preference ranges
    const prefMinAge = myPrefs?.age_min || 18;
    const prefMaxAge = myPrefs?.age_max || 99;

    // Fetch more candidates than needed so we can score/filter
    const candidates = await prisma.users.findMany({
      where: {
        id: { notIn: Array.from(excludeIds).map((id) => BigInt(id)) },
        user_profiles: { some: {} },
      },
      include: {
        user_profiles: true,
        photos: { where: { is_private: false }, orderBy: { is_primary: 'desc' as const }, take: 5 },
      },
      take: limit * 5,
      skip: offset,
    });

    let scored = candidates
      .filter((u: any) => {
        const p = (Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles) || {};
        return matchesRequestedFilters(p, requestedFilters);
      })
      .map((u: any) => {
      const p = (Array.isArray(u.user_profiles) ? u.user_profiles[0] : u.user_profiles) || {};
      const theirAge = p.date_of_birth
        ? new Date().getFullYear() - new Date(p.date_of_birth as any).getFullYear()
        : null;
      const theirGender = p.gender || null;
      const theirInterests: string[] = parseArr(p.interests);
      const sharedInterests = myInterests.filter(i => theirInterests.includes(i));

      // Score calculation
      let score = 20; // base

      // Shared interests (+10 each, max 40)
      score += Math.min(sharedInterests.length * 10, 40);

      // Age preference match (+15 if within range)
      if (theirAge && theirAge >= prefMinAge && theirAge <= prefMaxAge) score += 15;

      // Mutual gender preference (+10)
      // Simple: if user is straight, prefer opposite gender; if gay/lesbian, prefer same; bi/pan get bonus either way
      if (myOrientation === 'straight' && theirGender && theirGender !== myGender) score += 10;
      else if ((myOrientation === 'gay' || myOrientation === 'lesbian') && theirGender === myGender) score += 10;
      else if (myOrientation === 'bisexual' || myOrientation === 'pansexual' || myOrientation === 'queer') score += 10;

      // Location proximity (+15 if close)
      let distanceMeters = 0;
      if (userLat && userLng && p.location_latitude && p.location_longitude) {
        const R = 6371;
        const dLat = ((Number(p.location_latitude) - userLat) * Math.PI) / 180;
        const dLon = ((Number(p.location_longitude) - userLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLat * Math.PI) / 180) * Math.cos((Number(p.location_latitude) * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        distanceMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000);
        if (distanceMeters < 5000) score += 15;
        else if (distanceMeters < 25000) score += 8;
        else if (distanceMeters < 50000) score += 3;
      }

      // Verified bonus (+5)
      if (p.is_verified) score += 5;

      // Bio bonus (+5)
      if (p.bio && p.bio.length > 20) score += 5;

      // Photo bonus (+5 if has at least one photo)
      const theirPhotos: any[] = Array.isArray(u.photos) ? u.photos : [];
      if (theirPhotos.length > 0) score += 5;

      // Profile completeness bonus (+5 if profile is well-filled)
      let completeness = 0;
      if (p.display_name) completeness++;
      if (p.bio && p.bio.length > 20) completeness++;
      if (p.date_of_birth) completeness++;
      if (p.location_city) completeness++;
      if (theirInterests.length >= 3) completeness++;
      if (completeness >= 4) score += 5;

      score = Math.min(99, score);

      return {
        id: Number(u.id),
        name: p.display_name || u.name || 'Anonymous',
        display_name: p.display_name || u.name || 'Anonymous',
        email: null,
        avatarUrl: p.avatar_url || null,
        bio: p.bio || null,
        locationDescription: p.location_description || null,
        distance: Math.round(distanceMeters * 0.000621371 * 10) / 10, // miles with 1 decimal
      distanceMeters,
        compatibilityScore: score,
        score: score,
        lastSeenAt: u.last_seen_at?.toISOString() || null,
        age: theirAge,
        gender: theirGender,
        is_verified: p.is_verified || false,
        voice_intro_url: p.voice_intro_url || null,
        photos: (u.photos || []).map((photo: any) => ({
          id: Number(photo.id),
          url: filePathToUrl(photo.file_path || photo.url),
          is_private: photo.is_private || false,
          is_primary: photo.is_primary || false,
        })),
        shared_interests: sharedInterests,
        shared_interest_count: sharedInterests.length,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json({ matches: scored.slice(0, limit), total: scored.length });
  } catch (error: any) {
    console.error('[Matches] Error fetching matches:', error.message);
    res.json({ matches: [], total: 0 });
  }
});

/**
 * POST /api/matches/action - Perform match action (like, pass, super_like)
 */
router.post('/action', authenticate, async (req: any, res) => {
  try {
    // Standardize IDs
    const userId = BigInt(req.user.id);
    const targetUserIdRaw = (req.body || {}).target_user_id || (req.body || {}).targetUserId;
    const action = ((req.body || {}).action || "") as string;

    if (!targetUserIdRaw || !action) {
      return res.status(400).json({ message: 'target_user_id and action are required' });
    }

    const targetId = BigInt(targetUserIdRaw);

    if (action === 'pass') {
      return res.json({ action: 'pass', is_match: false, message: 'Passed' });
    }

    // Check if target user already liked current user
    const existingLike = await prisma.matches.findFirst({
      where: {
        OR: [
          { user1_id: targetId, user2_id: userId },
          { user1_id: userId, user2_id: targetId },
        ],
      },
    });

    if (existingLike) {
      // Mutual match - update status to accepted
      await prisma.matches.update({
        where: { id: existingLike.id },
        data: { status: 'accepted', is_active: true },
      });

      // Notify both users
      const userName = (await prisma.users.findUnique({ where: { id: userId }, select: { name: true } }))?.name || 'Someone';
      const targetName = (await prisma.users.findUnique({ where: { id: targetId }, select: { name: true } }))?.name || 'Someone';
      await createNotification(targetId, 'New Match!', `You matched with ${userName}!`);
      await createNotification(userId, 'New Match!', `You matched with ${targetName}!`);
      // Push real-time match notification via Socket.io
      pushMatchNotification(Number(userId), Number(targetId), {
        type: 'new_match',
        message: "It's a match!",
        match_id: Number(existingLike.id),
      });

// Check achievements for both users (first match, etc.)
        checkAndUnlockAchievements(userId).catch(() => {});
        checkAndUnlockAchievements(targetId).catch(() => {});

      return res.json({
        action,
        is_match: true,
        message: "It's a match!",
        match_id: Number(existingLike.id),
      });
    }

    // Create new match entry (pending - waiting for other user)
    const match = await prisma.matches.create({
      data: {
        user1_id: userId,
        user2_id: targetId,
        status: 'pending',
        match_score: action === 'super_like' ? 100 : 50,
      },
    });

    // Record the action in match_actions for who-likes-you tracking
    try {
      await prisma.match_actions.create({
        data: {
          user_id: userId,
          target_user_id: targetId,
          action: action as any,
          created_at: new Date(),
        },
      });
    } catch (_) {}

    res.json({
      action,
      is_match: false,
      message: action === 'super_like' ? 'Super liked!' : 'Liked!',
      match_id: Number(match.id),
    });
  } catch (error: any) {
    console.error('[Matches] Error performing action:', error.message);
    res.status(500).json({ message: 'Failed to perform action' });
  }
});

/**
 * GET /api/matches/established - Get mutual/established matches AND accepted friends
 * GET /api/matches/accepted - Alias for established
 *
 * Why accepted friendships are merged here (and bidirectional blocks excluded):
 * `/messages` (`getConversations`) reads `/api/matches/established` as its canonical
 * 1-on-1 conversation roster. Previously, accepted friends from `/friends` were
 * omitted (causing `/messages?user=<friendId>` to show an empty list) and `photos`
 * / `current_emotion` / `last_message` were missing from `other_user.profile`,
 * causing every conversation row to display "No messages yet" and lose avatars.
 */
router.get(['/established', '/accepted'], authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const myIdStr = userId.toString();

    const [blockRows, mutualMatches, acceptedFriendships] = await Promise.all([
      prisma.blocks.findMany({
        where: { OR: [{ blocker_id: userId }, { blocked_id: userId }] },
        select: { blocker_id: true, blocked_id: true },
      }).catch(() => []),
      prisma.matches.findMany({
        where: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
          status: 'accepted',
          is_active: true,
        },
        include: {
          users_matches_user1_idTousers: {
            include: {
              user_profiles: true,
              photos: {
                where: { is_private: false },
                orderBy: { is_primary: 'desc' as const },
                take: 5,
              },
            },
          },
          users_matches_user2_idTousers: {
            include: {
              user_profiles: true,
              photos: {
                where: { is_private: false },
                orderBy: { is_primary: 'desc' as const },
                take: 5,
              },
            },
          },
        },
        orderBy: { last_message_at: 'desc' },
      }),
      prisma.friends.findMany({
        where: {
          OR: [{ user_id: userId }, { friend_id: userId }],
          status: 'accepted',
        },
        include: {
          users_friends_user_idTousers: {
            include: {
              user_profiles: true,
              photos: {
                where: { is_private: false },
                orderBy: { is_primary: 'desc' as const },
                take: 5,
              },
            },
          },
          users_friends_friend_idTousers: {
            include: {
              user_profiles: true,
              photos: {
                where: { is_private: false },
                orderBy: { is_primary: 'desc' as const },
                take: 5,
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }).catch(() => []),
    ]);

    const blockedSet = new Set<string>();
    for (const b of blockRows as any[]) {
      const other = b.blocker_id?.toString() === myIdStr ? b.blocked_id?.toString() : b.blocker_id?.toString();
      if (other) blockedSet.add(other);
    }

    const formatOtherUser = (otherUser: any) => {
      const rawProfile = otherUser?.user_profiles;
      const profile = Array.isArray(rawProfile) ? rawProfile[0] || {} : (rawProfile || {});
      const mappedPhotos = (otherUser?.photos || []).map((p: any) => ({
        id: Number(p.id),
        url: filePathToUrl(p.file_path || p.url),
        is_private: p.is_private || false,
        is_primary: p.is_primary || false,
      }));
      const avatarUrl = profile.avatar_url ? filePathToUrl(profile.avatar_url) : (mappedPhotos[0]?.url || null);
      const profilePhotos = mappedPhotos.length > 0
        ? mappedPhotos
        : (avatarUrl ? [{ id: 0, url: avatarUrl, is_private: false, is_primary: true }] : []);

      return {
        id: Number(otherUser?.id),
        name: otherUser?.name || 'Anonymous',
        email: otherUser?.email || '',
        last_seen_at: otherUser?.last_seen_at?.toISOString() || null,
        is_verified: profile.is_verified || false,
        profile: {
          display_name: profile.display_name || otherUser?.name || 'Anonymous',
          bio: profile.bio || null,
          date_of_birth: profile.date_of_birth?.toISOString?.() || null,
          gender: profile.gender || null,
          age: profile.date_of_birth
            ? new Date().getFullYear() - new Date(profile.date_of_birth as any).getFullYear()
            : null,
          current_emotion: (profile.current_emotion || 'neutral').toLowerCase(),
          looking_for: profile.looking_for || [],
          location_latitude: profile.location_latitude ? Number(profile.location_latitude) : null,
          location_longitude: profile.location_longitude ? Number(profile.location_longitude) : null,
          location_description: profile.location_description || null,
          avatar_url: avatarUrl,
          occupation: profile.occupation || null,
          interests: profile.interests || [],
          photos: profilePhotos,
        },
        photos: profilePhotos,
      };
    };

    const byPartnerId = new Map<string, any>();

    for (const match of mutualMatches) {
      const isUser1 = match.user1_id.toString() === myIdStr;
      const otherUser = isUser1
        ? match.users_matches_user2_idTousers
        : match.users_matches_user1_idTousers;
      if (!otherUser?.id) continue;
      const partnerIdStr = otherUser.id.toString();
      if (blockedSet.has(partnerIdStr)) continue;

      byPartnerId.set(partnerIdStr, {
        id: Number(match.id),
        status: match.status || 'accepted',
        relationship_type: 'match',
        is_active: match.is_active ?? true,
        other_user: formatOtherUser(otherUser),
        match_score: match.match_score ? Number(match.match_score) : null,
        created_at: match.created_at?.toISOString() || null,
        last_message_at: match.last_message_at?.toISOString() || null,
      });
    }

    for (const friendship of acceptedFriendships as any[]) {
      const isRequester = friendship.user_id?.toString() === myIdStr;
      const otherUser = isRequester
        ? friendship.users_friends_friend_idTousers
        : friendship.users_friends_user_idTousers;
      if (!otherUser?.id) continue;
      const partnerIdStr = otherUser.id.toString();
      if (blockedSet.has(partnerIdStr)) continue;

      if (byPartnerId.has(partnerIdStr)) {
        byPartnerId.get(partnerIdStr).is_friend = true;
        continue;
      }

      byPartnerId.set(partnerIdStr, {
        // Offset synthetic conversation ID so it never collides with `matches.id`
        id: 1000000000 + Number(friendship.id || otherUser.id),
        status: 'accepted',
        relationship_type: 'friend',
        is_friend: true,
        is_active: true,
        other_user: formatOtherUser(otherUser),
        match_score: null,
        created_at: friendship.created_at?.toISOString?.() || null,
        last_message_at: null,
      });
    }

    // Hydrate `last_message` for each unblocked conversation partner so `/messages`
    // displays the real latest snippet + timestamp instead of "No messages yet".
    const entries = Array.from(byPartnerId.entries());
    await Promise.all(
      entries.map(async ([partnerIdStr, entry]) => {
        try {
          const partnerBigId = BigInt(partnerIdStr);
          const lastMsg = await prisma.messages.findFirst({
            where: {
              OR: [
                { sender_id: userId, receiver_id: partnerBigId },
                { sender_id: partnerBigId, receiver_id: userId },
              ],
            },
            orderBy: { id: 'desc' },
          });
          if (lastMsg) {
            const ts = (lastMsg.sent_at || lastMsg.created_at)?.toISOString?.() || new Date().toISOString();
            entry.last_message = {
              id: Number(lastMsg.id),
              conversation_id: entry.id,
              sender_id: Number(lastMsg.sender_id),
              receiver_id: Number(lastMsg.receiver_id),
              content: lastMsg.content || '',
              message_type: lastMsg.message_type || 'text',
              created_at: ts,
              updated_at: ts,
              is_read: Boolean(lastMsg.is_read),
            };
            if (!entry.last_message_at || ts > entry.last_message_at) {
              entry.last_message_at = ts;
            }
          }
        } catch (_) {}
      })
    );

    const data = entries
      .map(([, entry]) => entry)
      .sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.created_at || 0).getTime();
        const bTime = new Date(b.last_message_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });

    res.json({ data });
  } catch (error: any) {
    console.error('[Matches] Error fetching established matches:', error.message);
    res.json({ data: [] });
  }
});

/**
 * GET /api/matches/history - Get match history
 */
router.get('/history', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    const history = await prisma.matches.findMany({
      where: {
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
      include: {
        users_matches_user1_idTousers: {
          include: { user_profiles: true },
        },
        users_matches_user2_idTousers: {
          include: { user_profiles: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const data = history.map((match: any) => {
      const isUser1 = match.user1_id.toString() === userId.toString();
      const otherUser = isUser1
        ? match.users_matches_user2_idTousers
        : match.users_matches_user1_idTousers;
      const rawProfile = otherUser?.user_profiles;
      const profile = Array.isArray(rawProfile) ? rawProfile[0] || {} : (rawProfile || {});

      return {
        id: Number(match.id),
        name: profile.display_name || otherUser?.name || 'Anonymous',
        avatarUrl: profile.avatar_url || null,
        bio: profile.bio || null,
        compatibilityScore: match.match_score,
        score: match.match_score,
        status: match.status,
        createdAt: match.created_at?.toISOString() || null,
      };
    });

    res.json({ data });
  } catch (error: any) {
    console.error('[Matches] Error fetching history:', error.message);
    res.json({ data: [] });
  }
});

/**
 * POST /api/matches/:matchId/feedback - Submit date feedback
 */
router.post('/:matchId/feedback', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const matchId = BigInt(req.params.matchId);
    const { rating, feedback_text, safety_concerns } = req.body;

    if (!rating) {
      return res.status(400).json({ message: 'Rating is required' });
    }

    // Verify user is part of this match
    const match = await prisma.matches.findFirst({
      where: {
        id: matchId,
        OR: [{ user1_id: userId }, { user2_id: userId }],
      },
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json({
      message: 'Feedback submitted',
      submitted: true,
      feedback: {
        id: Date.now(),
        rating,
        feedback_text: feedback_text || null,
        safety_concerns: safety_concerns || false,
      },
    });
  } catch (error: any) {
    console.error('[Matches] Error submitting feedback:', error.message);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/matches/:matchId/feedback - Check date feedback
 */
// GET /api/matches/tiers-summary — summary of all relationship tiers for user
router.get('/tiers-summary', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const tiers = await prisma.relationship_tiers.findMany({
      where: {
        matches: {
          OR: [{ user1_id: userId }, { user2_id: userId }],
          status: 'accepted',
        },
      },
      take: 50,
    });
    const summary = tiers.map((t: any) => ({
      match_id: Number(t.match_id),
      current_tier: t.current_tier,
      messages_exchanged: t.messages_exchanged || 0,
      days_connected: t.days_connected || 0,
      has_met_in_person: t.has_met_in_person || false,
    }));
    const tierCounts: Record<string, number> = {};
    for (const t of summary) {
      tierCounts[t.current_tier] = (tierCounts[t.current_tier] || 0) + 1;
    }
    res.json({
      tiers: summary,
      total: summary.length,
      tier_counts: tierCounts,
    });
  } catch (err: any) {
    res.json({ tiers: [], total: 0, tier_counts: {} });
  }
});

router.get('/insights/unlocked', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    // Return default unlocked insights (available to all matched users)
    const matchCount = await prisma.matches.count({
      where: { OR: [{ user1_id: userId }, { user2_id: userId }], status: 'accepted' },
    });
    const unlocked = [
      { type: 'match_count', title: 'Match Count', value: matchCount, description: `You have ${matchCount} mutual matches` },
      { type: 'compatibility', title: 'Compatibility Score', message: 'Unlock detailed compatibility insights for 25 tokens', token_cost: 25 },
      { type: 'interest_overlap', title: 'Interest Overlap', message: 'See shared interests with your matches for 15 tokens', token_cost: 15 },
      { type: 'activity_pattern', title: 'Activity Pattern', message: 'Learn when your matches are most active for 20 tokens', token_cost: 20 },
    ];
    res.json({ data: unlocked });
  } catch (error: any) {
    console.error('[MatchInsights] Unlocked error:', error.message);
    res.json({ data: [] });
  }
});

/**
 * GET /api/matches/insights/available - Get available insights
 */
router.get('/insights/available', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const balance = await prisma.users.findUnique({
      where: { id: userId },
      select: { token_balance: true },
    });
    const tokens = Number(balance?.token_balance || 0);
    res.json({
      data: [
        { id: 'compatibility_report', name: 'Compatibility Report', description: 'Detailed analysis of why you matched', token_cost: 25, affordable: tokens >= 25 },
        { id: 'interest_overlap', name: 'Interest Overlap', description: 'See all shared interests with a match', token_cost: 15, affordable: tokens >= 15 },
        { id: 'activity_pattern', name: 'Activity Pattern', description: 'Best times to message your match', token_cost: 20, affordable: tokens >= 20 },
        { id: 'profile_strength', name: 'Profile Strength', description: 'How your profile scores with a match', token_cost: 10, affordable: tokens >= 10 },
        { id: 'conversation_starter', name: 'Conversation Starter', description: 'AI-generated opener based on shared interests', token_cost: 30, affordable: tokens >= 30 },
      ],
      token_balance: tokens,
    });
  } catch (error: any) {
    console.error('[MatchInsights] Available error:', error.message);
    res.json({ data: [] });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeValue(value: any): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function parseBooleanParam(value: any): boolean | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = normalizeValue(value);
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return null;
}

function parseCsvParam(value: any): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseCsvParam(entry));
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => normalizeValue(entry))
    .filter(Boolean);
}

function matchesRequestedFilters(profile: any, filters: any): boolean {
  const prefs = parseJson(profile?.preferences);
  const interests = parseArr(profile?.interests).map(normalizeValue);
  const smoking = normalizeValue(profile?.smoking_status || prefs?.smoking);
  const drinking = normalizeValue(profile?.drinking_status || prefs?.drinking);
  const cannabis = normalizeValue(profile?.cannabis_status || prefs?.cannabis);
  const bodyType = normalizeValue(profile?.body_type);
  const politics = normalizeValue(profile?.political_views || prefs?.politics);
  const religion = normalizeValue(profile?.religion || prefs?.religion);
  const zodiac = normalizeValue(profile?.zodiac_sign);
  const diet = normalizeValue(profile?.dietary_preferences || prefs?.diet);
  const hasPets = typeof profile?.has_pets === 'boolean' ? profile.has_pets : parseBooleanParam(profile?.has_pets);
  const hasChildren = typeof profile?.has_children === 'boolean' ? profile.has_children : parseBooleanParam(profile?.has_children);
  const wantsChildren = typeof profile?.wants_children === 'boolean' ? profile.wants_children : parseBooleanParam(profile?.wants_children);
  const heightCm = profile?.height_cm != null ? Number(profile.height_cm) : null;

  const hairColor = normalizeValue(profile?.hair_color);
  const eyeColor = normalizeValue(profile?.eye_color);
  const skinTone = normalizeValue(profile?.skin_tone);
  const ethnicity = normalizeValue(profile?.ethnicity);
  const facialHair = normalizeValue(profile?.facial_hair);
  const fitnessLevel = normalizeValue(profile?.fitness_level);
  const clothingStyle = normalizeValue(profile?.clothing_style);
  const dominantHand = normalizeValue(profile?.dominant_hand);
  const tattoos = typeof profile?.tattoos === 'boolean' ? profile.tattoos : parseBooleanParam(profile?.tattoos);
  const piercings = typeof profile?.piercings === 'boolean' ? profile.piercings : parseBooleanParam(profile?.piercings);

  if (filters.hair_color && hairColor !== normalizeValue(filters.hair_color)) return false;
  if (filters.eye_color && eyeColor !== normalizeValue(filters.eye_color)) return false;
  if (filters.skin_tone && skinTone !== normalizeValue(filters.skin_tone)) return false;
  if (filters.ethnicity && ethnicity !== normalizeValue(filters.ethnicity)) return false;
  if (filters.facial_hair && facialHair !== normalizeValue(filters.facial_hair)) return false;
  if (filters.fitness_level && fitnessLevel !== normalizeValue(filters.fitness_level)) return false;
  if (filters.clothing_style && clothingStyle !== normalizeValue(filters.clothing_style)) return false;
  if (filters.dominant_hand && dominantHand !== normalizeValue(filters.dominant_hand)) return false;
  if (filters.tattoos !== null && tattoos !== filters.tattoos) return false;
  if (filters.piercings !== null && piercings !== filters.piercings) return false;

  if (filters.smoking && smoking !== normalizeValue(filters.smoking)) return false;
  if (filters.drinking && drinking !== normalizeValue(filters.drinking)) return false;
  if (filters.body_type && bodyType !== normalizeValue(filters.body_type)) return false;
  if (filters.height_min && (!heightCm || heightCm < filters.height_min)) return false;
  if (filters.cannabis && cannabis !== normalizeValue(filters.cannabis)) return false;
  if (filters.diet && diet !== normalizeValue(filters.diet)) return false;
  if (filters.politics && politics !== normalizeValue(filters.politics)) return false;
  if (filters.religion && religion !== normalizeValue(filters.religion)) return false;
  if (filters.zodiac && zodiac !== normalizeValue(filters.zodiac)) return false;
  if (filters.has_pets !== null && hasPets !== filters.has_pets) return false;
  if (filters.has_children !== null && hasChildren !== filters.has_children) return false;
  if (filters.wants_children !== null && wantsChildren !== filters.wants_children) return false;
  if (filters.interests.length > 0 && !filters.interests.some((interest: string) => interests.includes(interest))) return false;

  return true;
}

function parseJson(val: any): any {
  if (val && typeof val === 'object') return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return {}; } }
  return {};
}

function parseArr(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return val.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
  }
  return [];
}

// GET /api/matches/:matchId/tier - relationship tier progress
router.get('/:matchId/feedback', authenticate, async (req: any, res) => {
  try {
    res.json({ message: 'No feedback yet', submitted: false });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to check feedback' });
  }
});

/**
 * POST /api/matches/:matchId/insights/unlock - Unlock match insights (premium)
 */
router.post('/:matchId/insights/unlock', authenticate, async (req: any, res) => {
  try {
    res.json({ message: 'Insight unlocked', success: true });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to unlock insight' });
  }
});

/**
 * GET /api/matches/insights/unlocked - Get unlocked insights
 */
router.get('/:matchId/tier', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const matchId = BigInt(req.params.matchId);
    const match = await prisma.matches.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.user1_id !== userId && match.user2_id !== userId)
      return res.status(403).json({ error: 'Not your match' });
    const otherId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const messageCount = await prisma.messages.count({
      where: { OR: [{ sender_id: userId, receiver_id: otherId }, { sender_id: otherId, receiver_id: userId }] },
    });
    const daysConnected = match.created_at ? Math.floor((Date.now() - new Date(match.created_at.toString()).getTime()) / 86400000) : 0;
    let currentTier = 'new';
    let tierInfo: any = { name: 'New Match', icon: 'wave', color: '#6B7280', unlocks: ['View profile'] };
    if (messageCount >= 50 && daysConnected >= 14) {
      currentTier = 'intimate'; tierInfo = { name: 'Intimate', icon: 'diamond', color: '#8B5CF6', unlocks: ['All photos', 'Full messaging', 'Video calls', 'Private albums', 'Priority matching'] };
    } else if (messageCount >= 20 && daysConnected >= 7) {
      currentTier = 'trusted'; tierInfo = { name: 'Trusted', icon: 'star', color: '#F59E0B', unlocks: ['All photos', 'Full messaging', 'Video calls', 'Private albums'] };
    } else if (messageCount >= 5 && daysConnected >= 3) {
      currentTier = 'connecting'; tierInfo = { name: 'Connecting', icon: 'fire', color: '#EF4444', unlocks: ['Blurred photos', 'Full messaging', 'Audio messages'] };
    } else if (messageCount >= 1) {
      currentTier = 'messaging'; tierInfo = { name: 'Messaging', icon: 'chat', color: '#3B82F6', unlocks: ['Blurred photos', 'Text messaging'] };
    }
    res.json({ match_id: Number(matchId), current_tier: currentTier, messages_exchanged: messageCount, days_connected: daysConnected, has_met_in_person: false, user_confirmed_meeting: false, other_user_confirmed_meeting: false, tier_info: tierInfo, created_at: match.created_at?.toISOString(), updated_at: match.updated_at?.toISOString() });
  } catch (err: any) {
    console.error('[matches] tier error:', err.message);
    res.json({ match_id: Number(req.params.matchId), current_tier: 'new', messages_exchanged: 0, days_connected: 0, has_met_in_person: false, user_confirmed_meeting: false, other_user_confirmed_meeting: false, tier_info: { name: 'New Match', icon: 'wave', color: '#6B7280', unlocks: ['View profile'] } });
  }
});

// PUT /api/matches/:matchId/tier
router.put('/:matchId/tier', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const matchId = BigInt(req.params.matchId);
    const { increment_messages, mark_met_in_person } = req.body;
    const match = await prisma.matches.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.user1_id !== userId && match.user2_id !== userId)
      return res.status(403).json({ error: 'Not your match' });
    res.json({ match_id: Number(matchId), current_tier: 'messaging', previous_tier: 'new', tier_upgraded: !!(increment_messages || mark_met_in_person), messages_exchanged: 0, days_connected: 0, has_met_in_person: !!mark_met_in_person, user_confirmed_meeting: !!mark_met_in_person, other_user_confirmed_meeting: false, tier_info: { name: 'Messaging', icon: 'chat', color: '#3B82F6', unlocks: ['Blurred photos', 'Text messaging'] } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// GET /api/matches/:matchId/photos
router.get('/:matchId/photos', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const matchId = BigInt(req.params.matchId);
    const match = await prisma.matches.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.user1_id !== userId && match.user2_id !== userId)
      return res.status(403).json({ error: 'Not your match' });
    const otherId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const photos = await prisma.photos.findMany({ where: { user_id: otherId }, orderBy: [{ is_primary: 'desc' as const }, { sort_order: 'asc' as const }], take: 12 });
    const realPhotos = photos.map((p: any) => ({ id: Number(p.id), url: filePathToUrl(p.file_path), thumbnail_url: p.thumbnail_path ? filePathToUrl(p.thumbnail_path) : null, type: 'real' as const, is_primary: p.is_primary, blurred: false }));
    res.json({ match_id: Number(matchId), current_tier: 'trusted', ai_photos: [], real_photos: { visible: realPhotos, blurred: [], locked: 0 }, unlock_requirements: { next_tier: null, requirements: [] } });
  } catch (err: any) {
    console.error('[matches] photos error:', err.message);
    res.json({ match_id: Number(req.params.matchId), current_tier: 'new', ai_photos: [], real_photos: { visible: [], blurred: [], locked: 0 }, unlock_requirements: { next_tier: 'messaging', requirements: [{ description: 'Send a message', met: false }] } });
  }
});



export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * Helper: Parse JSON fields that may already be objects or strings
 */
function parseJsonField(val: any): any {
  if (!val) return val;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Calculate Profile Completeness (Mirroring the profile.ts logic)
 */
async function calculateCompleteness(userId: bigint, profile: any) {
  if (!profile) return 0;

  const photoCount = await prisma.photos.count({
    where: { user_id: userId, is_private: false },
  });
  
  const interestsArr = Array.isArray(parseJsonField(profile.interests))
    ? parseJsonField(profile.interests)
    : [];
    
  const prefsRaw: any = parseJsonField(profile.preferences) || {};
  const prefs = typeof prefsRaw === "object" && !Array.isArray(prefsRaw) ? prefsRaw : {};
  const birthDate = profile.date_of_birth || profile.birthdate;

  let earned = 0;

  // Weights (Matching profile.ts)
  if (photoCount >= 3) earned += 25;
  if (profile.bio && String(profile.bio).trim().length >= 10) earned += 20;
  if (birthDate) earned += 10;
  if (profile.location_description || profile.location_latitude) earned += 10;
  if (interestsArr.length >= 3) earned += 10;
  if (profile.occupation || (prefs && prefs.occupation)) earned += 5;
  if (profile.education || (prefs && prefs.education)) earned += 5;
  if (profile.height_cm) earned += 3;
  if (profile.religion) earned += 3;
  if (profile.political_views) earned += 3;
  if (profile.drinking_status || (prefs && prefs.drinking)) earned += 3;
  if (profile.smoking_status || (prefs && prefs.smoking)) earned += 3;

  return earned;
}

// All routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);

    // Why we union accepted matches, accepted friends, and direct message threads
    // (minus bidirectional blocks) instead of querying `prisma.chatrooms.count()`:
    // `chatrooms.count()` counted all 7 global seeded public chatrooms, causing
    // brand-new 0-activity accounts to display "7 Chats" on `/dashboard`.
    // Counting distinct unblocked 1-on-1 partners ensures `/dashboard` matches
    // the private conversations list in `/messages` (`0` for fresh accounts).
    const [
      user,
      profile,
      totalMatches,
      pendingMatches,
      acceptedMatches,
      profileViews,
      todayViews,
      userBlocks,
      activeMatchRows,
      acceptedFriendRows,
      messagePartnerRows,
    ] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId } }),
      prisma.user_profiles.findFirst({ where: { user_id: userId } }),
      prisma.matches.count({ where: { OR: [{ user1_id: userId }, { user2_id: userId }] } }),
      prisma.matches.count({ where: { OR: [{ user1_id: userId }, { user2_id: userId }], status: 'pending' } }),
      prisma.matches.count({ where: { OR: [{ user1_id: userId }, { user2_id: userId }], status: 'accepted' } }),
      prisma.profile_views.count({ where: { viewed_user_id: userId } }).catch(() => 0),
      prisma.profile_views.count({
        where: {
          viewed_user_id: userId,
          created_at: { gte: (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })() }
        }
      }).catch(() => 0),
      prisma.blocks.findMany({
        where: { OR: [{ blocker_id: userId }, { blocked_id: userId }] },
        select: { blocker_id: true, blocked_id: true },
      }).catch(() => []),
      prisma.matches.findMany({
        where: { OR: [{ user1_id: userId }, { user2_id: userId }], status: 'accepted', is_active: true },
        select: { user1_id: true, user2_id: true },
      }).catch(() => []),
      prisma.friends.findMany({
        where: { OR: [{ user_id: userId }, { friend_id: userId }], status: 'accepted' },
        select: { user_id: true, friend_id: true },
      }).catch(() => []),
      prisma.messages.findMany({
        where: { OR: [{ sender_id: userId }, { receiver_id: userId }] },
        select: { sender_id: true, receiver_id: true },
        distinct: ['sender_id', 'receiver_id'],
      }).catch(() => []),
    ]);

    const myIdStr = userId.toString();
    const blockedIds = new Set<string>();
    for (const b of userBlocks as any[]) {
      const other = b.blocker_id?.toString() === myIdStr ? b.blocked_id?.toString() : b.blocker_id?.toString();
      if (other) blockedIds.add(other);
    }

    const conversationPartnerIds = new Set<string>();
    const addPartner = (candidate: any) => {
      const idStr = candidate?.toString();
      if (idStr && idStr !== myIdStr && !blockedIds.has(idStr)) {
        conversationPartnerIds.add(idStr);
      }
    };
    for (const m of activeMatchRows as any[]) {
      addPartner(m.user1_id?.toString() === myIdStr ? m.user2_id : m.user1_id);
    }
    for (const f of acceptedFriendRows as any[]) {
      addPartner(f.user_id?.toString() === myIdStr ? f.friend_id : f.user_id);
    }
    for (const msg of messagePartnerRows as any[]) {
      addPartner(msg.sender_id?.toString() === myIdStr ? msg.receiver_id : msg.sender_id);
    }
    const conversations = conversationPartnerIds.size;

    const daysActive = user?.created_at
      ? Math.max(1, Math.floor((Date.now() - new Date(user.created_at as any).getTime()) / 86400000))
      : 1;

    const completionPercentage = await calculateCompleteness(userId, profile);

    // Why we aggregate real `match_score` rows and return `0` when `totalMatches === 0`:
    // Previously `Math.round(completionPercentage * 0.8)` fabricated `17%` compatibility
    // on brand-new accounts before a single match or compatibility question existed.
    let matchScoreAvg = 0;
    let responseRate = 0;
    try {
      const totalMatchCount = typeof totalMatches === 'number' ? totalMatches : 0;
      const acceptedCount = typeof acceptedMatches === 'number' ? acceptedMatches : 0;
      if (totalMatchCount > 0) {
        const avgRow = await prisma.matches.aggregate({
          _avg: { match_score: true },
          where: { OR: [{ user1_id: userId }, { user2_id: userId }] },
        }).catch(() => null);
        const rawAvg = avgRow?._avg?.match_score;
        if (rawAvg !== null && rawAvg !== undefined && !Number.isNaN(Number(rawAvg))) {
          matchScoreAvg = Math.max(0, Math.min(100, Math.round(Number(rawAvg))));
        } else if (acceptedCount > 0) {
          const acceptRate = (acceptedCount / totalMatchCount) * 100;
          matchScoreAvg = Math.round(Math.min(99, (completionPercentage * 0.6) + (acceptRate * 0.4)));
        }
      }
      const [receivedCount, sentCount] = await Promise.all([
        prisma.messages.count({ where: { receiver_id: userId } }),
        prisma.messages.count({ where: { sender_id: userId } }),
      ]);
      if (sentCount > 0) {
        responseRate = Math.min(100, Math.round((receivedCount / sentCount) * 100));
      } else if (receivedCount > 0) {
        responseRate = 100;
      }
    } catch (_) {}


    res.json({
      total_matches: totalMatches,
      pending_matches: pendingMatches,
      accepted_matches: acceptedMatches,
      conversations,
      profile_views: typeof profileViews === 'number' ? profileViews : 0,
      today_views: typeof todayViews === 'number' ? todayViews : 0,
      match_score_avg: matchScoreAvg,
      response_rate: responseRate,
      days_active: daysActive,
      last_login: user?.last_seen_at?.toISOString() || new Date().toISOString(),
      current_streak: user?.current_streak || 0,
      streak_just_updated: false,
      reverb_healthy: true,
      token_balance: Number(user?.token_balance || 0),
      completion_percentage: completionPercentage,
    });
  } catch (error: any) {
    console.error('[Dashboard] Stats error:', error.message);
    res.json({
      total_matches: 0, pending_matches: 0, accepted_matches: 0,
      conversations: 0, profile_views: 0, today_views: 0,
      match_score_avg: 0, response_rate: 0, days_active: 1,
      last_login: new Date().toISOString(), current_streak: 0,
      streak_just_updated: false, reverb_healthy: true, token_balance: 0,
    });
  }
});

// GET /api/dashboard/activity?limit=8
router.get('/activity', async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const limit = parseInt(req.query.limit as string) || 8;
    const activities: any[] = [];

    // Recent matches
    const recentMatches = await prisma.matches.findMany({
      where: { OR: [{ user1_id: userId }, { user2_id: userId }], status: 'accepted' },
      include: {
        users_matches_user1_idTousers: { include: { user_profiles: true } },
        users_matches_user2_idTousers: { include: { user_profiles: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });
    for (const m of recentMatches) {
      const isUser1 = m.user1_id === userId;
      const partner = isUser1 ? m.users_matches_user2_idTousers : m.users_matches_user1_idTousers;
      const profile = Array.isArray(partner.user_profiles) ? partner.user_profiles[0] : partner.user_profiles;
      
      activities.push({
        id: `match-${m.id}`,
        type: 'match',
          description: 'You have a new match!',
        user: {
          id: Number(partner.id),
          name: profile?.display_name || partner.name || 'Anonymous',
          avatar_url: profile?.avatar_url || null,
        },
        timestamp: m.created_at?.toISOString(),
      });
    }

    // Recent profile views
    const views = await prisma.profile_views.findMany({
      where: { viewed_user_id: userId },
      include: { users_profile_views_viewer_user_idTousers: { include: { user_profiles: true } } },
      orderBy: { created_at: 'desc' },
      take: 5,
    });
    for (const v of views) {
      const viewer = v.users_profile_views_viewer_user_idTousers;
      if (!viewer) continue;
      const profile = Array.isArray(viewer.user_profiles) ? viewer.user_profiles[0] : viewer.user_profiles;
      
      activities.push({
        id: `view-${v.id}`,
        type: 'view',
          description: `${profile?.display_name || viewer.name || 'Someone'} viewed your profile`,
        user: {
          id: Number(viewer.id),
          name: profile?.display_name || viewer.name || 'Anonymous',
          avatar_url: profile?.avatar_url || null,
        },
        timestamp: v.created_at?.toISOString(),
      });
    }

    // Recent messages received
    try {
      const recentMsgs = await prisma.messages.findMany({
        where: { receiver_id: userId },
        include: {
          users_messages_sender_idTousers: { include: { user_profiles: { take: 1 } } },
        },
        orderBy: { created_at: 'desc' },
        take: 3,
      });
      for (const msg of recentMsgs) {
        const sender = msg.users_messages_sender_idTousers;
        if (!sender) continue;
        const profile = Array.isArray(sender.user_profiles) ? sender.user_profiles[0] : sender.user_profiles;
        activities.push({
          id: `msg-${msg.id}`,
          type: 'message',
          description: msg.content?.substring(0, 60),
          user: {
            id: Number(sender.id),
            name: profile?.display_name || sender.name || 'Someone',
            avatar_url: profile?.avatar_url || null,
          },
          timestamp: msg.created_at?.toISOString(),
        });
      }
    } catch (_) {}

    // Recent check-ins (streak activity)
    try {
      const recentCheckins = await prisma.venue_checkins.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 3,
      });
      for (const c of recentCheckins) {
        activities.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          description: 'Checked in at a venue',
          timestamp: c.created_at?.toISOString(),
        });
      }
    } catch (_) {}

    // Pending match requests
    try {
      const pendingAs = await prisma.matches.findMany({
        where: { user2_id: userId, status: 'pending' },
        include: {
          users_matches_user1_idTousers: { include: { user_profiles: { take: 1 } } },
        },
        orderBy: { created_at: 'desc' },
        take: 3,
      });
      for (const m of pendingAs) {
        const requester = m.users_matches_user1_idTousers;
        if (!requester) continue;
        const profile = Array.isArray(requester.user_profiles) ? requester.user_profiles[0] : requester.user_profiles;
        activities.push({
          id: `pending-${m.id}`,
          type: 'pending_match',
          description: 'Wants to match with you',
          user: {
            id: Number(requester.id),
            name: profile?.display_name || requester.name || 'Someone',
            avatar_url: profile?.avatar_url || null,
          },
          timestamp: m.created_at?.toISOString(),
        });
      }
    } catch (_) {}

    activities.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    res.json(activities.slice(0, limit));
  } catch (error: any) {
    console.error('[Dashboard] Activity error:', error.message, error.stack);
    res.json([]);
  }
});

export default router;

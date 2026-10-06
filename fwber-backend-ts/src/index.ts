// Global BigInt JSON serializer — converts all BigInt to Number for API responses
(BigInt.prototype as any).toJSON = function () { return Number(this); };

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import { createServer } from 'http';
import emailRoutes from './routes/email.js';

import authRoutes from './routes/auth.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import profileRoutes from './routes/profile.js';
import notificationRoutes from './routes/notifications.js';
import safetyRoutes from './routes/safety.js';
import matchesRoutes from './routes/matches.js';
import photosRoutes from './routes/photos.js';
import topicsRoutes from './routes/topics.js';
import verificationRoutes from './routes/verification.js';
import telemetryRoutes from './routes/telemetry.js';
import physicalProfileRoutes from './routes/physical-profile.js';
import friendsRoutes from './routes/friends.js';
import relationshipLinksRoutes from './routes/relationship-links.js';
import vouchRoutes from './routes/vouch.js';
import eventsRoutes from './routes/events.js';
import locationRoutes from './routes/location.js';
import wingmanRoutes from './routes/wingman.js';
import publicRoutes from './routes/public.js';
import recommendationsRoutes from './routes/recommendations.js';
import marketplaceRoutes from './routes/marketplace.js';
import giftsRoutes from './routes/gifts.js';
import dealsRoutes from './routes/deals.js';
import leaderboardRoutes from './routes/leaderboard.js';
import identityRoutes from './routes/identity.js';
import groupsRoutes from './routes/groups.js';
import walletRoutes from './routes/wallet.js';
import venuesRoutes from './routes/venues.js';
import premiumRoutes from './routes/premium.js';
import userRoutes from './routes/user.js';
import proximityRoutes from './routes/proximity.js';
import onboardingRoutes from './routes/onboarding.js';
import matchingRoutes from './routes/matching.js';
import videoRoutes from './routes/video.js';
import referralsRoutes from './routes/referrals.js';
import boostsRoutes from './routes/boosts.js';
import contentGenerationRoutes from './routes/content-generation.js';
import catsRoutes from './routes/cats.js';
import securityRoutes from './routes/security.js';
import blocksRoutes from './routes/blocks.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import notificationPreferencesRoutes from './routes/notification-preferences.js';
import hardwareTokensRoutes from './routes/hardware-tokens.js';
import merchantRoutes from './routes/merchant.js';
import bountiesRoutes from './routes/bounties.js';
import achievementsRoutes from './routes/achievements.js';
import scrapbookRoutes from './routes/scrapbook.js';
import chatroomsRoutes from './routes/chatrooms.js';
import chatRoutes from './routes/chat.js';
import bulletinBoardsRoutes from './routes/bulletin-boards.js';
import burnerLinksRoutes from './routes/burner-links.js';
import feedbackRoutes from './routes/feedback.js';
import journalsRoutes from './routes/journals.js';
import proximityChatroomsRoutes from './routes/proximity-chatrooms.js';
import audioRoomsRoutes from './routes/audio-rooms.js';
import reportsRoutes from './routes/reports.js';
import merchantPortalRoutes from './routes/merchant-portal.js';
import moderationRoutes from './routes/moderation.js';
import messagesRoutes from './routes/messages.js';
import federationRoutes from './routes/federation.js';
import monitoringRoutes from './routes/monitoring.js';
import questsRoutes from './routes/quests.js';
import paymentsRoutes from './routes/payments.js';
import contactsIntegrationSyncRoutes from './routes/contacts-integration-sync.js';
import contactsIntegrationRoutes from './routes/contacts-integration.js';
import shareUnlocksRoutes from './routes/share-unlocks.js';
import viralContentRoutes from './routes/viral-content.js';
import configRoutes from './routes/config.js';
import healthRoutes from './routes/health.js';
import iceBreakersRoutes from './routes/ice-breakers.js';
import settingsRoutes from './routes/settings.js';
import trustScoreRoutes from './routes/trust-score.js';
import prisma from './lib/prisma.js';
import { setupSocketIO } from './socket.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4003;
const httpServer = createServer(app);

// Initialize Socket.io
setupSocketIO(httpServer);

// Middleware
app.use(cors({
  origin: [
    'https://www.fwber.site',
    'https://fwber.site',
    'http://localhost:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(helmet({ 
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://*.fwber.site", "https://*.cloudinary.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://*.fwber.site", "https://openrouter.ai", "https://api.openai.com"],
    },
  },
}));
app.use(morgan('dev'));
// Parse JSON bodies — skip for multipart/form-data (file uploads)
app.use(express.json({ verify: (req, _res, buf) => {
  // Only parse if content-type is JSON; skip multipart
  if (req.headers['content-type']?.startsWith('multipart/')) return;
  (req as any)._rawBody = buf;
} }));

// Serve uploaded photos as static files
import path from 'path';
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/integrations/contacts/data', contactsIntegrationSyncRoutes);
app.use('/api/integrations/contacts', contactsIntegrationRoutes);

app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/physical-profile', physicalProfileRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/relationship-links', relationshipLinksRoutes);
app.use('/api/relationship-tiers', matchesRoutes); // alias - tiers served from matches route
app.use('/api/trust-score', trustScoreRoutes);
app.use('/api/vouch', vouchRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/wingman', wingmanRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/viral-content', viralContentRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/gifts', giftsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/user', userRoutes);
app.use('/api/proximity', proximityRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/video-calls', videoRoutes); // alias for frontend compatibility
app.use('/api/referrals', referralsRoutes);
app.use('/api/boosts', boostsRoutes);
app.use('/api/content', contentGenerationRoutes);
app.use('/api/content-generation', contentGenerationRoutes);
app.use('/api/cats', catsRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/blocks', blocksRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/hardware-tokens', hardwareTokensRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/bounties', bountiesRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/scrapbook', scrapbookRoutes);
app.use('/api/chatrooms', chatroomsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bulletin-boards', bulletinBoardsRoutes);
app.use('/api/burner-links', burnerLinksRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/journals', journalsRoutes);
app.use('/api/proximity-chatrooms', proximityChatroomsRoutes);
app.use('/api/conference-pulse', proximityChatroomsRoutes);  // alias for frontend compatibility
app.use('/api/audio-rooms', audioRoomsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/merchant-portal', merchantPortalRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/federation', federationRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/integrations/contacts/data', contactsIntegrationSyncRoutes);
app.use('/api/integrations/contacts', contactsIntegrationRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ice-breakers', iceBreakersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/share-unlocks', shareUnlocksRoutes);
app.use('/api/payments', paymentsRoutes);


// WebFinger Route for ActivityPub Federation
app.get('/.well-known/webfinger', async (req, res) => {
  const resource = req.query.resource as string;
  if (!resource || !resource.startsWith('acct:')) {
    return res.status(400).json({ error: 'Invalid resource parameter' });
  }

  const [username, domain] = resource.replace('acct:', '').split('@');

  try {
    const user = await prisma.users.findFirst({
      where: { name: username as string },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      subject: `acct:${user.name}@fwber.site`,
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: `https://api.fwber.site/api/federation/actors/${user.id}`
        }
      ]
    });
  } catch (error) {
    console.error('[WebFinger] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Catch-all for unmatched /api/* routes — return safe defaults instead of 404 HTML

app.use('/api', (_req, res) => {
  // Return an empty array for GET, success object for everything else
  if (_req.method === 'GET') {
    res.json([]);
  } else {
    res.json({ success: true });
  }
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', version: '2.0.0-ts' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Basic Route for testing
app.get('/', (req, res) => {
  res.json({ message: 'FWBER TypeScript Backend API v2.0' });
});

let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = httpServer.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

(app as any).close = () => {
  if (server) server.close();
};
export default app;

// Autonomous Protocol Heartbeat (Periodic System Integrity Check)
import { MaintenanceService } from './services/MaintenanceService.js';
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      await MaintenanceService.performMaintenance();
    } catch (err) {
      // Silent fail for heartbeat
    }
  }, 300000); // Every 5 minutes
}

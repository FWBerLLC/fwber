import { Router, type Response } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import axios from 'axios';
import { validateFederationUrl, getHardenedFederationAgent } from '../lib/ssrf.js';
import { FederationService } from '../services/FederationService.js';

const router = Router();
const federationService = new FederationService();

// GET /api/federation/actors/:id — get actor detail (No auth required for federation)
router.get('/actors/:id', async (req, res) => {
  const id = req.params.id;

  // Handle 'detail' or other non-numeric IDs gracefully
  if (isNaN(Number(id))) {
    return res.status(404).json({ error: 'Actor not found' });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(id) },
      include: { user_profiles: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const profile = user.user_profiles?.[0];

    res.json({
      '@context': [
        'https://www.w3.org/ns/activitystreams',
        'https://w3id.org/security/v1'
      ],
      id: `https://${apiDomain}/api/federation/actors/${user.id}`,
      type: 'Person',
      preferredUsername: user.name,
      name: profile?.display_name || user.name,
      summary: profile?.bio || 'A user on the fwber network.',
      icon: profile?.avatar_url ? {
          type: 'Image',
          mediaType: 'image/jpeg',
          url: profile.avatar_url
      } : null,
      'fwber:currentEmotion': profile?.current_emotion || 'Neutral',
      'fwber:auraScore': profile?.current_emotion ? 1.0 : 0.0,
      inbox: `https://${apiDomain}/api/federation/users/${user.id}/inbox`,
      outbox: `https://${apiDomain}/api/federation/users/${user.id}/outbox`,
      publicKey: {
        id: `https://${apiDomain}/api/federation/actors/${user.id}#main-key`,
        owner: `https://${apiDomain}/api/federation/actors/${user.id}`,
        publicKeyPem: user.public_key || 'mock-public-key',
      }
    });
  } catch (error) {
    console.error('[Federation] Error fetching actor:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/federation/users/:id/inbox - Receive inbox messages
router.post('/users/:id/inbox', async (req, res) => {
  const isValid = await federationService.verifyHttpSignature(req);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid HTTP Signature' });
  }

  const payload = req.body;
  if (!payload || !payload.type) {
    return res.status(400).json({ error: 'Invalid ActivityPub payload' });
  }

  try {
    await prisma.federation_inbox.create({
      data: {
        activity_id: payload.id || `act-${Date.now()}`,
        actor_uri: payload.actor || 'unknown',
        type: payload.type,
        payload: payload as any,
      }
    });

    // Process activity asynchronously
    federationService.processInboxActivity(payload, BigInt(req.params.id)).catch(console.error);

    res.status(202).json({ success: true, message: 'Activity accepted' });
  } catch (error) {
    console.error('[Federation] Error processing inbox:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/federation/users/:userId/outbox — get user outbox (Standard OrderedCollection)
router.get('/users/:userId/outbox', async (req, res) => {
  try {
    const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
    const { userId } = req.params;
    const page = req.query.page === 'true';

    const actorUri = `https://${apiDomain}/api/federation/actors/${userId}`;
    const outboxUri = `https://${apiDomain}/api/federation/users/${userId}/outbox`;

    const totalItems = await prisma.federation_outbox.count({
        where: { actor_uri: actorUri }
    });

    if (!page) {
        return res.json({
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: outboxUri,
            type: 'OrderedCollection',
            totalItems: totalItems,
            first: `${outboxUri}?page=true`,
            last: `${outboxUri}?page=true`
        });
    }

    const outboxItems = await prisma.federation_outbox.findMany({
      where: { actor_uri: actorUri },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    res.json({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${outboxUri}?page=true`,
      type: 'OrderedCollectionPage',
      partOf: outboxUri,
      totalItems: totalItems,
      orderedItems: outboxItems.map(item => item.payload)
    });
  } catch (error) {
    console.error('[Federation] Error fetching outbox:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.use(authenticate);

// GET /api/federation — list federation status
router.get('/', (_req, res) => res.json({
  enabled: true,
  status: 'active',
  message: 'Federation is active',
}));

// Admin: GET /api/federation/admin/peers — list discovered peers
router.get('/admin/peers', async (req: AuthRequest, res: Response) => {
    if (!req.user?.is_moderator) return res.status(403).json({ error: 'Forbidden' });

    try {
        const peers = await prisma.federated_servers.findMany({
            orderBy: { discovered_at: 'desc' }
        });
        res.json({ peers });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: POST /api/federation/admin/peers/:id/toggle-block — toggle peer block
router.post('/admin/peers/:id/toggle-block', async (req: AuthRequest, res: Response) => {
    if (!req.user?.is_moderator) return res.status(403).json({ error: 'Forbidden' });

    const idStr = req.params.id;
    if (!idStr) return res.status(400).json({ error: 'ID is required' });

    try {
        const peer = await prisma.federated_servers.findUnique({ where: { id: BigInt(idStr as string) } });
        if (!peer) return res.status(404).json({ error: 'Peer not found' });

        const updated = await prisma.federated_servers.update({
            where: { id: peer.id },
            data: { is_blocked: !peer.is_blocked }
        });

        res.json({ success: true, is_blocked: updated.is_blocked });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/federation/activity - Unified Activity Center endpoint
router.get('/activity', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const inboxItems = await prisma.federation_inbox.findMany({
            where: {
                OR: [
                    { payload: { path: ['to'], array_contains: localActorUri as any } },
                    { payload: { path: ['cc'], array_contains: localActorUri as any } },
                    { payload: { path: ['object', 'attributedTo'], equals: localActorUri as any } },
                    { payload: { path: ['object', 'inReplyTo'], equals: localActorUri as any } },
                    { payload: { path: ['to'], array_contains: 'https://www.w3.org/ns/activitystreams#Public' } }
                ]
            },
            orderBy: { created_at: 'desc' },
            take: 50
        });

        const activity = inboxItems.map((item: any) => {
            const payload = item.payload as any;
            const actorUri = item.actor_uri;
            const object = payload?.object || {};

            // More robust content extraction for remote activities
            let content = '';
            if (typeof object === 'string') {
                content = object;
            } else if (object.content) {
                content = object.content;
            } else if (object.type) {
                content = `Activity regarding ${object.type}`;
            }

            return {
                id: Number(item.id),
                type: item.type,
                actor_uri: actorUri,
                actor_username: (typeof payload.actor === 'object' ? payload.actor.preferredUsername : null) || actorUri?.split('/').pop() || 'unknown',
                actor_domain: actorUri?.includes('http') ? new URL(actorUri).host : 'unknown',
                content: content,
                timestamp: item.created_at?.toISOString() || new Date().toISOString(),
                payload: payload
            };
        });

        res.json({ activity });
    } catch (err: any) {
        console.error('[Federation] Error fetching activity:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/federation/feed/following — get posts only from actors the user follows
router.get('/feed/following', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const following = await prisma.federation_follows.findMany({
            where: { actor_uri: localActorUri, status: 'accepted' },
            select: { target_uri: true }
        });

        const followedUris = following.map(f => f.target_uri);

        if (followedUris.length === 0) {
            return res.json({ posts: [], total: 0 });
        }

        const inboxItems = await prisma.federation_inbox.findMany({
            where: {
                type: 'Create',
                actor_uri: { in: followedUris }
            },
            orderBy: { created_at: 'desc' },
            take: 50
        });

        const posts = inboxItems.map((item: any) => {
            const payload = item.payload as any;
            const object = payload?.object || {};

            return {
                id: Number(item.id),
                actor_uri: item.actor_uri,
                actor_username: item.actor_uri?.split('/').pop() || 'unknown',
                actor_domain: item.actor_uri ? new URL(item.actor_uri).host : 'unknown',
                content: object.content || '',
                published_at: object.published || item.created_at?.toISOString() || new Date().toISOString(),
                payload: payload
            };
        });

        res.json({ posts, total: posts.length });
    } catch (err: any) {
        console.error('[Federation] Error fetching following feed:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/federation/posts — get federation posts from inbox
router.get('/posts', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const inboxItems = await prisma.federation_inbox.findMany({
            where: {
                type: 'Create',
                OR: [
                    { payload: { path: ['to'], array_contains: 'https://www.w3.org/ns/activitystreams#Public' } },
                    { payload: { path: ['to'], array_contains: localActorUri as any } },
                    { payload: { path: ['cc'], array_contains: localActorUri as any } }
                ]
            },
            orderBy: { created_at: 'desc' },
            take: 50
        });

        const posts = inboxItems.map((item: any) => {
            const payload = item.payload as any;
            const object = payload?.object || {};

            return {
                id: Number(item.id),
                actor_uri: item.actor_uri,
                actor_username: item.actor_uri?.split('/').pop() || 'unknown',
                actor_domain: item.actor_uri ? new URL(item.actor_uri).host : 'unknown',
                content: object.content || '',
                published_at: object.published || item.created_at?.toISOString() || new Date().toISOString(),
                metadata: {
                    name: object.name || 'Remote Post',
                    summary: object.summary || ''
                }
            };
        });

        res.json({ posts, total: posts.length });
    } catch (err: any) {
        console.error('[Federation] Error fetching posts:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/federation/following - Get external actors user is following
router.get('/following', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const following = await prisma.federation_follows.findMany({
            where: { actor_uri: `https://${apiDomain}/api/federation/actors/${req.user!.id}` }
        });

        const mapped = following.map((f: any) => ({
            id: Number(f.id),
            actor_uri: f.target_uri,
            username: f.target_uri.split('/').pop(),
            domain: new URL(f.target_uri).host,
            status: f.status
        }));

        res.json({ following: mapped });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/posts/:id/unlike - Unlike a federated post (Undo Like)
router.post('/posts/:id/unlike', authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { actor_uri } = req.body;

    if (!actor_uri) return res.status(400).json({ error: 'actor_uri is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const undoLikeActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/undo-like-${Date.now()}`,
            type: 'Undo',
            actor: localActorUri,
            object: {
                type: 'Like',
                actor: localActorUri,
                object: id
            }
        };

        const success = await federationService.sendActivityToActor(actor_uri, undoLikeActivity, user.private_key, localActorUri);

        if (success) {
            res.json({ success: true, message: 'Unlike sent to remote server' });
        } else {
            res.status(502).json({ error: 'Failed to deliver unlike to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/unfollow - Unfollow an external actor
router.post('/unfollow', authenticate, async (req: AuthRequest, res: Response) => {
    const { actor_id } = req.body;
    if (!actor_id) return res.status(400).json({ error: 'actor_id is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const undoActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/undo-${Date.now()}`,
            type: 'Undo',
            actor: localActorUri,
            object: {
                type: 'Follow',
                actor: localActorUri,
                object: actor_id
            }
        };

        const success = await federationService.sendActivityToActor(actor_id, undoActivity, user.private_key, localActorUri);

        if (success) {
            await prisma.federation_follows.deleteMany({
                where: { actor_uri: localActorUri, target_uri: actor_id }
            });
            res.json({ success: true, message: 'Unfollow request sent' });
        } else {
            res.status(502).json({ error: 'Failed to deliver unfollow request to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/posts/:id/unboost - Unboost a federated post (Undo Announce)
router.post('/posts/:id/unboost', authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { actor_uri } = req.body;

    if (!actor_uri) return res.status(400).json({ error: 'actor_uri is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const undoAnnounceActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/undo-announce-${Date.now()}`,
            type: 'Undo',
            actor: localActorUri,
            object: {
                type: 'Announce',
                actor: localActorUri,
                object: id
            }
        };

        const success = await federationService.sendActivityToActor(actor_uri, undoAnnounceActivity, user.private_key, localActorUri);

        if (success) {
            res.json({ success: true, message: 'Unboost sent to remote server' });
        } else {
            res.status(502).json({ error: 'Failed to deliver unboost to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/federation/followers - Get external actors following user
router.get('/followers', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const followers = await prisma.federation_follows.findMany({
            where: { target_uri: `https://${apiDomain}/api/federation/actors/${req.user!.id}`, status: 'accepted' }
        });

        const mapped = followers.map((f: any) => ({
            id: Number(f.id),
            actor_uri: f.actor_uri,
            username: f.actor_uri.split('/').pop(),
            domain: new URL(f.actor_uri).host
        }));

        res.json({ followers: mapped });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/follow - Follow an external actor
router.post('/follow', authenticate, async (req: AuthRequest, res: Response) => {
    const { actor_id } = req.body;
    if (!actor_id) return res.status(400).json({ error: 'actor_id is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const followActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/follow-${Date.now()}`,
            type: 'Follow',
            actor: localActorUri,
            object: actor_id
        };

        const success = await federationService.sendActivityToActor(actor_id, followActivity, user.private_key, localActorUri);

        if (success) {
            await prisma.federation_follows.upsert({
                where: {
                    id: (await prisma.federation_follows.findFirst({
                        where: { actor_uri: localActorUri, target_uri: actor_id }
                    }))?.id || -1n
                },
                update: { status: 'pending' },
                create: {
                    actor_uri: localActorUri,
                    target_uri: actor_id,
                    status: 'pending'
                }
            });
            res.json({ success: true, message: 'Follow request sent' });
        } else {
            res.status(502).json({ error: 'Failed to deliver follow request to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/federation/search - Search for external actors
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Query is required' });

    console.log(`[Federation] Searching for actor: ${q}`);

    // Check if query is a direct ActivityPub URI
    let actorUri: string | null = null;
    if (q.startsWith('http://') || q.startsWith('https://')) {
        actorUri = q;
    } else if (q.includes('@')) {
        try {
            actorUri = await federationService.resolveWebFinger(q);
            if (actorUri) {
                if (!(await validateFederationUrl(actorUri))) {
                    console.warn(`[Federation] Blocked SSRF attempt during search detail fetch: ${actorUri}`);
                    return res.status(400).json({ error: 'Invalid actor URI' });
                }

                // Fetch actor details with pinned IP to prevent DNS rebinding
                const hardenedAgent = await getHardenedFederationAgent(actorUri);
                const actorRes = await axios.get(actorUri, {
                    headers: { Accept: 'application/activity+json' },
                    timeout: 5000,
                    httpAgent: hardenedAgent,
                    httpsAgent: hardenedAgent
                });

                const actor = actorRes.data;
                const domain = new URL(actorUri).hostname;

                return res.json({
                    actors: [
                        {
                            id: actor.id,
                            preferredUsername: actor.preferredUsername || actor.name,
                            server: domain,
                            name: actor.name || actor.preferredUsername,
                            summary: actor.summary || '',
                            icon: actor.icon ? { url: actor.icon.url || actor.icon } : { url: `https://ui-avatars.com/api/?name=${actor.preferredUsername || 'A'}&background=random` }
                        }
                    ]
                });
            }
        } catch (err: any) {
            console.error(`[Federation] Failed to fetch actor details after WebFinger:`, err.message);
        }
    }

    // Fallback to local user search if WebFinger fails or query is not a handle
    try {
        const localUsers = await prisma.users.findMany({
            where: {
                OR: [
                    { name: { contains: q } },
                    { email: { contains: q } }
                ]
            },
            take: 5
        });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const actors = localUsers.map(u => ({
            id: `https://${apiDomain}/api/federation/actors/${u.id}`,
            preferredUsername: u.name,
            server: apiDomain,
            name: u.name,
            summary: 'Local fwber user',
            icon: { url: `https://ui-avatars.com/api/?name=${u.name}&background=random` }
        }));

        res.json({ actors });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/posts/:id/like - Like a federated post
router.post('/posts/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { actor_uri } = req.body; // The URI of the remote post author

    if (!actor_uri) return res.status(400).json({ error: 'actor_uri is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const likeActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/like-${Date.now()}`,
            type: 'Like',
            actor: localActorUri,
            object: id // The ID of the post (usually a URI)
        };

        const success = await federationService.sendActivityToActor(actor_uri, likeActivity, user.private_key, localActorUri);

        if (success) {
            res.json({ success: true, message: 'Like sent to remote server' });
        } else {
            res.status(502).json({ error: 'Failed to deliver Like to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/posts/:id/reply - Reply to a federated post
router.post('/posts/:id/reply', authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { content, actor_uri } = req.body;

    if (!content) return res.status(400).json({ error: 'content is required' });
    if (!actor_uri) return res.status(400).json({ error: 'actor_uri is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true, name: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const noteId = `https://${apiDomain}/api/federation/notes/reply-${Date.now()}`;
        const replyActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/reply-${Date.now()}`,
            type: 'Create',
            actor: localActorUri,
            object: {
                id: noteId,
                type: 'Note',
                inReplyTo: id,
                content: content,
                attributedTo: localActorUri,
                to: ['https://www.w3.org/ns/activitystreams#Public'],
                cc: [actor_uri]
            }
        };

        const success = await federationService.sendActivityToActor(actor_uri, replyActivity, user.private_key, localActorUri);

        if (success) {
            res.json({ success: true, message: 'Reply sent to remote server', activity: replyActivity });
        } else {
            res.status(502).json({ error: 'Failed to deliver reply to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/federation/posts/:id/boost - Boost (Announce) a federated post
router.post('/posts/:id/boost', authenticate, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { actor_uri } = req.body;

    if (!actor_uri) return res.status(400).json({ error: 'actor_uri is required' });

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user!.id },
            select: { private_key: true }
        });

        if (!user?.private_key) return res.status(400).json({ error: 'User has no signing keys' });

        const apiDomain = process.env.API_DOMAIN || 'api.fwber.site';
        const localActorUri = `https://${apiDomain}/api/federation/actors/${req.user!.id}`;

        const announceActivity = {
            '@context': 'https://www.w3.org/ns/activitystreams',
            id: `https://${apiDomain}/api/federation/activities/announce-${Date.now()}`,
            type: 'Announce',
            actor: localActorUri,
            object: id
        };

        const success = await federationService.sendActivityToActor(actor_uri, announceActivity, user.private_key, localActorUri);

        if (success) {
            res.json({ success: true, message: 'Boost sent to remote server' });
        } else {
            res.status(502).json({ error: 'Failed to deliver Boost to remote server' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

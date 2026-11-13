import { Router } from 'express';
import prisma from '../lib/prisma.js';

/**
 * Inbound WebFinger discovery (RFC 7033).
 *
 * Remote ActivityPub servers (Mastodon, Pleroma, …) discover fwber users
 * by querying `GET /.well-known/webfinger?resource=acct:user@domain` and
 * following the `rel="self"` + `application/activity+json` link to the
 * actor document in routes/federation.ts. fwber could resolve *outbound*
 * handles for years (FederationService.resolveWebFinger) but never served
 * this endpoint, so remote servers could not discover fwber users at all.
 *
 * Contract notes:
 * - Handles live on the API domain because actor URIs do
 *   (`https://<API_DOMAIN>/api/federation/actors/:id`); foreign domains 404
 *   without touching the database.
 * - Username matching is case-insensitive, matching how the actor document
 *   advertises `preferredUsername`.
 * - Responses are `application/jrd+json` per RFC 7033 §4.
 */

const router = Router();

router.get('/webfinger', async (req, res) => {
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';

  const match = /^acct:([^@\s]+)@([^@\s]+)$/i.exec(resource);
  if (!match) {
    return res.status(400).json({ error: 'resource must be an acct: URI (acct:user@domain)' });
  }

  const username = match[1];
  const domain = match[2];
  if (!username || !domain) {
    return res.status(400).json({ error: 'resource must be an acct: URI (acct:user@domain)' });
  }
  const apiDomain = process.env.API_DOMAIN || 'api.fwber.online';
  // Handles are advertised on the public web domain (acct:user@fwber.online,
  // per the long-standing Federation.test contract) while actor documents
  // live on the API domain; accept both, 404 anything foreign.
  const acceptedDomains = new Set([apiDomain.toLowerCase(), 'fwber.online', 'www.fwber.online']);
  if (!acceptedDomains.has(domain.toLowerCase())) {
    return res.status(404).json({ error: 'Unknown domain' });
  }

  try {
    // MySQL's utf8mb4 case-insensitive collation makes `equals` match
    // handle casing; Prisma's MySQL StringFilter has no `mode` option.
    const user = await prisma.users.findFirst({
      where: { name: { equals: username } },
      select: { id: true, name: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const actorUri = `https://${apiDomain}/api/federation/actors/${user.id}`;

    res.set('Content-Type', 'application/jrd+json');
    return res.json({
      subject: `acct:${user.name}@${domain.toLowerCase()}`,
      aliases: [actorUri],
      links: [
        {
          rel: 'self',
          type: 'application/activity+json',
          href: actorUri,
        },
        {
          rel: 'http://webfinger.net/rel/profile-page',
          type: 'text/html',
          href: `https://fwber.online/profile/${user.id}`,
        },
      ],
    });
  } catch (error) {
    console.error('[WebFinger] Lookup failed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

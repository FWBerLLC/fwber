import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';
import axios from 'axios';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

const SUPPORTED_PROVIDERS = ['google', 'microsoft', 'facebook'] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

function isSupportedProvider(p: string): p is SupportedProvider {
    return (SUPPORTED_PROVIDERS as readonly string[]).includes(p);
}

function isProviderOAuthConfigured(provider: SupportedProvider): boolean {
    if (provider === 'google') return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    if (provider === 'microsoft') return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
    if (provider === 'facebook') return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_CLIENT_SECRET);
    return false;
}

/**
 * Endpoint 0: Real Connected Account Status (`v2.3.89`)
 * GET /api/integrations/contacts/status
 *
 * Replaces the frontend's hardcoded `{ google: false, microsoft: false, facebook: true }`
 * mock state with live `user_integrations` records and server OAuth capability flags.
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = BigInt(req.user!.id);
        const rows = await prisma.user_integrations.findMany({
            where: { user_id: userId },
            include: {
                _count: { select: { synced_contacts: true } },
            },
        });

        const byProvider: Record<string, any> = {};
        for (const p of SUPPORTED_PROVIDERS) {
            const match = rows.find((r) => r.provider === p);
            byProvider[p] = {
                connected: Boolean(match),
                configured: isProviderOAuthConfigured(p),
                connected_at: match?.created_at ? new Date(match.created_at).toISOString() : null,
                updated_at: match?.updated_at ? new Date(match.updated_at).toISOString() : null,
                contacts_count: Number((match as any)?._count?.synced_contacts ?? 0),
            };
        }

        return res.json({ providers: byProvider });
    } catch (err: any) {
        console.error('[Integrations] Status query failed:', err?.message || err);
        return res.status(500).json({ error: 'Failed to fetch integration status' });
    }
});

/**
 * Endpoint 1: Generate Authenticated OAuth Authorization URL
 * GET /api/integrations/contacts/auth/:provider
 */
router.get('/auth/:provider', authenticate, (req: AuthRequest, res: Response) => {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!isSupportedProvider(provider)) {
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    if (!isProviderOAuthConfigured(provider)) {
        return res.status(503).json({
            error: `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth credentials are not configured on this server yet.`,
            configured: false,
            provider,
        });
    }

    // SECURE: Encode the userId into a signed state parameter to recover it in the callback
    const state = jwt.sign({ userId: req.user!.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
    const appBase = (process.env.APP_URL || 'https://api.fwber.online').replace(/\/+$/, '');
    const redirectUri = `${appBase}/api/integrations/contacts/callback/${provider}`;

    let url = '';
    if (provider === 'google') {
        const scopes = 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.profile';
        url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID!)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
    } else if (provider === 'microsoft') {
        const scopes = 'Contacts.Read User.Read offline_access';
        url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(process.env.MICROSOFT_CLIENT_ID!)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
    } else if (provider === 'facebook') {
        const scopes = 'public_profile,email,user_friends';
        url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(process.env.FACEBOOK_APP_ID!)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
    }

    return res.json({ url, provider });
});

/**
 * Endpoint 2: Disconnect / Revoke Provider (`v2.3.89`)
 * DELETE /api/integrations/contacts/:provider
 */
router.delete('/:provider', authenticate, async (req: AuthRequest, res: Response) => {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!isSupportedProvider(provider)) {
        return res.status(400).json({ error: 'Unsupported provider' });
    }
    try {
        const userId = BigInt(req.user!.id);
        await prisma.user_integrations.deleteMany({
            where: { user_id: userId, provider },
        });
        return res.json({ success: true, provider });
    } catch (err: any) {
        console.error('[Integrations] Disconnect failed:', err?.message || err);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
    }
});

/**
 * Endpoint 3: OAuth Callback (Google, Microsoft 365, Facebook)
 */
router.get('/callback/:provider', async (req: Request, res: Response) => {
    const provider = String(req.params.provider || '').toLowerCase();
    const { code, state } = req.query;

    if (!isSupportedProvider(provider)) {
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code missing' });
    }

    // SECURE: Recover userId from signed state
    let userId: bigint;
    try {
        if (!state || typeof state !== 'string') throw new Error('State missing');
        const decoded = jwt.verify(state, process.env.JWT_SECRET || 'secret') as { userId: number };
        userId = BigInt(decoded.userId);
    } catch (err) {
        console.error('[OAuth] State verification failed:', err);
        return res.status(400).json({ error: 'Invalid or expired state' });
    }

    const appBase = (process.env.APP_URL || 'https://api.fwber.online').replace(/\/+$/, '');
    const redirectUri = `${appBase}/api/integrations/contacts/callback/${provider}`;
    let tokenData: any = {};
    let providerUserId = '';

    try {
        if (provider === 'google') {
            const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            });
            tokenData = tokenRes.data;

            const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            providerUserId = String(userRes.data.id || '');
        } else if (provider === 'microsoft') {
            const params = new URLSearchParams({
                client_id: process.env.MICROSOFT_CLIENT_ID || '',
                client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            });
            const tokenRes = await axios.post(
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                params.toString(),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            tokenData = tokenRes.data;

            const userRes = await axios.get('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            providerUserId = String(userRes.data.id || '');
        } else if (provider === 'facebook') {
            const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                params: {
                    client_id: process.env.FACEBOOK_APP_ID,
                    client_secret: process.env.FACEBOOK_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    code,
                }
            });
            tokenData = tokenRes.data;

            const userRes = await axios.get('https://graph.facebook.com/me', {
                params: { access_token: tokenData.access_token }
            });
            providerUserId = String(userRes.data.id || '');
        }

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 3600));

        await prisma.user_integrations.upsert({
            where: {
                user_id_provider: {
                    user_id: userId,
                    provider,
                }
            },
            update: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expires_at: expiresAt,
                provider_user_id: providerUserId
            },
            create: {
                user_id: userId,
                provider,
                provider_user_id: providerUserId,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || null,
                token_expires_at: expiresAt
            }
        });

        const frontendUrl = (process.env.FRONTEND_URL || 'https://fwber.online').replace(/\/+$/, '');
        return res.redirect(`${frontendUrl}/integrations?connected=${encodeURIComponent(provider)}`);
    } catch (err: any) {
        console.error('OAuth Exchange Error:', err.response?.data || err.message);
        return res.status(500).send('Authentication failed');
    }
});

export default router;

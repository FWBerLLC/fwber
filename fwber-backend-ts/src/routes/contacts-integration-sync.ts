import { Router, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { ContactSyncService } from '../services/ContactSyncService.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Endpoint to fetch already synced contacts for the user
 * GET /api/integrations/contacts/data
 *
 * Normalizes `synced_contacts` snake_case DB columns (`first_name`, `last_name`)
 * into both camelCase and snake_case fields (`firstName` / `first_name`,
 * `lastName` / `last_name`, plus `provider`) so UI cards never render blank names.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const integrations = await prisma.user_integrations.findMany({
            where: { user_id: BigInt(req.user!.id) },
            include: { synced_contacts: true }
        });

        const allContacts: any[] = [];
        for (const integration of integrations) {
            for (const c of integration.synced_contacts || []) {
                allContacts.push({
                    id: Number(c.id),
                    provider: integration.provider,
                    firstName: c.first_name || '',
                    lastName: c.last_name || '',
                    first_name: c.first_name || '',
                    last_name: c.last_name || '',
                    emails: c.emails,
                    phones: c.phones,
                    synced_at: c.synced_at ? new Date(c.synced_at).toISOString() : null,
                });
            }
        }

        res.json({ contacts: allContacts, total: allContacts.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Endpoint to manually trigger a sync for the user
 * POST /api/integrations/contacts/data/sync
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const integrations = await prisma.user_integrations.findMany({
            where: { user_id: BigInt(req.user!.id) }
        });

        for (const integration of integrations) {
            await ContactSyncService.syncContactsForIntegration(integration.id);
        }

        res.json({ success: true, synced_providers: integrations.length, message: 'Sync complete' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

function formatRelationshipLabel(value: string | null | undefined, fallback = 'Unknown') {
  if (!value || typeof value !== 'string') return fallback;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function serializeLinkRow(l: any, relatedUserObj: any) {
  return {
    id: Number(l.id),
    relationship_type: l.relationship_type,
    relationship_type_label: formatRelationshipLabel(l.relationship_type),
    visibility: l.visibility || 'public',
    visibility_label: formatRelationshipLabel(l.visibility, 'Public'),
    note: l.note ?? null,
    requested_at: l.created_at?.toISOString() ?? null,
    confirmed_at: l.confirmed_at?.toISOString() ?? null,
    is_confirmed: Boolean(l.is_confirmed),
    requested_by_user_id: Number(l.requested_by_user_id || l.user_id),
    related_user: relatedUserObj
      ? {
          id: Number(relatedUserObj.id),
          name: relatedUserObj.name,
          display_name: relatedUserObj.user_profiles?.[0]?.display_name ?? null,
          avatar_url: relatedUserObj.user_profiles?.[0]?.avatar_url ?? null,
        }
      : null,
  };
}

/**
 * GET /api/relationship-links
 * Returns established relationship links (`links` + `data` for backwards compatibility).
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const links = await prisma.relationship_links.findMany({
      where: {
        user_id: userId,
        is_confirmed: true,
      },
      include: {
        users_relationship_links_related_user_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: {
              select: {
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });

    const mapped = links.map((l) =>
      serializeLinkRow(l, l.users_relationship_links_related_user_idTousers)
    );

    res.json({ links: mapped, data: mapped });
  } catch (error: any) {
    console.error('[RelationshipLinks] GET Error:', error.message);
    res.json({ links: [], data: [] });
  }
});

/**
 * GET /api/relationship-links/requests
 * Returns pending incoming relationship requests (`requests` + `data`).
 */
router.get('/requests', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const requests = await prisma.relationship_links.findMany({
      where: {
        related_user_id: userId,
        is_confirmed: false,
      },
      include: {
        users_relationship_links_user_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: {
              select: {
                display_name: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });

    const mapped = requests.map((l) => {
      const requester = l.users_relationship_links_user_idTousers;
      return {
        ...serializeLinkRow(l, requester),
        requested_by: requester
          ? {
              id: Number(requester.id),
              name: requester.name,
              display_name: requester.user_profiles?.[0]?.display_name ?? null,
              avatar_url: requester.user_profiles?.[0]?.avatar_url ?? null,
            }
          : null,
      };
    });

    res.json({ requests: mapped, data: mapped });
  } catch (error: any) {
    console.error('[RelationshipLinks] Requests Error:', error.message);
    res.json({ requests: [], data: [] });
  }
});

/**
 * POST /api/relationship-links
 * Request a relationship link with another user
 */
router.post('/', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { related_user_id, relationship_type, visibility, note } = req.body;

    if (!related_user_id || !relationship_type) {
      return res.status(400).json({ message: 'related_user_id and relationship_type are required' });
    }

    const relatedUserId = BigInt(related_user_id);

    // Don't link to self
    if (userId === relatedUserId) {
      return res.status(400).json({ message: "You cannot link to yourself" });
    }

    // Check for existing link
    const existing = await prisma.relationship_links.findFirst({
      where: {
        OR: [
          { user_id: userId, related_user_id: relatedUserId },
          { user_id: relatedUserId, related_user_id: userId }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'A relationship link already exists or is pending' });
    }

    const link = await prisma.relationship_links.create({
      data: {
        user_id: userId,
        related_user_id: relatedUserId,
        relationship_type,
        visibility: visibility || 'public',
        note,
        requested_by_user_id: userId,
        is_confirmed: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        users_relationship_links_related_user_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true } },
          },
        },
      },
    });

    const formatted = serializeLinkRow(link, link.users_relationship_links_related_user_idTousers);
    res.json({ success: true, id: Number(link.id), link: formatted });
  } catch (error: any) {
    console.error('[RelationshipLinks] POST Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * POST /api/relationship-links/:id/respond
 * Accept or decline a pending relationship link request (`lib/api/relationships.ts`).
 */
router.post('/:id/respond', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const linkId = BigInt(req.params.id);
    const status = String(req.body?.status || '').toLowerCase();

    if (status !== 'accepted' && status !== 'declined') {
      return res.status(400).json({ message: "status must be 'accepted' or 'declined'" });
    }

    const request = await prisma.relationship_links.findUnique({
      where: { id: linkId },
    });

    if (!request || request.related_user_id !== userId) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (status === 'declined') {
      await prisma.relationship_links.delete({ where: { id: linkId } });
      return res.json({ success: true, status: 'declined', link: null, message: 'Relationship link request declined' });
    }

    const now = new Date();
    const [, reciprocal] = await prisma.$transaction([
      prisma.relationship_links.update({
        where: { id: linkId },
        data: { is_confirmed: true, confirmed_at: now, updated_at: now },
      }),
      prisma.relationship_links.create({
        data: {
          user_id: userId,
          related_user_id: request.user_id,
          relationship_type: request.relationship_type,
          visibility: request.visibility,
          note: request.note,
          is_confirmed: true,
          confirmed_at: now,
          requested_by_user_id: request.user_id,
          created_at: now,
          updated_at: now,
        },
        include: {
          users_relationship_links_related_user_idTousers: {
            select: {
              id: true,
              name: true,
              user_profiles: { select: { display_name: true, avatar_url: true } },
            },
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      status: 'accepted',
      link: serializeLinkRow(reciprocal, reciprocal.users_relationship_links_related_user_idTousers),
    });
  } catch (error: any) {
    console.error('[RelationshipLinks] Respond Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * PUT /api/relationship-links/:id
 * Update relationship_type, visibility, or note (`lib/api/relationships.ts`).
 */
router.put('/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const linkId = BigInt(req.params.id);
    const { relationship_type, visibility, note } = req.body || {};

    const existing = await prisma.relationship_links.findUnique({ where: { id: linkId } });
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ message: 'Relationship link not found' });
    }

    const now = new Date();
    const updated = await prisma.relationship_links.update({
      where: { id: linkId },
      data: {
        ...(relationship_type ? { relationship_type: String(relationship_type) } : {}),
        ...(visibility ? { visibility: String(visibility) } : {}),
        ...(note !== undefined ? { note: note === null ? null : String(note) } : {}),
        updated_at: now,
      },
      include: {
        users_relationship_links_related_user_idTousers: {
          select: {
            id: true,
            name: true,
            user_profiles: { select: { display_name: true, avatar_url: true } },
          },
        },
      },
    });

    if (existing.is_confirmed && relationship_type && existing.related_user_id) {
      await prisma.relationship_links.updateMany({
        where: {
          user_id: existing.related_user_id,
          related_user_id: userId,
          is_confirmed: true,
        },
        data: { relationship_type: String(relationship_type), updated_at: now },
      }).catch(() => {});
    }

    return res.json({
      success: true,
      link: serializeLinkRow(updated, updated.users_relationship_links_related_user_idTousers),
    });
  } catch (error: any) {
    console.error('[RelationshipLinks] PUT Error:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * POST /api/relationship-links/:id/confirm
 * Confirm a relationship request
 */
router.post('/:id/confirm', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const linkId = BigInt(req.params.id);

    const request = await prisma.relationship_links.findUnique({
      where: { id: linkId }
    });

    if (!request || request.related_user_id !== userId) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Update the request and create the reciprocal link
    await prisma.$transaction([
      prisma.relationship_links.update({
        where: { id: linkId },
        data: {
          is_confirmed: true,
          confirmed_at: new Date()
        }
      }),
      prisma.relationship_links.create({
        data: {
          user_id: userId,
          related_user_id: request.user_id,
          relationship_type: request.relationship_type,
          visibility: request.visibility,
          is_confirmed: true,
          confirmed_at: new Date(),
          requested_by_user_id: request.user_id
        }
      })
    ]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RelationshipLinks] Confirm Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/relationship-links/:id
 * Remove/Cancel a relationship link
 */
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const userId = BigInt(req.user.id);
    const linkId = BigInt(req.params.id);

    const link = await prisma.relationship_links.findUnique({
      where: { id: linkId }
    });

    if (!link || (link.user_id !== userId && link.related_user_id !== userId)) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Delete both sides if confirmed
    if (link.is_confirmed) {
      const otherSide = await prisma.relationship_links.findFirst({
        where: {
          user_id: link.related_user_id!,
          related_user_id: link.user_id,
          is_confirmed: true
        }
      });

      const idsToDelete = [linkId];
      if (otherSide) idsToDelete.push(otherSide.id);

      await prisma.relationship_links.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    } else {
      await prisma.relationship_links.delete({
        where: { id: linkId }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[RelationshipLinks] DELETE Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;

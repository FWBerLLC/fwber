import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: any;
}

/** Fields that must never be sent to the client */
const SENSITIVE_FIELDS = [
  'password',
  'decoy_password',
  'two_factor_secret',
  'two_factor_recovery_codes',
  'remember_token',
  'merchant_secret',
] as const;

/** Strip sensitive fields from a user object (shallow + nested arrays) */
function sanitizeUser(user: any): any {
  if (!user || typeof user !== 'object') return user;
  const cleaned: any = {};
  if ('two_factor_confirmed_at' in user && user.two_factor_enabled === undefined) {
    cleaned.two_factor_enabled = Boolean(user.two_factor_confirmed_at);
  }
  for (const key of Object.keys(user)) {
    if ((SENSITIVE_FIELDS as readonly string[]).includes(key)) continue;
    const val = user[key];
    cleaned[key] = Array.isArray(val) ? val.map((v: any) => sanitizeUser(v)) : val;
  }
  return cleaned;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: number };

    const user = await prisma.users.findUnique({
      where: { id: BigInt(decoded.id) },
      include: {
        user_profiles: true,
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = sanitizeUser({ ...user, id: Number(user.id) });
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService.js';
import { serialize } from '../lib/prisma.js';
import { AuthError } from '../lib/AuthError.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  referral_code: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response) => {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await this.authService.registerUser(validated);

      res.status(201).json({
        access_token: result.token,
        token_type: 'Bearer',
        user: result.user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      if (error instanceof AuthError) {
        return res.status(error.status).json({ message: error.message });
      }
      // Infrastructure fault: log server-side, never leak internals to client.
      console.error('[Auth] register infrastructure error:', error);
      res.status(500).json({ message: 'Registration is temporarily unavailable. Please try again.' });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await this.authService.loginUser(validated);

      res.json({
        access_token: result.token,
        token_type: 'Bearer',
        user: result.user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      if (error instanceof AuthError) {
        return res.status(error.status).json({ message: error.message });
      }
      // Infrastructure fault (DB/governance layer/unexpected): log the real
      // cause server-side and answer with a generic 500 so infra errors are
      // never dressed up as "bad credentials" (see AuthError docs).
      console.error('[Auth] login infrastructure error:', error);
      res.status(500).json({ message: 'Login is temporarily unavailable. Please try again.' });
    }
  };

  me = async (req: any, res: Response) => {
    res.json(serialize(req.user));
  };

  forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      await this.authService.requestPasswordReset(email);
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error: any) {
      console.error('[Auth] forgotPassword infrastructure error:', error);
      // Keep the response identical to success — do not leak whether the
      // email exists, and do not leak internals.
      res.status(500).json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: 'Token and password required' });

      await this.authService.executePasswordReset({ token, password });
      res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error: any) {
      if (error instanceof AuthError) {
        return res.status(error.status).json({ message: error.message });
      }
      console.error('[Auth] resetPassword infrastructure error:', error);
      res.status(500).json({ message: 'Could not reset password. Please try again.' });
    }
  };
}

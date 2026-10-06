import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

// Resend support (modern API-based email)
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('[Email] Resend API initialized');
  } catch (err: any) {
    console.error('[Email] Failed to initialize Resend:', err.message);
  }
}

// SMTP transporter (legacy fallback)
// Supports both authenticated SMTP and local relay (no auth needed)
let transporter: nodemailer.Transporter | null = null;
if (process.env.MAIL_HOST) {
  const smtpConfig: any = {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    secure: parseInt(process.env.MAIL_PORT || '587') === 465,
    // For local relay (port 25), disable TLS to avoid self-signed cert issues
    ...(process.env.MAIL_TLS === 'false' ? { tls: { rejectUnauthorized: false } } : {}),
  };
  // Add auth only if credentials are provided (not needed for local relay)
  if (process.env.MAIL_USER && process.env.MAIL_PASS) {
    smtpConfig.auth = {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    };
  }
  transporter = nodemailer.createTransport(smtpConfig);
  console.log('[Email] SMTP transporter configured for', process.env.MAIL_HOST, process.env.MAIL_USER ? '(authenticated)' : '(no auth / local relay)');
} else {
  console.log('[Email] No SMTP configured, relying on Resend or console fallback');
}

const MAIL_FROM = process.env.MAIL_FROM || 'noreply@fwber.site';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.fwber.site';

/**
 * Send email using the best available method:
 * 1. Resend API (if RESEND_API_KEY is set)
 * 2. SMTP (if MAIL_HOST/USER/PASS are set and working)
 * 3. Console fallback (log the link so developers can still verify)
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  // Method 1: Resend API
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: MAIL_FROM,
        to,
        subject,
        html,
      });
      if (error) {
        console.error('[Email] Resend error:', error);
      } else {
        console.log('[Email] Sent via Resend to %s: %s', to, data?.id || 'ok');
        return true;
      }
    } catch (err) {
      console.error('[Email] Resend exception:', err);
    }
  }

  // Method 2: SMTP
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"fwber" <${MAIL_FROM}>`,
        to,
        subject,
        html,
      });
      console.log('[Email] Sent via SMTP to %s: %s', to, info.messageId);
      return true;
    } catch (err) {
      console.error('[Email] SMTP error:', (err as Error).message);
    }
  }

  // Method 3: Console fallback - extract verification URL and log it
  const urlMatch = html.match(/href="([^"]+)"/);
  if (urlMatch) {
    console.log('[Email-FALLBACK] Verification URL for %s: %s', to, urlMatch[1]);
  }
  console.warn('[Email] All email methods failed for %s - email not sent', to);
  return false;
}

/**
 * Send a verification email to the user
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${FRONTEND_URL}/verify?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to fwber!</h2>
      <p>Please click the button below to verify your email address and complete your registration:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
      <p>If you did not create an account, no further action is required.</p>
      <hr />
      <p style="font-size: 12px; color: #666;">This link will expire in 24 hours.</p>
    </div>
  `;

  return sendEmail(email, 'Verify your email address', html);
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      <p>If you did not request a password reset, no further action is required.</p>
      <hr />
      <p style="font-size: 12px; color: #666;">This link will expire in 1 hour.</p>
    </div>
  `;

  return sendEmail(email, 'Reset your password', html);
}

/**
 * Send a generic notification email
 */
export async function sendNotificationEmail(email: string, subject: string, content: string): Promise<boolean> {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      ${content}
    </div>
  `;

  return sendEmail(email, subject, html);
}

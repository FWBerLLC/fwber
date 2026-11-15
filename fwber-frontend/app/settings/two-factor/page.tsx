'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, CheckCircle, AlertTriangle, Copy, Check, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';

export default function TwoFactorSettingsPage() {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const isEnabled = user?.two_factor_enabled;
  // If we have a QR code but it's not enabled yet, we are in the setup phase
  const isSettingUp = !isEnabled && qrCode !== null;

  const enableTwoFactor = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/user/two-factor-authentication');
      const qrResponse = await api.get<{ svg: string, url: string }>('/user/two-factor-qr-code');
      setQrCode(qrResponse.url); // We use the URL for the QR code component
    } catch (err: any) {
      setError(err.message || 'Failed to enable two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/user/confirmed-two-factor-authentication', {
        code: confirmCode
      });
      
      // Fetch recovery codes
      const codesResponse = await api.get<{ recovery_codes: string[] }>('/user/two-factor-recovery-codes');
      setRecoveryCodes(codesResponse.recovery_codes);
      setShowRecoveryCodes(true);
      
      // Update user context
      if (user) {
        updateUser({ ...user, two_factor_enabled: true });
      }
      
      setQrCode(null);
      setConfirmCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    
    
    setIsLoading(true);
    setError(null);
    try {
      await api.delete('/user/two-factor-authentication');
      if (user) {
        updateUser({ ...user, two_factor_enabled: false });
      }
      setQrCode(null);
      setRecoveryCodes([]);
      setShowRecoveryCodes(false);
    } catch (err: any) {
      setError(err.message || 'Failed to disable two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateRecoveryCodes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/user/two-factor-recovery-codes');
      const codesResponse = await api.get<{ recovery_codes: string[] }>('/user/two-factor-recovery-codes');
      setRecoveryCodes(codesResponse.recovery_codes);
      setShowRecoveryCodes(true);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate recovery codes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecoveryCodes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const codesResponse = await api.get<{ recovery_codes: string[] }>('/user/two-factor-recovery-codes');
      setRecoveryCodes(codesResponse.recovery_codes);
      setShowRecoveryCodes(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recovery codes');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAllRecoveryCodes = async () => {
    if (!recoveryCodes.length || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    } catch {
      // Ignore clipboard failures in restricted webviews
    }
  };

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-muted dark:bg-background">
          <AppHeader />
          <header className="bg-card dark:bg-card shadow-sm border-b border-border">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
                    <p className="text-sm text-muted-foreground">Protect your account with RFC 6238 TOTP codes &amp; single-use recovery keys</p>
                  </div>
                </div>
                <Link
                  href="/settings/security"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Security Settings
                </Link>
              </div>
            </div>
          </header>

          <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-card dark:bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <div className="p-6">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                )}

                {!isEnabled && !isSettingUp && (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Shield className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-medium text-foreground mb-2">Two-Factor Authentication is Disabled</h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-8">
                      When enabled, password sign-ins require a 6-digit code from Google Authenticator, Authy, 1Password, or any TOTP app (or one of your 8 single-use emergency recovery codes) within 5 minutes.
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={enableTwoFactor}
                          disabled={isLoading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {isLoading ? 'Generating Secret...' : 'Enable Two-Factor Authentication'}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Generates a unique TOTP secret &amp; QR code — 2FA activates only after you confirm a 6-digit code</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {isSettingUp && (
                  <div className="space-y-8">
                    <div className="border-b border-border pb-8">
                      <h3 className="text-lg font-medium text-foreground mb-4">Finish Enabling Two-Factor Authentication</h3>
                      <p className="text-muted-foreground mb-6">
                        Scan the QR code below with your authenticator app, then enter the current 6-digit code to activate enforcement on login.
                      </p>

                      <div className="flex flex-col items-center justify-center p-6 bg-muted dark:bg-background rounded-lg mb-6">
                        {qrCode && (
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <QRCodeSVG value={qrCode} size={192} />
                          </div>
                        )}
                      </div>

                      <form onSubmit={confirmTwoFactor} className="max-w-xs mx-auto">
                        <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1">
                          6-Digit Authenticator Code
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="code"
                            value={confirmCode}
                            onChange={(e) => setConfirmCode(e.target.value)}
                            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm font-mono tracking-widest"
                            placeholder="123456"
                            required
                            autoComplete="one-time-code"
                            inputMode="numeric"
                          />
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                          >
                            {isLoading ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setQrCode(null)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        Cancel Setup
                      </button>
                    </div>
                  </div>
                )}

                {isEnabled && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Two-Factor Authentication is Active</h3>
                          <p className="text-sm text-green-600 dark:text-green-400">Password sign-ins require a TOTP token or recovery code before a session JWT is issued.</p>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={disableTwoFactor}
                            disabled={isLoading}
                            className="inline-flex items-center px-3 py-1.5 border border-red-200 dark:border-red-900 text-xs font-medium rounded text-red-700 dark:text-red-300 bg-card hover:bg-red-50 dark:hover:bg-red-950/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Disable
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Removes your TOTP secret and disables 2FA challenges on login</TooltipContent>
                      </Tooltip>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">Emergency Recovery Codes</h3>
                      <p className="text-muted-foreground mb-6">
                        Store these single-use recovery codes in a password manager. Each code can be used once on the login challenge screen if your authenticator device is unavailable.
                      </p>

                      {showRecoveryCodes ? (
                        <div className="bg-slate-900 text-slate-100 rounded-lg p-6 mb-6">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                            <span className="text-xs uppercase tracking-wider text-slate-400">
                              {(recoveryCodes || []).length} Remaining Single-Use Codes
                            </span>
                            <button
                              type="button"
                              onClick={copyAllRecoveryCodes}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200"
                            >
                              {copiedCodes ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedCodes ? 'Copied!' : 'Copy All'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(recoveryCodes || []).map((code, index) => (
                              <div key={index} className="font-mono text-slate-100 text-sm bg-slate-800/70 px-3 py-1.5 rounded">
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-6">
                          <button
                            type="button"
                            onClick={fetchRecoveryCodes}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          >
                            Show Recovery Codes
                          </button>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={regenerateRecoveryCodes}
                              disabled={isLoading}
                              className="inline-flex items-center px-4 py-2 border border-border shadow-sm text-sm font-medium rounded-md text-foreground bg-card hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate Recovery Codes
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Invalidates all existing recovery codes and mints 8 fresh single-use codes</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}

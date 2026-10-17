'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api/client';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, CheckCircle, AlertTriangle, Copy, RefreshCw, Trash2 } from 'lucide-react';

export default function TwoFactorSettingsPage() {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h1>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {!isEnabled && !isSettingUp && (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Two-Factor Authentication is Disabled</h2>
                  <p className="text-gray-500 max-w-md mx-auto mb-8">
                    When two-factor authentication is enabled, you will be prompted for a secure, random token during authentication. You may retrieve this token from your phone&apos;s Google Authenticator application.
                  </p>
                  <button type="button"
                    onClick={enableTwoFactor}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Enabling...' : 'Enable Two-Factor Authentication'}
                  </button>
                </div>
              )}

              {isSettingUp && (
                <div className="space-y-8">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Finish Enabling Two-Factor Authentication</h3>
                    <p className="text-gray-500 mb-6">
                      To finish enabling two-factor authentication, scan the following QR code using your phone&apos;s authenticator application or enter the setup key and provide the generated OTP code.
                    </p>
                    
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6">
                      {qrCode && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                          <QRCodeSVG value={qrCode} size={192} />
                        </div>
                      )}
                    </div>

                    <form onSubmit={confirmTwoFactor} className="max-w-xs mx-auto">
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Verification Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="code"
                          value={confirmCode}
                          onChange={(e) => setConfirmCode(e.target.value)}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
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
                     <button type="button"
                        onClick={() => setQrCode(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                  </div>
                </div>
              )}

              {isEnabled && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Two-Factor Authentication is Enabled</h3>
                        <p className="text-sm text-green-600">Your account is secure.</p>
                      </div>
                    </div>
                    <button type="button"
                      onClick={disableTwoFactor}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-red-200 text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Disable
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recovery Codes</h3>
                    <p className="text-gray-500 mb-6">
                      Store these recovery codes in a secure password manager. They can be used to recover access to your account if your two-factor authentication device is lost.
                    </p>

                    {showRecoveryCodes ? (
                      <div className="bg-gray-900 rounded-lg p-6 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                          {recoveryCodes.map((code, index) => (
                            <div key={index} className="font-mono text-white text-sm">
                              {code}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <button type="button"
                          onClick={fetchRecoveryCodes}
                          disabled={isLoading}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                          Show Recovery Codes
                        </button>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button type="button"
                        onClick={regenerateRecoveryCodes}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate Recovery Codes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

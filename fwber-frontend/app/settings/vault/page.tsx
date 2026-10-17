'use client';

import { useState } from 'react';
import { useVault } from '@/lib/hooks/use-vault';
import { useFeatureFlag } from '@/lib/hooks/use-feature-flags';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Lock,
  Unlock,
  Shield,
  Trash2,
  Download,
  HardDrive,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';

export default function VaultSettingsPage() {
  const isEnabled = useFeatureFlag('local_media_vault');

  if (!isEnabled) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
              <Shield className="mx-auto h-12 w-12 text-yellow-500" />
              <h1 className="mt-4 text-xl font-semibold text-yellow-800">
                Local Media Vault is not enabled
              </h1>
              <p className="mt-2 text-yellow-700">
                This feature is currently disabled. Contact support if you believe this is an error.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <VaultSettingsContent />
    </ProtectedRoute>
  );
}

function VaultSettingsContent() {
  const vault = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const strength = vault.checkStrength(passphrase);

  const handleInitialize = async () => {
    if (passphrase !== confirmPassphrase) {
      setMessage({ type: 'error', text: 'Passphrases do not match' });
      return;
    }

    setActionLoading('initialize');
    setMessage(null);

    const success = await vault.initialize(passphrase);
    if (success) {
      setMessage({ type: 'success', text: 'Vault initialized successfully!' });
      setPassphrase('');
      setConfirmPassphrase('');
    } else {
      setMessage({ type: 'error', text: vault.error || 'Failed to initialize vault' });
    }
    setActionLoading(null);
  };

  const handleUnlock = async () => {
    setActionLoading('unlock');
    setMessage(null);

    const success = await vault.unlock(passphrase);
    if (success) {
      setMessage({ type: 'success', text: 'Vault unlocked!' });
      setPassphrase('');
    } else {
      setMessage({ type: 'error', text: vault.error || 'Incorrect passphrase' });
    }
    setActionLoading(null);
  };

  const handleLock = () => {
    vault.lock();
    setMessage({ type: 'success', text: 'Vault locked' });
  };

  const handleExport = async () => {
    setActionLoading('export');
    setMessage(null);

    const data = await vault.exportVault();
    if (data) {
      // Create a downloadable file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fwber-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Vault exported successfully! Keep this backup file secure.' });
    } else {
      setMessage({ type: 'error', text: vault.error || 'Failed to export vault' });
    }
    setActionLoading(null);
  };

  const handleReset = async () => {
    setActionLoading('reset');
    setMessage(null);

    const success = await vault.reset();
    if (success) {
      setMessage({ type: 'success', text: 'Vault has been reset. All data deleted.' });
      setShowResetConfirm(false);
    } else {
      setMessage({ type: 'error', text: vault.error || 'Failed to reset vault' });
    }
    setActionLoading(null);
  };

  if (!vault.isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold text-red-800">
              Browser Not Supported
            </h1>
            <p className="mt-2 text-red-700">
              Your browser does not support the Web Crypto API or IndexedDB required for the
              Local Media Vault. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Shield className="h-7 w-7 text-purple-600" />
            Local Media Vault
          </h1>
          <p className="mt-1 text-gray-600">
            Securely store your sensitive photos locally with end-to-end encryption.
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vault Status</h2>

          <div className="mt-4 flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                vault.status === 'unlocked'
                  ? 'bg-green-100'
                  : vault.status === 'locked'
                    ? 'bg-yellow-100'
                    : 'bg-gray-100'
              }`}
            >
              {vault.status === 'unlocked' ? (
                <Unlock className="h-8 w-8 text-green-600" />
              ) : vault.status === 'locked' ? (
                <Lock className="h-8 w-8 text-yellow-600" />
              ) : (
                <Shield className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium capitalize text-gray-900 dark:text-white">
                {vault.status === 'uninitialized' ? 'Not Set Up' : vault.status}
              </p>
              {vault.info && (
                <p className="text-sm text-gray-500">
                  {vault.info.mediaCount} items · {vault.info.storageUsedFormatted} used
                </p>
              )}
            </div>
          </div>

          {vault.isUnlocked && (
            <button type="button"
              onClick={handleLock}
              className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
            >
              <Lock className="h-4 w-4" />
              Lock Vault
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-lg p-4 ${
              message.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Initialize or Unlock Form */}
        {vault.status !== 'unlocked' && (
          <div className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {vault.status === 'uninitialized' ? 'Set Up Your Vault' : 'Unlock Your Vault'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {vault.status === 'uninitialized'
                ? 'Create a strong passphrase to encrypt your media. This cannot be recovered if lost.'
                : 'Enter your passphrase to access your encrypted media.'}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Passphrase</label>
                <div className="relative mt-1">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 pr-10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Enter your passphrase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassphrase ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {vault.status === 'uninitialized' && passphrase && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full transition-all ${
                            strength.score >= 70
                              ? 'bg-green-500'
                              : strength.score >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          } ${
                            strength.score >= 90 ? 'w-[90%]' :
                            strength.score >= 80 ? 'w-[80%]' :
                            strength.score >= 70 ? 'w-[70%]' :
                            strength.score >= 60 ? 'w-[60%]' :
                            strength.score >= 50 ? 'w-1/2' :
                            strength.score >= 40 ? 'w-[40%]' :
                            strength.score >= 30 ? 'w-[30%]' :
                            strength.score >= 20 ? 'w-1/5' :
                            strength.score >= 10 ? 'w-[10%]' : 'w-[5%]'
                          }`}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{strength.score}%</span>
                    </div>
                    {strength.feedback.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {strength.feedback.map((tip, i) => (
                          <li key={i} className="text-xs text-gray-500">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {vault.status === 'uninitialized' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Passphrase
                  </label>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Confirm your passphrase"
                  />
                  {confirmPassphrase && passphrase !== confirmPassphrase && (
                    <p className="mt-1 text-xs text-red-500">Passphrases do not match</p>
                  )}
                </div>
              )}

              <button type="button"
                onClick={vault.status === 'uninitialized' ? handleInitialize : handleUnlock}
                disabled={
                  actionLoading !== null ||
                  !passphrase ||
                  (vault.status === 'uninitialized' && passphrase !== confirmPassphrase)
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === 'initialize' || actionLoading === 'unlock' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : vault.status === 'uninitialized' ? (
                  <>
                    <Shield className="h-5 w-5" />
                    Create Vault
                  </>
                ) : (
                  <>
                    <Unlock className="h-5 w-5" />
                    Unlock
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Vault Contents (when unlocked) */}
        {vault.isUnlocked && (
          <div className="rounded-lg border bg-white dark:bg-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vault Contents</h2>
              <button type="button"
                onClick={handleExport}
                disabled={actionLoading === 'export' || vault.items.length === 0}
                className="flex items-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === 'export' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Backup
              </button>
            </div>

            {vault.items.length === 0 ? (
              <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 p-8 text-center">
                <HardDrive className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2 text-gray-500">Your vault is empty</p>
                <p className="text-sm text-gray-400">
                  Encrypted photos will appear here when you enable vault storage during upload.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-gray-100">
                {vault.items.slice(0, 10).map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(item.size)} ·{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button type="button"
                      onClick={() => vault.removeFile(item.id)}
                      className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove from vault"
                      title="Remove from vault"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {vault.items.length > 10 && (
                  <li className="py-3 text-center text-sm text-gray-500">
                    + {vault.items.length - 10} more items
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-500" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Important Security Information</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-blue-600">
                <li>Your passphrase cannot be recovered if lost</li>
                <li>Clearing browser data will delete all vault contents</li>
                <li>Data is encrypted locally and never leaves your device</li>
                <li>Consider exporting your vault before clearing browser data</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        {vault.status !== 'uninitialized' && (
          <div className="rounded-lg border border-red-200 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h2>

            {!showResetConfirm ? (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Reset the vault to delete all encrypted media and start fresh. This action cannot
                  be undone.
                </p>
                <button type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Reset Vault
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-lg bg-red-50 p-4">
                <p className="font-medium text-red-700">
                  Are you absolutely sure? This will permanently delete all vault data.
                </p>
                <div className="mt-3 flex gap-3">
                  <button type="button"
                    onClick={handleReset}
                    disabled={actionLoading === 'reset'}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading === 'reset' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Yes, Delete Everything
                  </button>
                  <button type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

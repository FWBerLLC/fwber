'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useFeatureFlag } from '@/lib/hooks/use-feature-flags';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api/client';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Shield,
  Lock,
  Bell,
  MapPin,
  User,
  BookHeart,
  Eye,
  Palette,
  HelpCircle,
  ChevronRight,
  LogOut,
  CreditCard,
  CheckCircle,
  Plane,
  Ghost,
  Download,
  Globe,
  ArrowLeft,
} from 'lucide-react';

interface SettingsLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}

function SettingsLink({ href, icon, title, description, badge, disabled }: SettingsLinkProps) {
  if (disabled) {
    return (
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg opacity-50 cursor-not-allowed">
        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            {badge && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-500 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="dark:text-gray-300 text-sm text-gray-400">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:shadow-sm transition-all group"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="dark:text-gray-300 text-sm text-gray-500">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
    </Link>
  );
}

interface SettingsToggleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: string;
}

function SettingsToggle({ icon, title, description, checked, onChange, disabled, badge }: SettingsToggleProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:shadow-sm transition-all group">
      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="dark:text-gray-300 text-sm text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

interface SettingsButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
}

function SettingsButton({ onClick, icon, title, description, disabled }: SettingsButtonProps) {
  return (
    <button type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:shadow-sm transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="dark:text-gray-300 text-sm text-gray-500">{description}</p>
      </div>
      <Download className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
    </button>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const { isEnabled: vaultEnabled } = useFeatureFlag('local_media_vault');
  const { isEnabled: faceRevealEnabled } = useFeatureFlag('face_reveal');

  // Handle email verification redirect
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'success') setVerifiedMessage('Email verified successfully!');
    else if (verified === 'already') setVerifiedMessage('Email was already verified.');
  }, [searchParams]);

  const [isIncognito, setIsIncognito] = useState(user?.profile?.is_incognito || false);
  const [updatingIncognito, setUpdatingIncognito] = useState(false);
  const [isLocationFuzzing, setIsLocationFuzzing] = useState(user?.profile?.preferences?.location_fuzzing || false);
  const [updatingLocationFuzzing, setUpdatingLocationFuzzing] = useState(false);

  const toggleLocationFuzzing = async (checked: boolean) => {
    setUpdatingLocationFuzzing(true);
    try {
      await apiClient.put('/profile', { preferences: { location_fuzzing: checked } });
      setIsLocationFuzzing(checked);
      if (user && user.profile) {
        user.profile.preferences = { ...user.profile.preferences, location_fuzzing: checked };
      }
    } catch (error) {
      console.error('Failed to toggle location fuzzing', error);
      setIsLocationFuzzing(!checked);
    } finally {
      setUpdatingLocationFuzzing(false);
    }
  };

  const toggleIncognito = async (checked: boolean) => {
    setUpdatingIncognito(true);
    try {
      await apiClient.put('/profile', { is_incognito: checked });
      setIsIncognito(checked);
      // Optimistically update user context if possible
      if (user && user.profile) {
        user.profile.is_incognito = checked;
      }
    } catch (error) {
      console.error('Failed to toggle incognito', error);
      // Revert on error
      setIsIncognito(!checked);
    } finally {
      setUpdatingIncognito(false);
    }
  };

  const [exportStatus, setExportStatus] = useState<'idle' | 'requesting' | 'processing' | 'ready' | 'error'>('idle');
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const handleExportData = async () => {
    if (exportStatus === 'requesting' || exportStatus === 'processing') return;

    try {
      setExportStatus('requesting');
      // Request the export
      await apiClient.post('/user/export', {});

      setExportStatus('processing');
      // Export requested successfully — status polling will handle UI update

      // Start polling for status (simplified for this context, ideally use a hook or web socket)
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await apiClient.get('/user/export/status');
          // @ts-ignore - basic type assertion
          const data = statusRes.data as any;

          if (data.status === 'ready') {
            setExportStatus('ready');
            setExportUrl(data.url); // The backend should return the download URL
            clearInterval(pollInterval);
          } else if (data.status === 'failed') {
            setExportStatus('error');
            clearInterval(pollInterval);
          }
        } catch (e) {
          // Ignore poll errors
        }
      }, 5000);

    } catch (error: any) {
      console.error('Failed to export data', error);
      if (error.response?.status === 429) {
        console.warn('Export rate limited: once per day');
      } else {
        console.error('Failed to request data export:', error);
      }
      setExportStatus('error');
    }
  };

  const handleDownloadExport = () => {
    if (exportUrl) {
      window.location.href = exportUrl;
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-gray-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                  <p className="dark:text-gray-300 text-sm text-gray-500">Manage your account and preferences</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-purple-300 hover:text-purple-600"
              >
                <ArrowLeft className="h-4 w-4" />
                <div>
                  Back
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Account Section */}
          {/* Email Verification Success Banner */}
          {verifiedMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="dark:text-gray-300 text-sm font-medium text-green-800">{verifiedMessage}</p>
              <button type="button" onClick={() => setVerifiedMessage(null)} className="ml-auto text-green-600 hover:text-green-800">✕</button>
            </div>
          )}

          {/* Email Verification Banner */}
          {(user && !(user as any).email_verified_at && !user.emailVerifiedAt) && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Verify your email address</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Check your inbox for a verification link.</p>
              </div>
              <button type="button"
                onClick={async () => {
                  try {
                    await apiClient.post('/email/verification-notification');
                  } catch (err: any) {
                    console.error('Failed to resend verification', err);
                  }
                }}
                className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline whitespace-nowrap"
              >
                Resend
              </button>
            </div>
          )}

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Account
            </h2>
            <div className="space-y-3">
              <SettingsLink
                href="/profile"
                icon={<User className="w-5 h-5" />}
                title="Profile"
                description="Edit your profile information and photos"
              />
              <SettingsLink
                href="/settings/physical-profile"
                icon={<User className="w-5 h-5" />}
                title="Physical Profile"
                description="Manage your physical attributes and AI avatar"
              />
              <SettingsLink
                href="/settings/account"
                icon={<Settings className="w-5 h-5" />}
                title="Account Settings"
                description="Manage email, password, and account deletion"
              />
              <SettingsLink
                href="/location-settings"
                icon={<MapPin className="w-5 h-5" />}
                title="Location Settings"
                description="Manage your location privacy and visibility"
              />
              <SettingsLink
                href="/settings/travel"
                icon={<Plane className="w-5 h-5" />}
                title="Travel Mode"
                description="Change your location to match in other cities"
                badge="Gold"
              />
            </div>
          </section>

          {/* Subscription Section */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Subscription & Billing
            </h2>
            <div className="space-y-3">
              <SettingsLink
                href="/settings/subscription"
                icon={<CreditCard className="w-5 h-5" />}
                title="Manage Subscription"
                description="View your plan, billing history, and upgrade options"
              />
            </div>
          </section>

          {/* Privacy & Security Section */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Privacy & Security
            </h2>
            <div className="space-y-3">
              <SettingsToggle
                icon={<Ghost className="w-5 h-5" />}
                title="Incognito Mode"
                description="Only be seen by people you like"
                checked={isIncognito}
                onChange={toggleIncognito}
                disabled={updatingIncognito}
                badge="Ghost Mode"
              />
              <SettingsToggle
                icon={<MapPin className="w-5 h-5" />}
                title="Location Fuzzing"
                description="Obscure your exact location on the map"
                checked={isLocationFuzzing}
                onChange={toggleLocationFuzzing}
                disabled={updatingLocationFuzzing}
                badge="Privacy"
              />
              <SettingsLink
                href="/settings/two-factor"
                icon={<Shield className="w-5 h-5" />}
                title="Two-Factor Authentication"
                description="Add an extra layer of security to your account"
              />
              <SettingsLink
                href="/settings/vault"
                icon={<Lock className="w-5 h-5" />}
                title="Local Media Vault"
                description="Securely store sensitive photos with encryption"
                badge={vaultEnabled ? 'Enabled' : 'Disabled'}
                disabled={!vaultEnabled}
              />
              <SettingsLink
                href="/settings/verification"
                icon={<CheckCircle className="w-5 h-5" />}
                title="Identity Verification"
                description="Verify your profile with a selfie"
              />
              <SettingsLink
                href="/photos"
                icon={<Eye className="w-5 h-5" />}
                title="Photo Privacy"
                description={faceRevealEnabled ? 'Manage face reveal and photo visibility' : 'Manage your photo visibility settings'}
                badge={faceRevealEnabled ? 'Face Reveal' : undefined}
              />
              <SettingsLink
                href="/settings/blocked"
                icon={<Shield className="w-5 h-5" />}
                title="Blocked Users"
                description="Manage blocked users and privacy settings"
              />
              <SettingsButton
                onClick={exportStatus === 'ready' ? handleDownloadExport : handleExportData}
                icon={<Download className="w-5 h-5" />}
                title={exportStatus === 'ready' ? "Download Data Export" : (exportStatus === 'processing' ? "Exporting Data..." : "Export Data")}
                description={exportStatus === 'ready' ? "Your data is ready to download" : (exportStatus === 'processing' ? "We are generating your export file" : "Request a copy of your personal data")}
                disabled={exportStatus === 'requesting' || exportStatus === 'processing'}
              />
            </div>
          </section>

          {/* Notifications Section */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Notifications
            </h2>
            <div className="space-y-3">
              <SettingsLink
                href="/settings/notifications"
                icon={<Bell className="w-5 h-5" />}
                title="Notification Preferences"
                description="Choose what notifications you receive"
              />
            </div>
          </section>

          {/* Appearance Section */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Appearance
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                  <Palette className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h3>
                  <p className="dark:text-gray-300 text-sm text-gray-500">Choose your preferred color scheme</p>
                </div>
                <select
                  aria-label="Theme selection"
                  value={theme ?? 'system'}
                  onChange={(e) => setTheme(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </section>

          {/* Support Section */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Support
            </h2>
            <div className="space-y-3">
              <SettingsLink
                href="/help"
                icon={<HelpCircle className="w-5 h-5" />}
                title="Help & Support"
                description="Get help with your account"
              />
            </div>
          </section>

          {/* Logout Button */}
          <section>
            <button type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log Out</span>
            </button>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { verificationApi, VerificationStatus } from '@/lib/api/verification';
import { Camera, CheckCircle, XCircle, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerificationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await verificationApi.getStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load verification status', err);
      setError('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await verificationApi.verify(file);
      if (result.verified) {
        setSuccessMessage(result.message);
        loadStatus(); // Refresh status
      } else {
        setError(result.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error', err);
      setError(err.response?.data?.message || 'An error occurred during verification.');
    } finally {
      setVerifying(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="p-2 -ml-2 hover:bg-gray-100 dark:bg-gray-800 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Identity Verification</h1>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 text-center">
              {status?.is_verified ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">You are Verified!</h2>
                  <p className="text-gray-500">
                    Your profile has been verified. You now have the blue checkmark badge on your profile.
                  </p>
                  <div className="pt-4">
                    <p className="text-sm text-gray-400">
                      Verified on {status.verified_at ? new Date(status.verified_at).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Camera className="w-10 h-10 text-purple-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Identity</h2>
                    <p className="text-gray-500">
                      Take a selfie to verify that you match your profile photos. This helps keep our community safe.
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2 text-left">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm flex items-start gap-2 text-left">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      <p>{successMessage}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    
                    <button type="button"
                      onClick={triggerCamera}
                      disabled={verifying}
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5" />
                          Take Selfie
                        </>
                      )}
                    </button>
                    <p className="mt-3 text-xs text-gray-400">
                      Your selfie is only used for verification and will not be shown on your public profile.
                    </p>
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

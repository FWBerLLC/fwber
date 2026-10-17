'use client';

import { useState, useEffect, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PremiumUpgradeModal } from '@/components/PremiumUpgradeModal';
import { api } from '@/lib/api/client';
import { CreditCard, Check, Clock, AlertCircle, Star } from 'lucide-react';
import Link from 'next/link';

interface Payment {
  id: number;
  amount: string;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

interface PremiumStatus {
  is_premium: boolean;
  tier: string;
  expires_at: string | null;
  unlimited_swipes: boolean;
}

function SubscriptionContent() {
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [status, setStatus] = useState<PremiumStatus | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusData, historyData] = await Promise.all([
        api.get<PremiumStatus>('/premium/status'),
        api.get<{ data?: Payment[] } | Payment[]>('/subscriptions/history')
      ]);
      setStatus(statusData);
      setHistory(Array.isArray(historyData) ? historyData : (Array.isArray(historyData.data) ? historyData.data : []));
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
      setError('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setCanceling(true);
      setError(null);
      setSuccessMessage(null);

      const response = await api.post<{ message: string; ends_at: string }>('/subscriptions/cancel', {});

      setSuccessMessage(response.message);
      await fetchData(); // Refresh data
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      setError(err.message || 'Cancellation failed. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="text-gray-400 hover:text-gray-600">
                Settings
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription</h1>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Current Plan */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Plan</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {status?.is_premium ? (
                        <>
                          <Star className="w-6 h-6 text-yellow-500 fill-current" />
                          Gold Tier
                        </>
                      ) : (
                        'Free Tier'
                      )}
                    </h3>
                    <p className="text-gray-500 mt-1">
                      {status?.is_premium
                        ? `Your premium benefits are active until ${new Date(status.expires_at!).toLocaleDateString()}`
                        : 'Upgrade to unlock premium features'}
                    </p>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-sm font-medium ${status?.is_premium ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                    }`}>
                    {status?.is_premium ? 'Active' : 'Free'}
                  </div>
                </div>

                {status?.is_premium ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex">
                        <Check className="h-5 w-5 text-green-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Premium Active</h3>
                          <div className="mt-2 text-sm text-green-700">
                            <p>You have access to all Gold features including unlimited swipes and &quot;Who Likes You&quot;.</p>
                          </div>
                        </div>
                      </div>
                      <button type="button"
                        onClick={handleCancel}
                        disabled={canceling}
                        className="text-sm text-red-600 hover:text-red-800 font-medium underline disabled:opacity-50"
                      >
                        {canceling ? 'Canceling...' : 'Cancel Subscription'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                    <h4 className="font-semibold text-purple-900 mb-2">Upgrade to Gold</h4>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-purple-800">
                        <Check className="w-4 h-4" /> See who likes you
                      </li>
                      <li className="flex items-center gap-2 text-purple-800">
                        <Check className="w-4 h-4" /> Unlimited swipes
                      </li>
                      <li className="flex items-center gap-2 text-purple-800">
                        <Check className="w-4 h-4" /> Priority support
                      </li>
                    </ul>
                    <button type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <>
                        <Star className="w-4 h-4 fill-current" />
                        Upgrade for $19.99/mo
                      </>
                    </button>
                    <p className="mt-3 text-xs text-purple-700">
                      Card checkout runs through Stripe. Wallet members can also upgrade with 200 FWB.
                    </p>
                    {error && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    {successMessage && (
                      <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-md flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {successMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
          <PremiumUpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => {
              setShowUpgradeModal(false);
              void fetchData();
            }}
          />

          {/* Payment History */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No payment history found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {history.map((payment) => (
                    <div key={payment.id} className="p-4 hover:bg-gray-50 dark:bg-gray-900 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${payment.status === 'succeeded' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                          }`}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{payment.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {payment.currency.toUpperCase()} {parseFloat(payment.amount).toFixed(2)}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${payment.status === 'succeeded'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>}>
      <SubscriptionContent />
    </Suspense>
  )
}

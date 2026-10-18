'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface Subscription {
  id: number;
  name: string;
  stripe_status: string;
  ends_at: string | null;
  created_at: string;
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description?: string;
}

interface PaymentHistoryResponse {
  data: Payment[];
}

interface CancelSubscriptionResponse {
  message: string;
  ends_at: string | null;
}

export default function SubscriptionPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, historyRes] = await Promise.all([
          api.get<Subscription[]>('/subscriptions'),
          api.get<PaymentHistoryResponse>('/subscriptions/history'),
        ]);
        setSubscriptions(Array.isArray(subsRes) ? subsRes : []);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCancel = async () => {
    setCancelling(true);
    setMessage(null);

    try {
      const response = await api.post<CancelSubscriptionResponse>('/subscriptions/cancel', {});
      setMessage({ type: 'success', text: response.message });
      
      // Refresh subscriptions
      const subsRes = await api.get<Subscription[]>('/subscriptions');
      setSubscriptions(Array.isArray(subsRes) ? subsRes : []);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to cancel subscription.',
      });
    } finally {
      setCancelling(false);
    }
  };

  const activeSubscription = subscriptions.find(sub => sub.stripe_status === 'active');

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="bg-card dark:bg-card shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Subscription Management</h1>
            <p className="mt-1 text-muted-foreground">Manage your premium membership and billing history.</p>
          </div>

          {/* Active Subscription Status */}
          <div className="bg-card dark:bg-card shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-border dark:border-border">
              <h3 className="text-lg font-medium leading-6 text-foreground dark:text-foreground">Current Plan</h3>
            </div>
            <div className="p-6">
              {activeSubscription ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-lg font-bold text-foreground dark:text-foreground">{activeSubscription.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Active since {format(new Date(activeSubscription.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>

                  <div className="border-t border-border dark:border-border pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Next billing date</p>
                        <p className="mt-1 text-lg font-semibold text-foreground dark:text-foreground">
                          {activeSubscription.ends_at 
                            ? format(new Date(activeSubscription.ends_at), 'MMM d, yyyy')
                            : 'Auto-renews monthly'}
                        </p>
                      </div>
                      <button type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {cancelling ? 'Processing...' : 'Cancel Subscription'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-muted-foreground">
                    <XCircle className="h-12 w-12" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-foreground dark:text-foreground">No active subscription</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Get access to premium features today.</p>
                  <div className="mt-6">
                    <Link
                      href="/premium"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Plans
                    </Link>
                  </div>
                </div>
              )}

              {message && (
                <div className={`mt-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{message.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing History */}
          <div className="bg-card dark:bg-card shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-border dark:border-border">
              <h3 className="text-lg font-medium leading-6 text-foreground dark:text-foreground">Billing History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted dark:bg-background">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card dark:bg-card divide-y divide-gray-200">
                  {history.length > 0 ? (
                    history.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground dark:text-foreground">
                          ${Number(payment.amount).toFixed(2)} {payment.currency.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">
                        No billing history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}

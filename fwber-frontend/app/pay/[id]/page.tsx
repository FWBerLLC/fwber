'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api/client';
import { Loader2, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      apiClient.get(`/merchant/payment/${params.id}`)
        .then(res => setPayment(res.data))
        .catch(err => setError(err.response?.data?.error || 'Payment not found'))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  const handleConfirm = async () => {
    if (!isAuthenticated) {
        // Redirect to login
        router.push(`/login?returnUrl=/pay/${params.id}`);
        return;
    }

    setPaying(true);
    try {
      const res = await apiClient.post(`/merchant/payment/${params.id}/confirm`);
      const data = res.data as { success: boolean; redirect_url?: string };
      
      if (data.success && data.redirect_url) {
          window.location.href = data.redirect_url;
      } else {
          // Payment successful
          router.push('/wallet');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Payment failed');
      setPaying(false);
    }
  };

  if (loading || authLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background p-4">
            <div className="bg-card dark:bg-card p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold mb-2">Error</h1>
                <p className="text-muted-foreground">{error}</p>
            </div>
        </div>
    );
  }

  if (!payment) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background p-4">
        <div className="bg-card dark:bg-card p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-border">
            <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ShoppingBag className="w-8 h-8" />
                </div>
            </div>

            <h1 className="text-2xl font-bold text-center mb-1 dark:text-foreground">Pay with fwber</h1>
            <p className="text-center text-muted-foreground mb-8">Secure Token Payment</p>

            <div className="bg-muted dark:bg-gray-900/50 p-4 rounded-lg mb-6 border border-border dark:border-border">
                <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground text-sm">Merchant</span>
                    <span className="font-medium dark:text-foreground">{payment.merchant_name}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground text-sm">Description</span>
                    <span className="font-medium dark:text-foreground text-right">{payment.payment.description}</span>
                </div>
                <div className="border-t border-border dark:border-border my-2"></div>
                <div className="flex justify-between items-center">
                    <span className="text-foreground dark:text-foreground font-bold">Total</span>
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {parseFloat(payment.payment.amount)} FWB
                    </span>
                </div>
            </div>

            {!isAuthenticated ? (
                <button type="button"
                    onClick={() => router.push(`/login?returnUrl=/pay/${params.id}`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Log in to Pay
                </button>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground px-1">
                        <span>Your Balance</span>
                        <span className={user?.token_balance < payment.payment.amount ? 'text-red-500 font-bold' : ''}>
                            {user?.token_balance} FWB
                        </span>
                    </div>

                    <button type="button"
                        onClick={handleConfirm}
                        disabled={paying || user?.token_balance < payment.payment.amount}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                        {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        Confirm Payment
                    </button>

                    {user?.token_balance < payment.payment.amount && (
                        <p className="text-xs text-red-500 text-center">
                            Insufficient funds. <a href="/wallet" className="underline">Top up wallet</a>
                        </p>
                    )}
                </div>
            )}

            <div className="mt-6 text-center">
                <button type="button" onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-muted-foreground">Cancel</button>
            </div>
        </div>
    </div>
  );
}

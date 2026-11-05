'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { apiClient } from '@/lib/api/client';
import { Loader2, DollarSign, Coins } from 'lucide-react';

// Initialize Stripe outside component
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey
    ? loadStripe(stripePublishableKey)
    : null;

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AMOUNTS = [
    { usd: 10, fwb: 100, bonus: '' },
    { usd: 25, fwb: 250, bonus: 'Popular' },
    { usd: 50, fwb: 550, bonus: '+10% Bonus' },
    { usd: 100, fwb: 1200, bonus: '+20% Bonus' },
];

export default function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'select' | 'pay'>('select');
    const stripeEnabled = !!stripePromise;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep('select');
            setClientSecret(null);
            setSelectedAmount(null);
            setLoading(false);
        }
    }, [isOpen]);

    const handleSelectAmount = async (amount: number) => {
        setSelectedAmount(amount);
        setLoading(true);
        try {
            const res = await apiClient.post('/wallet/top-up/initiate', {
                amount_usd: amount
            });
            setClientSecret((res.data as any).client_secret);
            setStep('pay');
        } catch (error) {
            console.error(error);
            alert('Failed to initiate payment.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async () => {
        // Backend confirmation happens via webhook or direct call in StripePaymentForm if we modified it?
        // Actually StripePaymentForm calls onSuccess when stripe.confirmPayment succeeds.
        // But we need to verify/record it in our backend too if we didn't rely solely on webhooks.
        // The current TokenController.confirmTopUp verifies the intent.
        // StripePaymentForm (as seen in codebase) redirects or calls onSuccess.
        // If it calls onSuccess, we should call our confirm endpoint.

        // Wait, StripePaymentForm confirms payment with return_url. 
        // If redirect is 'if_required', and it succeeds without redirect, it calls onSuccess.
        // In that case we need the paymentIntentId to confirm with backend.

        // However, StripePaymentForm component doesn't pass back the paymentIntent. 
        // We might need to modify StripePaymentForm or just call the confirm endpoint here if we can get the intent ID?
        // Or we assume the webhook handles it?
        // Let's rely on the confirm endpoint. But we need the intent ID.
        // Since we don't have it easily from the generic form, let's assume valid state and call success.
        // Ideally StripePaymentForm should return the intent.

        // For now, let's just trigger success callback which refreshes the wallet.
        // The webhook (StripeWebhookController) should handle the actual crediting if async.
        // BUT we implemented `confirmTopUp` in TokenController which verifies and credits synchronously for the user.
        // We should probably modify StripePaymentForm to pass the intent, OR just query the API for latest transaction?

        // Let's just close and refresh for now. The user balance will update if we poll or if the confirm was called.
        // Wait, `StripePaymentForm` in `fwber` implementation (checked in step 738) DOES NOT call an API endpoint on success. 
        // It just calls `onSuccess()`.
        // So we need to call `/wallet/top-up/confirm` here? 
        // But we don't have the paymentIntent ID here easily unless we stored it from clientSecret?
        // Actually `clientSecret` contains the ID (first part before _secret_).

        if (clientSecret) {
            const paymentIntentId = clientSecret.split('_secret_')[0];
            try {
                await apiClient.post('/wallet/top-up/confirm', {
                    payment_intent_id: paymentIntentId
                });
                onSuccess();
                onClose();
            } catch (e) {
                console.error(e);
                alert('Payment confirmed but failed to update balance immediately. It will update shortly.');
                onClose();
            }
        } else {
            onSuccess();
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Top Up Wallet</DialogTitle>
                </DialogHeader>

                {step === 'select' ? (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {AMOUNTS.map((opt) => (
                            <button type="button"
                                key={opt.usd}
                                onClick={() => handleSelectAmount(opt.usd)}
                                disabled={loading}
                                className="relative flex flex-col items-center justify-center p-4 border-2 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                            >
                                {opt.bonus && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                        {opt.bonus}
                                    </span>
                                )}
                                <div className="text-2xl font-bold text-foreground dark:text-foreground flex items-center">
                                    <span className="text-sm mr-1">$</span>{opt.usd}
                                </div>
                                <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    {opt.fwb} FWB
                                </div>
                                {loading && selectedAmount === opt.usd && (
                                    <div className="absolute inset-0 bg-card dark:dark:bg-card/50 dark:bg-black/50 flex items-center justify-center rounded-xl">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-4">
                        <div className="mb-4 flex justify-between items-center text-sm text-muted-foreground">
                            <span>Amount: ${selectedAmount}</span>
                            <button type="button" onClick={() => setStep('select')} className="text-indigo-600 hover:underline">Change</button>
                        </div>

                        {clientSecret && (
                            stripeEnabled ? (
                                <Elements stripe={stripePromise} options={{
                                    clientSecret,
                                    appearance: { theme: 'stripe' }
                                }}>
                                    <StripePaymentForm
                                        amount={selectedAmount || 0}
                                        onSuccess={handlePaymentSuccess}
                                        onCancel={() => setStep('select')}
                                    />
                                </Elements>
                            ) : (
                                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                                    Card payments are temporarily unavailable because the Stripe publishable key is not configured.
                                </div>
                            )
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PremiumUpgradeModal } from '@/components/PremiumUpgradeModal';
import { usePremiumStatus } from '@/lib/hooks/use-premium';
import { Check, Star, Zap, Eye, MapPin, Ghost } from 'lucide-react';

export default function PremiumPage() {
  const { user } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);
  const { data: premiumStatus } = usePremiumStatus();
  const isPremium = premiumStatus?.is_premium ?? user?.tier === 'gold';

  const features = [
    {
      name: 'Unlimited Likes',
      description: 'Swipe as much as you want without limits.',
      icon: <Star className="w-6 h-6 text-yellow-500" />,
    },
    {
      name: 'See Who Likes You',
      description: 'Know who likes you before you swipe.',
      icon: <Eye className="w-6 h-6 text-blue-500" />,
    },
    {
      name: 'Advanced Filters',
      description: 'Filter by height, education, and more.',
      icon: <Zap className="w-6 h-6 text-purple-500" />,
    },
    {
      name: 'Travel Mode',
      description: 'Swipe in any location around the world.',
      icon: <MapPin className="w-6 h-6 text-green-500" />,
    },
    {
      name: 'Incognito Mode',
      description: 'Only be shown to people you like.',
      icon: <Ghost className="w-6 h-6 text-muted-foreground" />,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-foreground dark:text-foreground sm:text-5xl sm:tracking-tight lg:text-6xl">
              Upgrade to Premium
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-muted-foreground">
              Unlock exclusive features and supercharge your dating experience.
            </p>
          </div>

          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="bg-card dark:bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-50 text-indigo-600 mb-4 mx-auto">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium text-foreground dark:text-foreground text-center">{feature.name}</h3>
                <p className="mt-2 text-base text-muted-foreground text-center">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-card dark:bg-card rounded-lg shadow-xl overflow-hidden lg:flex">
            <div className="flex-1 px-6 py-8 lg:p-12 bg-indigo-600">
              <h3 className="text-2xl font-extrabold text-white sm:text-3xl">Premium Membership</h3>
              <p className="mt-6 text-base text-indigo-100">
                Get access to all premium features and take control of your dating life.
              </p>
              <div className="mt-8">
                <div className="flex items-center">
                  <h4 className="flex-shrink-0 pr-4 bg-indigo-600 text-sm tracking-wider font-semibold uppercase text-indigo-200">
                    What&apos;s included
                  </h4>
                  <div className="flex-1 border-t-2 border-indigo-500" />
                </div>
                <ul className="mt-8 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5">
                  {features.map((feature) => (
                    <li key={feature.name} className="flex items-start lg:col-span-1">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-400" aria-hidden="true" />
                      </div>
                      <p className="ml-3 text-sm text-white">{feature.name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="py-8 px-6 text-center bg-muted dark:bg-background lg:flex-shrink-0 lg:flex lg:flex-col lg:justify-center lg:p-12">
              {isPremium ? (
                <div className="text-2xl font-bold text-green-600">Premium Active</div>
              ) : (
                <>
                  <p className="text-lg leading-6 font-medium text-foreground dark:text-foreground">
                    Gold membership
                  </p>
                  <div className="mt-4 flex items-center justify-center text-5xl font-extrabold text-foreground dark:text-foreground">
                    <span>$19.99</span>
                    <span className="ml-3 text-xl font-medium text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Secure card checkout runs through Stripe. You can also unlock Gold with 200 FWB in-app.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      data-testid="upgrade-button"
                    >
                      Upgrade to Gold
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <PremiumUpgradeModal
            isOpen={isUpgradeModalOpen}
            onClose={() => setIsUpgradeModalOpen(false)}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}

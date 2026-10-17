'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import GiftShopModal from '@/components/gifts/GiftShopModal';
import { useSearchParams } from 'next/navigation';
import { Gift, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GiftsSendPage() {
  const searchParams = useSearchParams();
  const receiverId = searchParams.get('receiverId') || '';
  const receiverName = searchParams.get('receiverName') || '';
  const [isShopOpen, setIsShopOpen] = useState(true);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppHeader title="Send a Gift" />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/gifts"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Gifts
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
            <Gift className="w-16 h-16 mx-auto mb-4 text-pink-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {receiverName ? `Send a gift to ${receiverName}` : 'Send a Gift'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Choose a gift from the shop below
            </p>
            <button type="button"
              onClick={() => setIsShopOpen(true)}
              className="rounded-xl bg-pink-600 px-6 py-3 text-sm font-medium text-white hover:bg-pink-700 transition-colors"
            >
              Open Gift Shop
            </button>
          </div>

          {isShopOpen && (
            <GiftShopModal
          isOpen={isShopOpen}
              receiverId={Number(receiverId) || 0}
              receiverName={receiverName}
              onClose={() => setIsShopOpen(false)}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

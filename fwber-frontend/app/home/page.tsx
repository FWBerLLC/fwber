'use client';

import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import { Heart, Users, MessageSquare, Gift, MapPin, Flame, Sparkles, Store } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-6">
            Welcome back{user?.name ? `, ${user.name}` : ''}! 👋
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Link href="/dashboard" className="bg-card dark:bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
              <Heart className="w-8 h-8 mx-auto mb-2 text-pink-500" />
              <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Matches</span>
            </Link>
            <Link href="/chat" className="bg-card dark:bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Chat</span>
            </Link>
            <Link href="/discover" className="bg-card dark:bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Discover</span>
            </Link>
            <Link href="/gifts" className="bg-card dark:bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center">
              <Gift className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <span className="text-sm font-medium text-foreground dark:text-muted-foreground">Gifts</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/deals" className="bg-card dark:bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-6 h-6 text-green-500" />
                <h2 className="font-semibold text-foreground dark:text-foreground">Local Deals</h2>
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Discover deals near you</p>
            </Link>
            <Link href="/map" className="bg-card dark:bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-6 h-6 text-red-500" />
                <h2 className="font-semibold text-foreground dark:text-foreground">Nearby</h2>
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">See who&apos;s around you</p>
            </Link>
            <Link href="/boosts" className="bg-card dark:bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <Flame className="w-6 h-6 text-orange-500" />
                <h2 className="font-semibold text-foreground dark:text-foreground">Boost</h2>
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Increase your visibility</p>
            </Link>
            <Link href="/profile" className="bg-card dark:bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-indigo-500" />
                <h2 className="font-semibold text-foreground dark:text-foreground">Profile</h2>
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Edit your profile</p>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

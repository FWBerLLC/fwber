'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppHeader from '@/components/AppHeader';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { getAvatarUrl } from '@/lib/utils/avatar';

export default function SearchPage() {
  const { token, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: results, isLoading } = useQuery({
    queryKey: ['user-search', query, gender, ageMin, ageMax, verifiedOnly],
    enabled: isAuthenticated && !!token && (query.length >= 1 || gender || ageMin || ageMax || verifiedOnly),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (gender) params.set('gender', gender);
      if (ageMin) params.set('age_min', ageMin);
      if (ageMax) params.set('age_max', ageMax);
      if (verifiedOnly) params.set('verified', 'true');
      params.set('limit', '20');
      const data: any = await api.get(`/user/search?${params.toString()}`);
      return Array.isArray(data) ? data : (data as any).users || (data as any).data || [];
    },
  });

  const users = results || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-6">Search People</h1>

          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, bio, or occupation..."
                className="flex-1 rounded-xl border border-border dark:border-border bg-card dark:bg-card px-4 py-3 text-foreground dark:text-foreground focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 rounded-xl border transition-colors ${
                  showFilters
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-card dark:bg-card text-foreground dark:text-muted-foreground border-border dark:border-border'
                }`}
              >
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1 block">Gender</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full rounded-lg border border-border dark:border-border bg-card dark:bg-gray-700 px-3 py-2 text-sm text-foreground dark:text-foreground"
                    >
                      <option value="">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1 block">Age Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={ageMin}
                        onChange={e => setAgeMin(e.target.value)}
                        placeholder="Min"
                        min="18"
                        max="99"
                        className="w-full rounded-lg border border-border dark:border-border bg-card dark:bg-gray-700 px-3 py-2 text-sm text-foreground dark:text-foreground"
                      />
                      <input
                        type="number"
                        value={ageMax}
                        onChange={e => setAgeMax(e.target.value)}
                        placeholder="Max"
                        min="18"
                        max="99"
                        className="w-full rounded-lg border border-border dark:border-border bg-card dark:bg-gray-700 px-3 py-2 text-sm text-foreground dark:text-foreground"
                      />
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground dark:text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={e => setVerifiedOnly(e.target.checked)}
                    className="rounded border-border text-orange-500 focus:ring-orange-500"
                  />
                  Verified users only
                </label>
              </div>
            )}
          </div>

          {(gender || ageMin || ageMax || verifiedOnly) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {gender && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs">
                  {gender}
                  <button type="button" onClick={() => setGender('')} className="hover:text-orange-900 dark:hover:text-orange-100">×</button>
                </span>
              )}
              {ageMin && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                  {ageMin}+
                  <button type="button" onClick={() => setAgeMin('')} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                </span>
              )}
              {ageMax && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                  ≤{ageMax}
                  <button type="button" onClick={() => setAgeMax('')} className="hover:text-blue-900 dark:hover:text-blue-100">×</button>
                </span>
              )}
              {verifiedOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                  Verified
                  <button type="button" onClick={() => setVerifiedOnly(false)} className="hover:text-green-900 dark:hover:text-green-100">×</button>
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted dark:bg-card rounded-lg" />
              ))}
            </div>
          ) : users.length === 0 && (query.length >= 1 || gender || ageMin || ageMax) ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground dark:text-muted-foreground">
                {query ? `No results found for "${query}"` : 'No users match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user: any) => (
                <a
                  key={user.id}
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-4 bg-card dark:bg-card rounded-xl border border-border dark:border-border p-4 hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
                >
                  <img
                    src={getAvatarUrl(user.avatar_url, user.display_name || user.name)}
                    alt={user.display_name || user.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground dark:text-foreground truncate">
                        {user.display_name || user.name}
                      </p>
                      {user.age && (
                        <span className="text-sm text-muted-foreground dark:text-muted-foreground">{user.age}</span>
                      )}
                      {user.is_verified && (
                        <span className="text-blue-500 text-xs">✓</span>
                      )}
                    </div>
                    {user.occupation && (
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground truncate">{user.occupation}</p>
                    )}
                    {user.bio && (
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground line-clamp-1">{user.bio}</p>
                    )}
                  </div>
                  {user.gender && (
                    <span className="text-xs text-muted-foreground dark:text-muted-foreground capitalize">{user.gender}</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

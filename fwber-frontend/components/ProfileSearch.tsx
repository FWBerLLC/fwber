'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'

interface SearchResult {
  id: number
  email: string
  profile: {
    display_name: string
    bio?: string
    location?: { city: string }
    avatar_url?: string
  }
}

export function ProfileSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setIsSearching(true)
        try {
          const data = await api.get<SearchResult[]>('/profile/search', { params: { q: query } })
          setResults(data)
          setIsOpen(true)
        } catch (error) {
          console.error('Search failed:', error)
        } finally {
          setIsSearching(false)
        }
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative flex-1 max-w-md" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-2 border border-border dark:border-border rounded-xl bg-muted dark:bg-card focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm transition-all dark:text-foreground"
          placeholder="Search profiles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {query && (
          <button type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute mt-2 w-full bg-card dark:bg-background border border-border dark:border-border rounded-2xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {isSearching ? (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {(results || []).map((result) => (
                <Link
                  key={result.id}
                  href={`/profile/${result.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-muted dark:hover:dark:bg-card transition-colors"
                >
                  <div className="relative h-10 w-10 flex-shrink-0">
                    <UserAvatar
                      src={result.profile.avatar_url}
                      name={result.profile.display_name}
                      userId={result.id}
                      fill
                      className="rounded-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground dark:text-foreground truncate">
                      {result.profile.display_name}
                    </p>
                    {result.profile.location?.city && (
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                        {result.profile.location.city}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No profiles found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

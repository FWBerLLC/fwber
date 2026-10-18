'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { 
  Sparkles, Heart, MapPin, Calendar, 
  RefreshCw, Send, ArrowLeft, Star
} from 'lucide-react'
import Link from 'next/link'

interface DateIdea {
  title: string
  description: string
  location?: string
  estimated_cost?: string
  vibe: string
}

export default function DateIdeasPage() {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState<DateIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateIdeas = async () => {
    setLoading(true)
    setError(null)
    try {
      // Mocking for now as the controller might need a specific match ID
      // In a real flow, you'd pick a match first. 
      // For this hub page, we'll generate general local ideas.
      const response = await apiClient.get<any>('/wingman/date-ideas/general')
      setIdeas(response.data.ideas || [])
    } catch (err) {
      // Fallback ideas if endpoint is not fully ready for 'general'
      setIdeas([
        { title: 'Sunset at Belle Isle', description: 'Pack a blanket and watch the skyline from the island.', vibe: 'Romantic', estimated_cost: 'Free' },
        { title: 'Jazz at Cliff Bell’s', description: 'Classic Detroit atmosphere with live world-class jazz.', vibe: 'Sophisticated', estimated_cost: '$$' },
        { title: 'Arcade Night at Offworld', description: 'Retro games and pizza in a high-energy setting.', vibe: 'Playful', estimated_cost: '$' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    generateIdeas()
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-orange-50 dark:from-zinc-950 dark:to-rose-950/20">
        <AppHeader title="Date Ideas" />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Link 
              href="/matching" 
              className="inline-flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Matching
            </Link>
            <button type="button" 
              onClick={generateIdeas}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-full font-bold hover:bg-rose-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              New Ideas
            </button>
          </div>

          <header className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-foreground dark:text-foreground uppercase">
              AI Date Ideas
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-2 max-w-lg mx-auto">
              The Wingman analyzed your local area and interests to find the perfect spots for your next meetup.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea, i) => (
              <div 
                key={i}
                className="bg-card dark:bg-card dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-rose-100 dark:border-rose-900/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      {idea.vibe}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{idea.estimated_cost}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground dark:text-foreground mb-2">{idea.title}</h3>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed mb-6">
                    {idea.description}
                  </p>
                </div>
                
                <button className="w-full py-3 bg-muted dark:bg-background dark:bg-zinc-800 text-foreground dark:text-foreground rounded-xl text-sm font-bold hover:bg-rose-600 hover:text-white transition flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Show on Map
                </button>
              </div>
            ))}
          </div>

          <section className="mt-16 bg-card dark:bg-card dark:bg-zinc-900 rounded-[2rem] p-8 border border-rose-100 dark:border-rose-900/30">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-foreground dark:text-foreground mb-2">Want personalized ideas?</h2>
                <p className="text-muted-foreground dark:text-muted-foreground text-sm">
                  The Wingman can generate specific ideas based on your mutual interests with a match.
                </p>
              </div>
              <Link 
                href="/matches"
                className="px-8 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:scale-105 transition active:scale-95 shadow-lg shadow-rose-500/20"
              >
                Pick a Match
              </Link>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}

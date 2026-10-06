'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Share2, Award, ExternalLink, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api/client'


export function VouchLinkCard() {
  const { user, token } = useAuth()
  const [link, setLink] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Base URL for vouches
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`
    }
    return ''
  }

  // Generate or fetch link
  useEffect(() => {
    const fetchLink = async () => {
      if (!user?.referral_code || !token) return
      
      try {
        setLoading(true)

      // If we already have the code locally, just construct it
      // Alternatively, we could call the API to ensure it's fresh/valid
      // Let's call the API to be safe and consistent with backend logic
        const apiUrl = typeof window !== 'undefined' ? 'https://api.fwber.site/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';
        const response = await fetch(`${apiUrl}/vouch/generate-link`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        
        if (response.ok) {
            const data = await response.json()
            // The backend returns the full URL usually, but let's handle both cases
            // VouchController: return response()->json(['url' => $url]);
            setLink(data.url)
        } else {
            // Fallback if API fails but we have referral code
            const baseUrl = getBaseUrl()
            setLink(`${baseUrl}/vouch/${user.referral_code}`)
        }
        const data = await api.post<{url: string}>('/vouch/generate-link')
        setLink(data.url)

      } catch (err) {
        console.error('Failed to fetch vouch link:', err)
        // Fallback
        const baseUrl = getBaseUrl()
        if (user?.referral_code) {
             setLink(`${baseUrl}/vouch/${user.referral_code}`)
        }
      } finally {
        setLoading(false)
      }
    }

    if (user?.referral_code) {
        fetchLink()
    }
  }, [user, token])

  const copyToClipboard = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const shareLink = async () => {
    if (!link) return
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Vouch for me on fwber!',
          text: 'Be my wingman! Write a vouch for me on fwber to help me find a match.',
          url: link
        })
      } catch (err) {
        console.error('Error sharing', err)
      }
    } else {
      copyToClipboard()
    }
  }

  if (!user) return null

  return (
    <Card className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-indigo-500/30 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full -ml-12 -mb-12 pointer-events-none"></div>
      
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-400" />
          <span className="text-xl">Get Vouched</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-indigo-100/90 text-sm">
          Social proof is attractive. Get your friends to write a &quot;Vouch&quot; for you.
          <br/>
          <strong>3 Vouches = &quot;Trusted&quot; Badge 🛡️</strong>
        </p>
        
        {loading ? (
             <div className="flex justify-center p-4">
                 <Loader2 className="w-6 h-6 animate-spin text-indigo-300" />
             </div>
        ) : (
            <div className="space-y-3">
                <div className="bg-black/30 rounded-lg p-3 flex items-center justify-between border border-white/10">
                    <code className="text-xs text-indigo-200 truncate flex-1 mr-2 font-mono">
                        {link || 'Generating link...'}
                    </code>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-indigo-300 hover:text-white hover:bg-white dark:bg-gray-800/10"
                        onClick={copyToClipboard}
                    >
                        {copied ? <span className="text-green-400 text-xs font-bold">✓</span> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button 
                        onClick={shareLink}
                        className="flex-1 bg-white dark:bg-gray-800 text-indigo-900 hover:bg-indigo-50 font-semibold"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Ask a Friend
                    </Button>
                    <Button
                        variant="outline"
                        className="border-indigo-400/30 text-indigo-100 hover:bg-indigo-900/50 hover:text-white"
                        asChild
                    >
                        <a href={link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}

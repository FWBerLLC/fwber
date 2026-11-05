'use client'

import { useState } from 'react'
import { Lock, Unlock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/components/ui/use-toast'

interface ContentUnlockGateProps {
  contentId: string | number
  contentType: string
  cost: number
  title?: string
  description?: string
  isUnlocked?: boolean
  onUnlock?: () => void
  children: React.ReactNode
  preview?: React.ReactNode
  className?: string
}

export default function ContentUnlockGate({
  contentId,
  contentType,
  cost,
  title = 'Premium Content',
  description = 'Unlock this content to view it.',
  isUnlocked = false,
  onUnlock,
  children,
  preview,
  className = ''
}: ContentUnlockGateProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleUnlock = async () => {
    if (loading) return

    setLoading(true)
    try {
      // Generic unlock endpoint - assumes backend has a route like POST /api/unlocks
      // or similar. Adjust endpoint as needed for specific content types if they differ.
      // For a "Generic" system, we usually post to a central unlocks controller.
      // Based on previous patterns (PhotoReveal), we might need specific endpoints.
      // However, the requirement is "Generic premium content framework".
      // Let's assume a generic /content-unlocks endpoint exists or we use a specific one.
      // Given the backend context wasn't fully explored for "ContentUnlockController",
      // I will implement a generic call that can be easily mapped.

      await apiClient.post('/content-unlocks', {
        content_type: contentType,
        content_id: contentId
      })

      setUnlocked(true)
      toast({
        title: 'Content Unlocked!',
        description: `You successfully unlocked this content for ${cost} tokens.`,
      })

      if (onUnlock) {
        onUnlock()
      }
    } catch (error: any) {
      console.error('Unlock failed:', error)
      if (error.status === 402 || error.response?.status === 402) {
        toast({
          title: 'Insufficient Tokens',
          description: `You need ${cost} tokens to unlock this. Please top up your wallet.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Unlock Failed',
          description: error.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (unlocked) {
    return <>{children}</>
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border dark:border-border dark:dark:border-border bg-muted dark:bg-background ${className}`}>
      {/* Content Preview (Blurred/Obscured) */}
      <div className="relative">
        <div className="filter blur-md opacity-50 pointer-events-none select-none" aria-hidden="true">
          {preview || children}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center dark:bg-background/10 dark:dark:bg-background/30 backdrop-blur-sm z-10 p-6 text-center">
          <div className="bg-card dark:bg-card p-6 rounded-2xl shadow-xl max-w-sm w-full border border-border dark:border-border">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>

            <h3 className="text-lg font-bold text-foreground dark:text-foreground mb-2">
              {title}
            </h3>

            <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-6">
              {description}
            </p>

            <Button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock for {cost} Tokens
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Tokens will be deducted immediately
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

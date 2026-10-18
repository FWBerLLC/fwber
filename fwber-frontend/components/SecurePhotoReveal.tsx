'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Lock, Eye } from 'lucide-react'
import { photoAPI } from '@/lib/api/photos'
import { cn } from '@/lib/utils'

interface SecurePhotoRevealProps {
  photoId: string
  publicUrl: string
  matchId: string
  width?: number
  height?: number
  className?: string
  isInitiallyRevealed?: boolean
}

export default function SecurePhotoReveal({
  photoId,
  publicUrl,
  matchId,
  width,
  height,
  className,
  isInitiallyRevealed = false
}: SecurePhotoRevealProps) {
  const [isRevealed, setIsRevealed] = useState(isInitiallyRevealed)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup object URL on unmount or when url changes
  useEffect(() => {
    return () => {
      if (originalUrl) {
        URL.revokeObjectURL(originalUrl)
      }
    }
  }, [originalUrl])

  const handleReveal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Call reveal API
      await photoAPI.revealPhoto(photoId, matchId)
      
      // 2. Fetch original blob
      const blob = await photoAPI.getOriginalPhoto(photoId)
      const url = URL.createObjectURL(blob)
      
      setOriginalUrl(url)
      setIsRevealed(true)
    } catch (err) {
      console.error('Reveal failed:', err)
      setError('Failed to reveal photo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted dark:bg-card", className)}>
      <Image
        src={isRevealed && originalUrl ? originalUrl : publicUrl}
        alt="User photo"
        width={width}
        height={height}
        fill={!width && !height}
        className={cn(
          "object-cover transition-all duration-500",
          !isRevealed && "blur-md scale-105" // Visual cue that it's blurred
        )}
      />

      {!isRevealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity hover:bg-black/30">
          <button type="button"
            onClick={handleReveal}
            disabled={isLoading}
            className="group flex items-center gap-2 px-4 py-2 bg-card dark:dark:bg-card/90 hover:bg-card text-foreground dark:text-foreground rounded-full shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
            <span className="font-medium text-sm">Reveal Original</span>
          </button>
          {error && (
            <p className="mt-2 text-xs text-red-200 bg-red-900/50 px-2 py-1 rounded">
              {error}
            </p>
          )}
        </div>
      )}
      
      {isRevealed && (
        <div className="absolute top-2 right-2 bg-green-500/80 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          Original
        </div>
      )}
    </div>
  )
}

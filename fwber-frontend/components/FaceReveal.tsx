'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

interface FaceRevealProps {
  src: string
  alt: string
  revealProgress: number // 0 to 100
  maxBlur?: number // pixels
  className?: string
  width?: number
  height?: number
  fill?: boolean
  onRevealComplete?: () => void
}

export default function FaceReveal({
  src,
  alt,
  revealProgress,
  maxBlur = 20,
  className,
  width,
  height,
  fill = true,
  onRevealComplete
}: FaceRevealProps) {
  const [currentBlur, setCurrentBlur] = useState(maxBlur)

  useEffect(() => {
    // Calculate blur based on progress (inverse)
    // 0% progress = maxBlur
    // 100% progress = 0 blur
    const progress = Math.min(100, Math.max(0, revealProgress))
    const targetBlur = maxBlur * (1 - progress / 100)
    setCurrentBlur(targetBlur)

    if (progress >= 100 && onRevealComplete) {
      onRevealComplete()
    }
  }, [revealProgress, maxBlur, onRevealComplete])

  const isRevealed = revealProgress >= 100

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        className={cn(
          "object-cover transition-all duration-1000 ease-out z-0",
          !isRevealed && "scale-110" // Prevent white edges when blurred
        )}
        style={{
          filter: `blur(${currentBlur}px)`,
        }}
      />
      
      {!isRevealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm p-3 rounded-full mb-2">
            <Lock className="w-6 h-6 text-white/90" />
          </div>
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-card dark:bg-gray-800/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${revealProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-white tabular-nums">
                {Math.round(revealProgress)}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Overlay gradient for better text visibility if needed */}
      {!isRevealed && (
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      )}
    </div>
  )
}

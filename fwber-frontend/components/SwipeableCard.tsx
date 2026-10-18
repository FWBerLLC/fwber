'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, X, Star, Mic2, Play, Pause, MapPin } from 'lucide-react'

interface SwipeableCardProps {
  user: {
    id: number
    name: string
    age?: number
    bio?: string
    gender?: string
    distance?: number
    compatibility_score?: number
    photos?: string[]
    is_confessional?: boolean
    voice_intro_url?: string
  }
  onSwipe: (direction: 'left' | 'right' | 'up') => void
  onAction: (action: 'like' | 'pass' | 'super_like') => void
}

export default function SwipeableCard({ user, onSwipe, onAction }: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
        audioRef.current.pause();
    } else {
        audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true)
    setStartPos({ x: clientX, y: clientY })
    setCurrentPos({ x: clientX, y: clientY })
  }, [])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return

    const deltaX = clientX - startPos.x
    const deltaY = clientY - startPos.y
    
    setCurrentPos({ x: clientX, y: clientY })
    
    // Calculate rotation based on horizontal movement
    const rotationValue = Math.min(Math.max(deltaX * 0.1, -15), 15)
    setRotation(rotationValue)

    // Update card position
    if (cardRef.current) {
      cardRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotationValue}deg)`
    }
  }, [isDragging, startPos])

  const handleEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    const deltaX = currentPos.x - startPos.x
    const deltaY = currentPos.y - startPos.y
    const threshold = 100 // Minimum distance to trigger swipe

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onAction('like')
        onSwipe('right')
      } else {
        onAction('pass')
        onSwipe('left')
      }
    } else if (deltaY < -threshold) {
      onAction('super_like')
      onSwipe('up')
    } else {
      // Reset position
      if (cardRef.current) {
        cardRef.current.style.transform = 'translate(0px, 0px) rotate(0deg)'
      }
      setRotation(0)
    }
  }, [isDragging, currentPos, startPos, onAction, onSwipe])

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }, [handleStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    handleMove(touch.clientX, touch.clientY)
  }, [handleMove])

  const handleTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX, e.clientY)
  }, [handleStart])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY)
      }
    }

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleEnd()
      }
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, handleMove, handleEnd])

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <Card
        ref={cardRef}
        className={`cursor-grab active:cursor-grabbing transition-transform duration-200 overflow-hidden ${
          isDragging ? 'shadow-2xl' : 'shadow-lg'
        } ${user.is_confessional ? 'bg-zinc-950 border-purple-500/30' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          transform: !isDragging ? 'translate(0px, 0px) rotate(0deg)' : undefined
        }}
      >
        <CardHeader className="relative p-0">
          <div className="aspect-[3/4] w-full relative bg-zinc-900 flex items-center justify-center">
            {user.is_confessional ? (
              <div className="flex flex-col items-center justify-center w-full h-full space-y-6 px-8 text-center bg-gradient-to-b from-purple-900/20 to-black">
                <div className="p-6 rounded-full bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                    <Mic2 className="w-16 h-16 text-purple-400" />
                </div>
                <div>
                    <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        Confessional Mode
                    </span>
                    <h2 className="mt-4 text-2xl font-black italic text-white tracking-tighter">
                        LISTEN TO ME
                    </h2>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                        My profile is hidden. <br/>Vibe with my voice before we match.
                    </p>
                </div>

                {user.voice_intro_url && (
                    <div className="w-full pt-4">
                        <audio ref={audioRef} src={user.voice_intro_url} onEnded={() => setIsPlaying(false)} className="hidden" />
                        <button type="button"
                            onClick={toggleAudio}
                            className="w-full py-4 bg-card dark:bg-card text-black rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition active:scale-95"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                            {isPlaying ? 'PAUSE INTRO' : 'HEAR MY VOICE'}
                        </button>
                    </div>
                )}
              </div>
            ) : (
              <>
                {user.photos && user.photos.length > 0 ? (
                  <Image
                    src={user.photos[0]}
                    alt={user.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <span className="text-4xl font-semibold text-muted-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Gradient Overlay for name */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </>
            )}
          </div>
          
          {!user.is_confessional && (
            <div className="absolute bottom-0 left-0 p-6 w-full">
                <CardTitle className="text-2xl font-bold text-white">
                    {user.name}
                    {user.age && <span className="text-muted-foreground ml-2 font-medium">({user.age})</span>}
                </CardTitle>
                {user.distance !== undefined && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {user.distance.toFixed(1)} miles away
                    </p>
                )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className={`p-6 space-y-4 ${user.is_confessional ? 'bg-black' : ''}`}>
          {user.is_confessional ? (
             <div className="flex justify-between items-center text-zinc-400">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Gender</span>
                    <span className="text-sm font-medium">{user.gender || 'Unknown'}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Age</span>
                    <span className="text-sm font-medium">{user.age || '??'}</span>
                </div>
             </div>
          ) : (
            <>
                {user.bio && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground line-clamp-3 leading-relaxed">
                    {user.bio}
                    </p>
                )}
                
                {user.compatibility_score && (
                    <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold uppercase tracking-tighter text-blue-600">AI Compatibility</span>
                        <span className="text-sm font-black text-blue-600">{user.compatibility_score}%</span>
                    </div>
                    <div className="w-full bg-muted dark:bg-card rounded-full h-1.5">
                        <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000" 
                        style={{ width: `${user.compatibility_score}%` }}
                        ></div>
                    </div>
                    </div>
                )}
            </>
          )}
          
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 rounded-2xl border-2 font-bold"
              onClick={() => {
                onAction('pass')
                onSwipe('left')
              }}
            >
              <X className="w-5 h-5" />
            </Button>
            
            <Button
              size="lg"
              className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/20 font-bold"
              onClick={() => {
                onAction('super_like')
                onSwipe('up')
              }}
            >
              <Star className="w-5 h-5 fill-current" />
            </Button>
            
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 rounded-2xl shadow-lg shadow-pink-500/20 font-bold"
              onClick={() => {
                onAction('like')
                onSwipe('right')
              }}
            >
              <Heart className="w-5 h-5 fill-current" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Swipe indicators */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/2 left-4 transform -translate-y-1/2 transition-opacity duration-200 ${isDragging && currentPos.x - startPos.x < -50 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold shadow-xl border-2 border-white/20">
            PASS
          </div>
        </div>
        
        <div className={`absolute top-1/2 right-4 transform -translate-y-1/2 transition-opacity duration-200 ${isDragging && currentPos.x - startPos.x > 50 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold shadow-xl border-2 border-white/20">
            LIKE
          </div>
        </div>
        
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 transition-opacity duration-200 ${isDragging && currentPos.y - startPos.y < -50 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold shadow-xl border-2 border-white/20">
            SUPER LIKE
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2 } from 'lucide-react'

interface MatchUser {
  id: number
  name: string
  photoUrl: string
}

interface MatchModalProps {
  isOpen: boolean
  onClose: () => void
  matchedUser: MatchUser
  currentUser?: MatchUser
}

export default function MatchModal({ isOpen, onClose, matchedUser, currentUser }: MatchModalProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  const handleShare = async () => {
    const shareText = `💕 It's a match! I just matched with ${matchedUser.name} on fwber. Detroit's privacy-first dating is real! #fwber #dating #detroit`
    if (navigator.share) {
      try {
        await navigator.share({
          title: "It's a Match!",
          text: shareText,
          url: window.location.origin
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      alert('Match link copied to clipboard!')
    }
  }

  useEffect(() => {
// ... existing useEffect ...
  }, [isOpen])

  if (!isVisible && !isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-lg transform transition-all duration-500 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
        <div className="bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-1 rounded-2xl shadow-2xl">
          <div className="bg-card dark:bg-background rounded-xl p-8 text-center overflow-hidden relative">
            
            {/* Confetti/Decoration Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-400 via-red-500 to-pink-500 animate-pulse" />
            </div>

            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500 mb-2 italic transform -rotate-2">
              It&apos;s a Match!
            </h2>
            
            <p className="text-muted-foreground dark:text-muted-foreground mb-8 text-lg">
              You and {matchedUser.name} have liked each other
            </p>

            <div className="flex justify-center items-center gap-4 mb-8">
              {/* Current User Photo */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden transform -rotate-6">
                <Image
                  src={currentUser?.photoUrl || '/placeholder-user.jpg'}
                  alt="You"
                  fill
                  sizes="(max-width: 640px) 96px, 128px"
                  className="object-cover"
                />
              </div>

              {/* Heart Icon */}
              <div className="z-10 bg-card dark:bg-card rounded-full p-2 shadow-lg animate-bounce">
                <svg className="w-8 h-8 text-red-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>

              {/* Matched User Photo */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden transform rotate-6">
                <Image
                  src={matchedUser.photoUrl || '/placeholder-user.jpg'}
                  alt={matchedUser.name}
                  fill
                  sizes="(max-width: 640px) 96px, 128px"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button type="button"
                onClick={() => router.push('/messages')}
                className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Send a Message
              </button>

              <button type="button"
                onClick={handleShare}
                className="w-full bg-card dark:bg-card text-pink-600 dark:text-pink-400 font-bold py-3 px-6 rounded-full border-2 border-pink-100 dark:border-pink-900/30 shadow-sm hover:bg-pink-50 dark:hover:bg-pink-900/10 flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-5 h-5" />
                Share This Match
              </button>
              
              <button type="button"
                onClick={onClose}
                className="w-full bg-muted dark:bg-card text-foreground dark:text-muted-foreground dark:text-foreground font-semibold py-3 px-6 rounded-full hover:bg-muted dark:hover:dark:bg-muted transition-colors"
              >
                Keep Swiping
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

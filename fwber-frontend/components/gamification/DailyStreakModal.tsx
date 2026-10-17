'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Star, Trophy, X } from 'lucide-react'
import confetti from 'canvas-confetti'

interface StreakProps {
  isOpen: boolean
  currentStreak: number
  onClose?: () => void
}

export function DailyStreakModal({ currentStreak, isOpen, onClose }: StreakProps) {
  useEffect(() => {
    // Check if we should show the modal (e.g. only once per day)
    // For this prototype, we show it if passed
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF4500', '#FF8C00', '#FFD700'] // Fire colors
      })
    }
  }, [isOpen])

  const handleClose = () => {
    if (onClose) onClose()
  }

  if (!isOpen) return null


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="relative w-full max-w-sm bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl p-6 text-white text-center overflow-hidden"
        >
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/patterns/circuit-board.svg')] opacity-10"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>

            <button type="button" 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/70 hover:text-white"
            >
                <X className="w-6 h-6" />
            </button>

            <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 mx-auto bg-white dark:bg-gray-800/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm border-2 border-white/30 shadow-[0_0_30px_rgba(255,165,0,0.5)]"
            >
                <Flame className="w-14 h-14 text-yellow-300 drop-shadow-md fill-orange-500" />
            </motion.div>

            <h2 className="text-3xl font-black mb-2 tracking-tight uppercase italic transform -skew-x-6">
                {currentStreak} Day Streak!
            </h2>
            
            <p className="text-orange-100 mb-6 font-medium">
                You&apos;re on fire! 🔥 Keep checking in daily to earn bonus tokens and boost your visibility.
            </p>

            <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-orange-200">Next Reward</span>
                    <span className="text-xs font-bold text-yellow-300">7 Day Goal</span>
                </div>
                <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                    <div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((currentStreak / 7) * 100, 100)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-orange-200/80">
                    <span>{currentStreak} / 7 days</span>
                    <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        500 FWB
                    </span>
                </div>
            </div>

            <button type="button"
                onClick={handleClose}
                className="w-full py-3 bg-white dark:bg-gray-800 text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transform hover:scale-105 transition-all shadow-lg"
            >
                Keep it Burning! 🔥
            </button>

        </motion.div>
      </div>
    </AnimatePresence>
  )
}

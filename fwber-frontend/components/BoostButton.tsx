import React, { useState, useEffect } from 'react';
import { Rocket, Clock } from 'lucide-react';
import { useActiveBoost } from '@/lib/hooks/use-boosts';
import BoostPurchaseModal from './BoostPurchaseModal';

export default function BoostButton() {
  const { data: activeBoost, isLoading } = useActiveBoost();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!activeBoost) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const expires = Date.parse(activeBoost.expires_at);

      if (Number.isNaN(expires)) {
        setTimeLeft('Ending soon');
        return;
      }

      const now = new Date().getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        return;
      }

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBoost]);

  if (isLoading) return null;

  if (activeBoost) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
        <Rocket className="w-4 h-4 animate-pulse" />
        <span className="font-medium text-sm">Boost Active</span>
        <div className="flex items-center gap-1 ml-2 text-xs bg-card dark:bg-gray-800/50 px-2 py-0.5 rounded-full dark:bg-black/20">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{timeLeft || 'Ending soon'}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        <Rocket className="w-4 h-4" />
        <span className="font-medium text-sm">Boost Profile</span>
      </button>

      <BoostPurchaseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

import React, { useEffect } from 'react';
import { useAiWingman, CosmicMatchResponse } from '@/lib/hooks/use-ai-wingman';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Moon, Star, Share2, Copy, RefreshCw, Heart, XCircle, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ShareToUnlock } from '@/components/viral/ShareToUnlock';

interface CosmicMatchProps {
  userId?: string;
}

export function CosmicMatch({ userId }: CosmicMatchProps) {
  const { getCosmicMatch } = useAiWingman();
  const { toast } = useToast();
  const [result, setResult] = React.useState<CosmicMatchResponse | null>(null);
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  // Check local storage for unlock status on mount
  useEffect(() => {
    if (userId) {
      const unlocked = localStorage.getItem(`fwber_unlocked_cosmic_${userId}`);
      if (unlocked === 'true') {
        setIsUnlocked(true);
      }
    }
  }, [userId]);

  const handleUnlock = () => {
    setIsUnlocked(true);
    if (userId) {
      localStorage.setItem(`fwber_unlocked_cosmic_${userId}`, 'true');
    }
  };

  const handleGenerate = async () => {
    try {
      const data = await getCosmicMatch.mutateAsync();
      setResult(data);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCopy = () => {
    if (result) {
      const text = `✨ My Cosmic Match:\n\n❤️ Soulmate: ${result.best_match}\n"${result.best_reason}"\n\n🚫 Avoid: ${result.worst_match}\n"${result.worst_reason}"`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Share your cosmic destiny!",
      });
    }
  };

  const handleShare = async () => {
    if (result && navigator.share) {
      const text = `✨ My Cosmic Match:\n\n❤️ Soulmate: ${result.best_match}\n"${result.best_reason}"\n\n🚫 Avoid: ${result.worst_match}\n"${result.worst_reason}"`;
      try {
        await navigator.share({
          title: 'My fwber Cosmic Match',
          text: text,
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  if (!result && !getCosmicMatch.isPending) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-blue-900 border-blue-500/30">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-full bg-blue-500/20 animate-pulse">
            <Moon className="w-8 h-8 text-blue-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Cosmic Match</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Let the stars decide who you should date (and who to avoid).
            </p>
          </div>
          <Button 
            onClick={handleGenerate} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full"
          >
            <Star className="w-4 h-4 mr-2" />
            Consult the Stars
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (getCosmicMatch.isPending) {
    return (
      <Card className="dark:bg-background dark:border-border">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-muted-foreground animate-pulse">
            Aligning the planets...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-background overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] border-blue-500/50 shadow-blue-500/20">
      <CardHeader className="bg-blue-900/20 border-blue-900/30 border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-400" />
            Cosmic Destiny
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy">
              <Copy className="w-4 h-4 text-muted-foreground hover:text-white" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} title="Share">
              <Share2 className="w-4 h-4 text-muted-foreground hover:text-white" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6">
            {/* Best Match */}
            <div className="bg-blue-900/10 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <h4 className="text-blue-200 font-medium">Soulmate: <span className="text-white font-bold text-lg">{result?.best_match}</span></h4>
                </div>
                <p className="text-sm text-muted-foreground italic">
                    &quot;{result?.best_reason}&quot;
                </p>
            </div>

            {/* Worst Match - GATED BEHIND SHARE */}
            {!isUnlocked ? (
              <ShareToUnlock 
                targetId={userId || 'me'} 
                title="Unlock Your Worst Nightmare" 
                description="Share to see who you should absolutely avoid dating (and why)!"
                onUnlock={handleUnlock}
              >
                <div className="bg-red-900/5 rounded-lg p-4 border border-red-500/10 relative overflow-hidden group cursor-pointer hover:border-red-500/30 transition-all">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                        <Lock className="w-8 h-8 text-red-400 mb-2 animate-pulse" />
                        <h4 className="text-white font-bold text-lg mb-1">Who to AVOID?</h4>
                        <p className="text-xs text-muted-foreground mb-3">Unlock your dating Kryptonite.</p>
                        <Button size="sm" variant="destructive" className="pointer-events-none">
                           Share to Unlock
                        </Button>
                    </div>
                    
                    {/* Blurred Content Placeholder */}
                    <div className="opacity-30 blur-sm pointer-events-none select-none">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <h4 className="text-red-200 font-medium">Avoid: <span className="text-white font-bold text-lg">Scorpios</span></h4>
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                            &quot;They will ruin your life and steal your cat.&quot;
                        </p>
                    </div>
                </div>
              </ShareToUnlock>
            ) : (
              <div className="bg-red-900/10 rounded-lg p-4 border border-red-500/20 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <h4 className="text-red-200 font-medium">Avoid: <span className="text-white font-bold text-lg">{result?.worst_match}</span></h4>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                      &quot;{result?.worst_reason}&quot;
                  </p>
              </div>
            )}
        </div>
        
        <div className="flex justify-center pt-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGenerate}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Realign Stars
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useEffect } from 'react';
import { useAiWingman, NemesisResponse } from '@/lib/hooks/use-ai-wingman';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, Skull, Share2, Copy, RefreshCw, Atom, Zap, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ShareToUnlock } from '@/components/viral/ShareToUnlock';

interface NemesisFinderProps {
  userId?: string;
}

export function NemesisFinder({ userId }: NemesisFinderProps) {
  const { findNemesis } = useAiWingman();
  const { toast } = useToast();
  const [result, setResult] = React.useState<NemesisResponse | null>(null);
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  // Check local storage for unlock status on mount
  useEffect(() => {
    if (userId) {
      const unlocked = localStorage.getItem(`fwber_unlocked_nemesis_${userId}`);
      if (unlocked === 'true') {
        setIsUnlocked(true);
      }
    }
  }, [userId]);

  const handleUnlock = () => {
    setIsUnlocked(true);
    if (userId) {
      localStorage.setItem(`fwber_unlocked_nemesis_${userId}`, 'true');
    }
  };

  const handleGenerate = async () => {
    try {
      const data = await findNemesis.mutateAsync();
      setResult(data);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCopy = () => {
    if (result) {
      const text = `🧪 My Scientific Nemesis:\n\n⚠️ Type: ${result.nemesis_type}\n🧬 Clashing Traits: ${result.clashing_traits.join(', ')}\n💥 Why we'd fail: "${result.why_it_would_fail}"\n🔬 Science says: "${result.scientific_explanation}"`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Warn the world about your nemesis!",
      });
    }
  };

  const handleShare = async () => {
    if (result && navigator.share) {
      const text = `🧪 My Scientific Nemesis:\n\n⚠️ Type: ${result.nemesis_type}\n🧬 Clashing Traits: ${result.clashing_traits.join(', ')}\n💥 Why we'd fail: "${result.why_it_would_fail}"\n🔬 Science says: "${result.scientific_explanation}"`;
      try {
        await navigator.share({
          title: 'My fwber Scientific Nemesis',
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

  if (!result && !findNemesis.isPending) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-emerald-900 border-emerald-500/30">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-full bg-emerald-500/20 animate-pulse">
            <FlaskConical className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Scientific Nemesis</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use advanced &quot;science&quot; to find your absolute worst match.
            </p>
          </div>
          <Button 
            onClick={handleGenerate} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full"
          >
            <Atom className="w-4 h-4 mr-2" />
            Run Simulation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (findNemesis.isPending) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-muted-foreground animate-pulse">
            Calculating incompatibility vectors...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] border-emerald-500/50 shadow-emerald-500/20">
      <CardHeader className="bg-emerald-900/20 border-emerald-900/30 border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            Nemesis Identified
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
        <div className="space-y-4">
            {/* Nemesis Type */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center p-2 bg-red-500/10 rounded-full mb-2">
                    <Skull className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white">{result?.nemesis_type}</h3>
                <p className="text-xs text-emerald-400 uppercase tracking-wider mt-1">Threat Level: Maximum</p>
            </div>

            {/* Clashing Traits */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Incompatible Traits
                </h4>
                <div className="flex flex-wrap gap-2">
                    {result?.clashing_traits.map((trait, i) => (
                        <span key={i} className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded border border-red-500/20">
                            {trait}
                        </span>
                    ))}
                </div>
            </div>

            {/* Analysis - GATED BEHIND SHARE */}
            {!isUnlocked ? (
              <ShareToUnlock
                targetId={userId || 'me'}
                title="Unlock the Scientific Truth"
                description="Share to reveal the brutal scientific explanation of why you will fail!"
                onUnlock={handleUnlock}
              >
                <div className="space-y-3 cursor-pointer group">
                    <div className="bg-emerald-900/5 rounded-lg p-3 border border-emerald-500/10 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center transition-opacity group-hover:bg-black/50">
                             <Lock className="w-6 h-6 text-emerald-400 mb-2 animate-pulse" />
                             <h4 className="text-white font-bold text-sm mb-1">Unlock the Analysis</h4>
                             <Button size="sm" variant="outline" className="mt-2 pointer-events-none border-emerald-500/50 text-emerald-400 hover:text-emerald-300">
                                Share to Read
                             </Button>
                        </div>
                        
                        <div className="opacity-30 blur-sm pointer-events-none select-none">
                            <h4 className="text-emerald-300 font-medium text-sm mb-1">Hypothesis:</h4>
                            <p className="text-sm text-muted-foreground italic">
                                &quot;You will fight over the thermostat setting until one of you leaves.&quot;
                            </p>
                            <div className="mt-3">
                                <h4 className="text-blue-300 font-medium text-sm mb-1">Scientific Basis:</h4>
                                <p className="text-sm text-muted-foreground">
                                    Thermodynamic incompatibility suggests a 99% failure rate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
              </ShareToUnlock>
            ) : (
                <div className="space-y-3 animate-in fade-in duration-500">
                    <div className="bg-emerald-900/10 rounded-lg p-3 border border-emerald-500/20">
                        <h4 className="text-emerald-300 font-medium text-sm mb-1">Hypothesis:</h4>
                        <p className="text-sm text-muted-foreground italic">
                            &quot;{result?.why_it_would_fail}&quot;
                        </p>
                    </div>
                    <div className="bg-blue-900/10 rounded-lg p-3 border border-blue-500/20">
                        <h4 className="text-blue-300 font-medium text-sm mb-1">Scientific Basis:</h4>
                        <p className="text-sm text-muted-foreground">
                            {result?.scientific_explanation}
                        </p>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex justify-center pt-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGenerate}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalculate
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

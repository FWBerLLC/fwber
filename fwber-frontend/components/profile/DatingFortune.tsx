import React from 'react';
import { useAiWingman, FortuneResponse } from '@/lib/hooks/use-ai-wingman';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Share2, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function DatingFortune() {
  const { predictFortune } = useAiWingman();
  const { toast } = useToast();
  const [result, setResult] = React.useState<FortuneResponse | null>(null);

  const handleGenerate = async () => {
    try {
      const data = await predictFortune.mutateAsync();
      setResult(data);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleCopy = () => {
    if (result) {
      const text = `🔮 My Dating Fortune:\n\n"${result.fortune}"`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Share your fortune with friends!",
      });
    }
  };

  const handleShare = async () => {
    if (result && navigator.share) {
      const text = `🔮 My Dating Fortune:\n\n"${result.fortune}"`;
      try {
        await navigator.share({
          title: 'My fwber Dating Fortune',
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

  if (!result && !predictFortune.isPending) {
    return (
      <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-full bg-indigo-500/20 animate-pulse">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Dating Fortune</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Consult the AI Oracle for a glimpse into your romantic future.
            </p>
          </div>
          <Button 
            onClick={handleGenerate} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Reveal My Fortune
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (predictFortune.isPending) {
    return (
      <Card className="dark:bg-background dark:border-border">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-muted-foreground animate-pulse">
            Gazing into the crystal ball...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-background overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] border-indigo-500/50 shadow-indigo-500/20">
      <CardHeader className="bg-indigo-900/20 border-indigo-900/30 border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Your Fortune
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
        <div className="text-center py-4">
            <p className="text-xl font-serif italic text-indigo-200 leading-relaxed">
                &quot;{result?.fortune}&quot;
            </p>
        </div>
        
        <div className="flex justify-center pt-2">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGenerate}
                className="text-indigo-500 hover:text-indigo-400 hover:bg-indigo-900/20"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Consult Oracle Again
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { useAiWingman } from '@/lib/hooks/use-ai-wingman';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Flame, Share2, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ProfileRoast() {
  const { roastProfile } = useAiWingman();
  const { toast } = useToast();
  const [content, setContent] = React.useState<string | null>(null);
  const [shareId, setShareId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'roast' | 'hype'>('roast');

  const handleGenerate = async () => {
    try {
      const result = await roastProfile.mutateAsync(mode);
      setContent(result.roast);
      setShareId(result.share_id || null);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Reset content when mode changes
  React.useEffect(() => {
    setContent(null);
    setShareId(null);
  }, [mode]);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: `Share this ${mode} with your friends!`,
      });
    }
  };

  const handleShare = async () => {
    if (content && navigator.share) {
      try {
        const url = shareId 
          ? `${window.location.origin}/share/${shareId}`
          : window.location.origin;
          
        await navigator.share({
          title: `My fwber Profile ${mode === 'roast' ? 'Roast' : 'Hype'}`,
          text: content,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  const isRoast = mode === 'roast';
  const Icon = isRoast ? Flame : Sparkles;
  const title = isRoast ? 'Roast My Profile' : 'Hype Me Up';
  const description = isRoast 
    ? "Brave enough? Let our AI Roast Master humble you." 
    : "Need a confidence boost? Let our AI Hype Man gas you up.";
  const buttonText = isRoast ? 'Roast Me!' : 'Hype Me!';

  if (!content && !roastProfile.isPending) {
    return (
      <Card className={`bg-gradient-to-br ${isRoast ? 'from-orange-900/50 to-red-900/50 border-orange-500/30' : 'from-blue-900/50 to-cyan-900/50 border-blue-500/30'}`}>
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'roast' | 'hype')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/20">
              <TabsTrigger value="roast">Roast 🔥</TabsTrigger>
              <TabsTrigger value="hype">Hype ✨</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className={`p-3 rounded-full animate-pulse ${isRoast ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
            <Icon className={`w-8 h-8 ${isRoast ? 'text-orange-400' : 'text-blue-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          </div>
          <Button 
            onClick={handleGenerate} 
            className={`${isRoast ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold w-full`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {buttonText}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (roastProfile.isPending) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className={`w-8 h-8 animate-spin ${isRoast ? 'text-orange-500' : 'text-blue-500'}`} />
          <p className="text-muted-foreground animate-pulse">
            {isRoast ? 'Preparing the burn...' : 'Generating hype...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-900 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] ${isRoast ? 'border-orange-500/50 shadow-orange-500/20' : 'border-blue-500/50 shadow-blue-500/20'}`}>
      <CardHeader className={`${isRoast ? 'bg-orange-900/20 border-orange-900/30' : 'bg-blue-900/20 border-blue-900/30'} border-b pb-4`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Icon className={`w-5 h-5 ${isRoast ? 'text-orange-500' : 'text-blue-500'}`} />
            Your {isRoast ? 'Roast' : 'Hype'}
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
        <div className={`bg-black/40 rounded-lg p-4 border ${isRoast ? 'border-orange-500/20' : 'border-blue-500/20'}`}>
          <p className="text-gray-200 italic leading-relaxed font-medium">
            &quot;{content}&quot;
          </p>
        </div>
        
        <div className="flex justify-center pt-2 gap-3">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setContent(null)}
                className="text-muted-foreground hover:text-white"
            >
                Switch Mode
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleGenerate}
                className={`${isRoast ? 'text-orange-500 hover:text-orange-400 hover:bg-orange-900/20' : 'text-blue-500 hover:text-blue-400 hover:bg-blue-900/20'}`}
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Again
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
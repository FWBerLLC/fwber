import React from 'react';
import { useAiWingman, VibeCheckResponse, QuirkCheckResponse } from '@/lib/hooks/use-ai-wingman';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Flag, Share2, Copy, RefreshCw, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function VibeCheck() {
  const { checkVibe, checkQuirk } = useAiWingman();
  const { toast } = useToast();
  const [vibeResult, setVibeResult] = React.useState<VibeCheckResponse | null>(null);
  const [quirkResult, setQuirkResult] = React.useState<QuirkCheckResponse | null>(null);
  const [quirkInput, setQuirkInput] = React.useState('');

  const handleGenerateVibe = async () => {
    try {
      const data = await checkVibe.mutateAsync();
      setVibeResult(data);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleAnalyzeQuirk = async () => {
    if (!quirkInput.trim()) return;
    try {
      const data = await checkQuirk.mutateAsync(quirkInput);
      setQuirkResult(data);
    } catch (error) {
        // Error is handled by the hook
    }
  };

  const handleCopyVibe = () => {
    if (vibeResult) {
      const greens = (vibeResult.green_flags || []).map(f => `- ${f}`).join('\n');
      const reds = (vibeResult.red_flags || []).map(f => `- ${f}`).join('\n');
      const text = `My Vibe Check:\n\n🟢 Green Flags:\n${greens}\n\n🚩 Red Flags:\n${reds}`;
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Share your vibe check with friends!",
      });
    }
  };

  const handleCopyQuirk = () => {
    if (quirkResult) {
        const text = `Quirk Check: "${quirkInput}"\n\nResult: ${quirkResult.emoji} ${quirkResult.flag_type}\nReason: ${quirkResult.reason}`;
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to clipboard",
            description: "Share your quirk analysis!",
        });
    }
  };

  const handleShareVibe = async () => {
    if (vibeResult && navigator.share) {
      const greens = (vibeResult.green_flags || []).map(f => `- ${f}`).join('\n');
      const reds = (vibeResult.red_flags || []).map(f => `- ${f}`).join('\n');
      const text = `My Vibe Check:\n\n🟢 Green Flags:\n${greens}\n\n🚩 Red Flags:\n${reds}`;
      try {
        const url = vibeResult.share_id 
          ? `${window.location.origin}/share/${vibeResult.share_id}`
          : window.location.origin;

        await navigator.share({
          title: 'My fwber Vibe Check',
          text: text,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyVibe();
    }
  };

  const handleShareQuirk = async () => {
    if (quirkResult && navigator.share) {
        const text = `Quirk Check: "${quirkInput}"\n\nResult: ${quirkResult.emoji} ${quirkResult.flag_type}\nReason: ${quirkResult.reason}`;
        try {
            const url = quirkResult.share_id 
              ? `${window.location.origin}/share/${quirkResult.share_id}`
              : window.location.origin;
    
            await navigator.share({
              title: 'fwber Quirk Check',
              text: text,
              url: url,
            });
          } catch (err) {
            console.error('Error sharing:', err);
          }
    } else {
        handleCopyQuirk();
    }
  };

  return (
    <Card className="dark:bg-background overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] border-purple-500/50 shadow-purple-500/20">
      <Tabs defaultValue="vibe" className="w-full">
        <div className="bg-purple-900/20 border-purple-900/30 border-b p-4">
            <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    <Flag className="w-5 h-5 text-purple-500" />
                    Flag Checker
                </CardTitle>
            </div>
            <TabsList className="grid w-full grid-cols-2 bg-purple-900/40">
                <TabsTrigger value="vibe">Profile Vibe</TabsTrigger>
                <TabsTrigger value="quirk">Quirk Check</TabsTrigger>
            </TabsList>
        </div>

        <CardContent className="p-6">
            <TabsContent value="vibe" className="space-y-6 mt-0">
                {!vibeResult ? (
                    <div className="flex flex-col items-center text-center space-y-4 py-4">
                        {checkVibe.isPending ? (
                             <>
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                <p className="text-muted-foreground animate-pulse">Analyzing your vibes...</p>
                             </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                Are you a walking green flag or a red flag factory? Let AI decide.
                                </p>
                                <Button 
                                    onClick={handleGenerateVibe} 
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full"
                                >
                                    <Flag className="w-4 h-4 mr-2" />
                                    Check My Vibe
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h4 className="text-green-400 font-medium flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Green Flags
                                </h4>
                                <ul className="space-y-2">
                                    {(vibeResult.green_flags || []).map((flag, i) => (
                                        <li key={i} className="bg-green-900/20 border border-green-500/20 rounded px-3 py-2 text-sm text-green-100">
                                            {flag}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-red-400 font-medium flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Red Flags
                                </h4>
                                <ul className="space-y-2">
                                    {(vibeResult.red_flags || []).map((flag, i) => (
                                        <li key={i} className="bg-red-900/20 border border-red-500/20 rounded px-3 py-2 text-sm text-red-100">
                                            {flag}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                            <Button variant="ghost" size="sm" onClick={() => setVibeResult(null)} className="text-muted-foreground hover:text-white">
                                <RefreshCw className="w-4 h-4 mr-2" /> Reset
                            </Button>
                             <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={handleCopyVibe} title="Copy">
                                    <Copy className="w-4 h-4 text-muted-foreground hover:text-white" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleShareVibe} title="Share">
                                    <Share2 className="w-4 h-4 text-muted-foreground hover:text-white" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="quirk" className="space-y-6 mt-0">
                {!quirkResult ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                What&apos;s your quirk?
                            </label>
                            <Textarea
                                placeholder="I clap when the plane lands..."
                                value={quirkInput}
                                onChange={(e) => setQuirkInput(e.target.value)}
                                className="dark:bg-card dark:border-border min-h-[100px]"
                            />
                        </div>
                        <Button 
                            onClick={handleAnalyzeQuirk} 
                            disabled={!quirkInput.trim() || checkQuirk.isPending}
                            className="bg-pink-600 hover:bg-pink-700 text-white font-bold w-full"
                        >
                            {checkQuirk.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <MessageSquare className="w-4 h-4 mr-2" />
                            )}
                            Check Quirk
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center p-6 dark:bg-card/50 rounded-lg border dark:border-border">
                            <div className="text-4xl mb-2">{quirkResult.emoji}</div>
                            <h3 className={`text-xl font-bold mb-2 ${
                                quirkResult.flag_type === 'Green Flag' ? 'text-green-400' :
                                quirkResult.flag_type === 'Red Flag' ? 'text-red-400' :
                                'text-amber-400'
                            }`}>
                                {quirkResult.flag_type}
                            </h3>
                            <p className="text-muted-foreground italic">
                                &quot;{quirkResult.reason}&quot;
                            </p>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                            <Button variant="ghost" size="sm" onClick={() => setQuirkResult(null)} className="text-muted-foreground hover:text-white">
                                <RefreshCw className="w-4 h-4 mr-2" /> Check Another
                            </Button>
                             <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={handleCopyQuirk} title="Copy">
                                    <Copy className="w-4 h-4 text-muted-foreground hover:text-white" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleShareQuirk} title="Share">
                                    <Share2 className="w-4 h-4 text-muted-foreground hover:text-white" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}


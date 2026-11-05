"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { roastProfile, roastPublic } from "@/lib/api/content-generation"; // Updated import
import { Flame, Share2, Sparkles, RefreshCw, User, Briefcase, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function RoastPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [mode, setMode] = useState<"roast" | "hype">("roast");
  
  // Public/Guest State
  const [isGuest, setIsGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: "",
    job: "",
    trait: ""
  });

  const handleGenerate = async () => {
    // Basic validation for guests
    if (isGuest && (!guestForm.name || !guestForm.job || !guestForm.trait)) {
      toast({
        title: "Missing Info",
        description: "We need a little ammo to roast you properly.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setShareId(null);

    try {
      let response;
      if (isGuest) {
        response = await roastPublic(guestForm.name, guestForm.job, guestForm.trait, mode);
      } else {
        response = await roastProfile(mode);
      }
      
      setResult(response.roast);
      
      if (response.share_id) {
        setShareId(response.share_id);
      } else if (response.is_preview) {
        // Handle guest preview mode (no permanent share ID yet)
        setShareId(null); 
      }

    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Instead of hard redirect, switch to Guest Mode UI
        setIsGuest(true);
        toast({
          title: "Not Logged In",
          description: "Switching to Guest Mode. Enter your details manually!",
        });
      } else if (error?.response?.status === 429) {
        toast({
            title: "Whoa there!",
            description: "You&apos;re roasting too hard. Cool down for a minute.",
            variant: "destructive",
          });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong. The AI might be too stunned to speak.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard.",
    });
  };

  const handleShare = () => {
    if (!shareId && isGuest) {
         toast({
            title: "Sign Up Required",
            description: "You need an account to create a permanent share link!",
            action: <Link href="/register" className="underline font-bold">Sign Up</Link>
          });
        return;
    }
    if (!shareId) return;
    
    const shareUrl = `${window.location.origin}/share/${shareId}`;
    navigator.clipboard.writeText(`Check out my fwber ${mode}! \n\n"${result}"\n\nSee it here: ${shareUrl}`);
    toast({
      title: "Share Link Copied!",
      description: "Link and text copied to clipboard. Go post it!",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-purple-900 text-white p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-2 text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 drop-shadow-sm"
          >
            <Flame className="w-12 h-12 md:w-20 md:h-20 text-orange-500" />
            ROAST ME
          </motion.div>
          <p className="text-lg md:text-xl text-orange-100/80 font-medium">
            Let our AI destroy your ego (or boost it).
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-black/40 backdrop-blur-xl border-orange-500/30 shadow-2xl overflow-hidden">
          <CardHeader>
            <Tabs defaultValue="roast" className="w-full" onValueChange={(v) => setMode(v as "roast" | "hype")}>
              <TabsList className="grid w-full grid-cols-2 bg-black/40">
                <TabsTrigger value="roast" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold">
                  <Flame className="w-4 h-4 mr-2" />
                  ROAST ME
                </TabsTrigger>
                <TabsTrigger value="hype" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold">
                  <Sparkles className="w-4 h-4 mr-2" />
                  HYPE ME UP
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-6 p-6 min-h-[300px] flex flex-col justify-center items-center">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <RefreshCw className="w-12 h-12 animate-spin text-orange-500 mx-auto" />
                  <p className="text-xl font-mono text-orange-200 animate-pulse">
                    Scanning your questionable life choices...
                  </p>
                </motion.div>
              ) : result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-4"
                >
                  <div className="relative group cursor-pointer" onClick={copyToClipboard}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                    <div className="relative bg-black/60 p-6 md:p-8 rounded-lg border border-white/10">
                      <p className="text-xl md:text-2xl font-serif italic leading-relaxed text-white/90 text-center">
                        &quot;{result}&quot;
                      </p>
                      <div className="mt-4 flex justify-center opacity-50 text-xs uppercase tracking-widest text-white/50">
                        Generated by fwber AI
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                     <div className="flex gap-4 justify-center">
                        <Button onClick={copyToClipboard} variant="outline" className="border-white/20 hover:bg-card dark:dark:bg-card/10 text-white hover:text-black">
                        Copy Text
                        </Button>
                        <Button onClick={handleShare} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
                        <Share2 className="w-4 h-4 mr-2" />
                        {isGuest ? 'Share (Requires Signup)' : 'Share Result'}
                        </Button>
                     </div>
                     {isGuest && (
                         <div className="bg-blue-900/30 border border-blue-500/30 p-3 rounded-md text-center">
                             <p className="text-sm text-blue-200 mb-2">Want to save this and roast your friends?</p>
                             <Link href="/register">
                                <Button size="sm" variant="secondary" className="w-full">Create Free Account</Button>
                             </Link>
                         </div>
                     )}
                  </div>

                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full max-w-md mx-auto space-y-6"
                >
                  {isGuest ? (
                      <div className="space-y-4 bg-card dark:dark:bg-card/5 p-6 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2 text-orange-300 mb-2">
                              <AlertCircle className="w-5 h-5" />
                              <span className="text-sm font-bold uppercase tracking-wider">Guest Mode</span>
                          </div>
                          
                          <div className="space-y-2">
                              <Label htmlFor="name" className="text-white/70">Your Name</Label>
                              <div className="relative">
                                  <User className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                                  <Input 
                                    id="name" 
                                    placeholder="e.g. Alex" 
                                    className="pl-10 bg-black/40 border-white/20 text-white"
                                    value={guestForm.name}
                                    onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="job" className="text-white/70">Occupation</Label>
                              <div className="relative">
                                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                                  <Input 
                                    id="job" 
                                    placeholder="e.g. Graphic Designer" 
                                    className="pl-10 bg-black/40 border-white/20 text-white"
                                    value={guestForm.job}
                                    onChange={(e) => setGuestForm({...guestForm, job: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <Label htmlFor="trait" className="text-white/70">Worst Habit / Trait</Label>
                              <Input 
                                id="trait" 
                                placeholder="e.g. Always sends voice notes, Obsessed with crypto" 
                                className="bg-black/40 border-white/20 text-white"
                                value={guestForm.trait}
                                onChange={(e) => setGuestForm({...guestForm, trait: e.target.value})}
                              />
                          </div>
                      </div>
                  ) : (
                    <div className="text-center">
                        <div className="w-24 h-24 bg-card dark:dark:bg-card/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                            {mode === 'roast' ? (
                            <Flame className="w-12 h-12 text-red-500/50" />
                            ) : (
                            <Sparkles className="w-12 h-12 text-purple-500/50" />
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-white">Ready for the truth?</h3>
                        <p className="text-white/60 mt-2">
                            We&apos;ll analyze your profile details to generate a unique {mode === 'roast' ? 'roast' : 'hype message'}.
                        </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="bg-black/40 p-4 flex flex-col gap-3 justify-center">
            {!loading && !result && (
              <Button 
                size="lg" 
                onClick={handleGenerate}
                className={`w-full max-w-sm text-lg font-bold h-14 ${
                  mode === 'roast' 
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                }`}
              >
                {mode === 'roast' ? '🔥 ROAST ME' : '✨ HYPE ME UP'}
              </Button>
            )}
            
            {!loading && !result && !isGuest && (
                <Button 
                    variant="link" 
                    className="text-white/40 text-xs hover:text-white"
                    onClick={() => setIsGuest(true)}
                >
                    Or try manual entry mode (Guest)
                </Button>
            )}

            {!loading && result && (
               <Button 
               variant="ghost" 
               onClick={() => { setResult(null); setShareId(null); }}
               className="text-white/50 hover:text-white hover:bg-card dark:dark:bg-card/10 hover:text-black"
             >
               Go Again
             </Button>
            )}
          </CardFooter>
        </Card>

        {/* Footer/disclaimer */}
        <p className="text-center text-white/30 text-sm">
          By clicking &quot;Roast Me&quot;, you agree to not cry about it. <br/>
          Content generated by AI and may be unpredictable.
        </p>

      </div>
    </div>
  );
}

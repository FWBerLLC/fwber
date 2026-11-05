"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Flame, Share2, Copy, Sparkles, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export default function RoastDatePage() {
  const [name, setName] = useState("");
  const [trait, setTrait] = useState("");
  const [job, setJob] = useState("");
  const [roast, setRoast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!name || !trait || !job) {
      toast({
        title: "Missing Info",
        description: "Please fill in all fields to generate a proper roast.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setRoast(null);

    try {
      // Use the public roast endpoint
      const response = await apiClient.post<any>("/public/roast", {
        name,
        trait,
        job,
        mode: "roast",
      });

      // apiClient.post returns an object with { data: T, status: number }
      // The actual JSON response from the server is in the `data` property.
      setRoast(response.data.roast);

    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to generate roast. The AI might be too nice today.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (roast) {
      navigator.clipboard.writeText(roast);
      toast({
        title: "Copied!",
        description: "Roast copied to clipboard. Send it (if you dare).",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share && roast) {
      try {
        await navigator.share({
          title: `Roast of ${name}`,
          text: roast,
          url: window.location.href,
        });
      } catch {
        // User dismissed the share dialog
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-red-100 p-4 flex items-center justify-center">
      <Card className="max-w-md w-full shadow-2xl border-orange-200">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-black text-foreground dark:text-foreground">Roast Your Date</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            AI-powered savage comebacks & gentle teasing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!roast ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-muted-foreground">Their Name</label>
                <Input
                  placeholder="e.g. Brad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-card dark:bg-card"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-muted-foreground">What do they do?</label>
                <Input
                  placeholder="e.g. DJ / Entrepreneur"
                  value={job}
                  onChange={(e) => setJob(e.target.value)}
                  className="bg-card dark:bg-card"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground dark:text-muted-foreground">One Specific Trait / Flaw</label>
                <Textarea
                  placeholder="e.g. Never stops talking about crypto, wears sunglasses indoors..."
                  value={trait}
                  onChange={(e) => setTrait(e.target.value)}
                  className="bg-card dark:bg-card resize-none"
                  rows={3}
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-6 text-lg shadow-md transition-transform active:scale-95"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" /> Cooking...
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5 mr-2" /> Roast Them
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                For entertainment only. Be nice-ish.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-card dark:bg-card border-2 border-orange-100 rounded-xl p-6 shadow-inner relative">
                <Flame className="absolute -top-3 -right-3 w-8 h-8 text-orange-400 rotate-12" />
                <p className="text-lg font-medium text-foreground dark:text-foreground leading-relaxed italic">
                  &quot;{roast}&quot;
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => setRoast(null)}
                >
                  Try Again
                </Button>
                <Button
                  className="flex-1 dark:bg-background text-white hover:dark:bg-card"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

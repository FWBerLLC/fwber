import React from 'react';
import { useProfileAnalysis } from '@/lib/hooks/use-profile-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ThumbsUp, AlertTriangle, Lightbulb } from 'lucide-react';

export function ProfileAnalysis() {
  const { data, isLoading, error, refetch, isFetched } = useProfileAnalysis();

  if (!isFetched && !isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/30">
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-purple-500/20 rounded-full">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Profile Review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get instant feedback on your profile from our AI Wingman. Find out what&apos;s working and how to get more matches.
            </p>
          </div>
          <Button 
            onClick={() => refetch()} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Analyze My Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="dark:bg-background dark:border-border">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-muted-foreground animate-pulse">Analyzing your profile...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-800">
        <CardContent className="p-6 text-center">
          <p className="text-red-400">Failed to analyze profile. Please try again later.</p>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="mt-4 border-red-800 text-red-400 hover:bg-red-900/50"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="dark:bg-background dark:border-border overflow-hidden">
      <CardHeader className="dark:bg-card/50 border-b dark:border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Profile Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
              {data.score}/100
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Strengths */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4" />
            Strengths
          </h4>
          <ul className="space-y-2">
            {data.strengths.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-green-500/50 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Areas for Improvement
          </h4>
          <ul className="space-y-2">
            {data.weaknesses.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-orange-500/50 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Wingman Tips
          </h4>
          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4">
            <ul className="space-y-2">
              {data.tips.map((item, i) => (
                <li key={i} className="text-sm text-blue-200 flex items-start gap-2">
                  <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-400/50 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="pt-4 flex justify-center">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                className="text-muted-foreground hover:text-white"
            >
                Refresh Analysis
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { useMatchInsights } from '@/lib/hooks/use-match-insights';
import { useMatchNarrative } from '@/lib/hooks/use-match-narrative';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Activity, Heart, Brain, MessageCircle, Zap, Quote } from 'lucide-react';

interface MatchInsightsProps {
  matchId: string;
}

function ScoreBar({ label, score, color = "bg-blue-500" }: { label: string; score: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-foreground dark:text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{score}%</span>
      </div>
      <div className="h-2 bg-muted dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500 ease-out`} 
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function MatchInsights({ matchId }: MatchInsightsProps) {
  const { data, isLoading, error } = useMatchInsights(matchId);
  const { data: narrative, isLoading: narrativeLoading } = useMatchNarrative(matchId);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return null; // Hide if error or no data
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="w-full bg-card dark:bg-card border-border dark:border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Compatibility
          </span>
          <span className={`text-2xl font-bold ${getScoreColor(data.total_score)}`}>
            {data.total_score}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Breakdown */}
        <div className="space-y-3">
          <ScoreBar label="Overall Preferences" score={data.breakdown.preferences} color="bg-purple-500" />
          <ScoreBar label="Communication Style" score={data.breakdown.communication} color="bg-blue-500" />
          <ScoreBar label="Behavioral Match" score={data.breakdown.behavioral} color="bg-green-500" />
        </div>

        {/* Detailed Categories */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
              <Heart className="h-4 w-4 text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Physical</p>
              <p className="font-semibold text-sm">{data.details.physical}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Zap className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sexual</p>
              <p className="font-semibold text-sm">{data.details.sexual}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <Brain className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Personality</p>
              <p className="font-semibold text-sm">{data.details.personality}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <MessageCircle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lifestyle</p>
              <p className="font-semibold text-sm">{data.details.lifestyle}%</p>
            </div>
          </div>
        </div>

        {/* Narrative Compatibility Report (v2.1.9) */}
        <div className="pt-4 border-t border-gray-100 dark:border-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Quote className="h-3 w-3" />
            The Signal Breakdown
          </h4>
          {narrativeLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing digital soul-print...</span>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground dark:text-muted-foreground leading-relaxed font-serif">
              "{narrative || "The system is silent. Not enough data for a narrative report."}"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

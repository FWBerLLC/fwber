'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCircuit, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ConversationCoachProps {
  matchId: string;
  draft: string;
  onApplySuggestion: (suggestion: string) => void;
}

interface AnalysisResult {
  score: number;
  tone: string;
  feedback: string;
  suggestion: string | null;
}

export function ConversationCoach({ matchId, draft, onApplySuggestion }: ConversationCoachProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const analyzeDraft = async () => {
    if (!draft.trim()) return;
    
    setLoading(true);
    try {
      const result = await api.post<AnalysisResult>(`/wingman/message-feedback/${matchId}`, {
        draft: draft
      });
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-purple-400"
          title="AI Conversation Coach"
          disabled={!draft.trim()}
          onClick={() => {
             setIsOpen(true);
             analyzeDraft();
          }}
        >
          <BrainCircuit className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-gray-900 border-gray-700 text-white p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h4 className="font-semibold flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-purple-500" />
              Coach Feedback
            </h4>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Analyzing your message...
            </div>
          ) : analysis ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Score</span>
                <span className={`font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}/100
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tone</span>
                <span className="text-sm bg-gray-800 px-2 py-0.5 rounded text-gray-200">
                  {analysis.tone}
                </span>
              </div>

              <div className="bg-gray-800/50 p-2 rounded text-sm text-muted-foreground">
                {analysis.feedback}
              </div>

              {analysis.suggestion && (
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <span className="text-xs text-purple-400 uppercase font-bold">Suggestion</span>
                  <div className="bg-purple-900/20 p-2 rounded text-sm text-purple-100 italic">
                    &quot;{analysis.suggestion}&quot;
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      onApplySuggestion(analysis.suggestion!);
                      setIsOpen(false);
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Use Suggestion
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Click to analyze your draft message.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

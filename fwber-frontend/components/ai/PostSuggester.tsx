import React, { useState } from 'react';
import { useAIContent } from '@/lib/hooks/use-ai-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lightbulb, Plus } from 'lucide-react';

interface PostSuggesterProps {
  boardId: number;
  onSelectPost: (content: string) => void;
}

export function PostSuggester({ boardId, onSelectPost }: PostSuggesterProps) {
  const { generatePosts } = useAIContent();
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');

  const handleGenerate = () => {
    generatePosts.mutate({
      boardId,
      params: {
        topic,
        context
      }
    });
  };

  return (
    <Card className="w-full border-dashed bg-slate-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Stuck on what to post?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="topic" className="text-xs">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., Weekend plans"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="post-context" className="text-xs">Context</Label>
            <Input
              id="post-context"
              placeholder="e.g., Looking for hiking buddies"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Button 
          size="sm" 
          variant="secondary"
          className="w-full" 
          onClick={handleGenerate}
          disabled={generatePosts.isPending}
          data-testid="post-suggestions"
        >
          {generatePosts.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
          ) : (
            <Plus className="h-3 w-3 mr-2" />
          )}
          Generate Ideas
        </Button>

        {generatePosts.data && (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {(generatePosts.data.suggestions || []).map((suggestion) => (
              <div
                key={suggestion.id || Math.random().toString()}
                className="bg-card dark:bg-card p-3 rounded border text-sm hover:border-blue-300 cursor-pointer transition-all shadow-sm"
                onClick={() => onSelectPost(suggestion.content)}
                data-testid="suggestion-item"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-xs text-slate-500" data-testid="relevance-score">
                    {Math.round((suggestion.confidence || 0) * 100)}% Match
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-xs px-2"
                    data-testid="use-suggestion"
                  >
                    Use
                  </Button>
                </div>
                <div data-testid="suggestion-content">
                  {suggestion.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

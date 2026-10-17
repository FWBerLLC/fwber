"use client";

import { useState } from 'react';
import { useConversationStartersGeneration } from '@/lib/hooks/use-content-generation';

export default function ConversationStarters() {
  const [type, setType] = useState<'general' | 'romantic' | 'casual' | 'professional'>('casual');
  const [interests, setInterests] = useState('');
  const [hints, setHints] = useState('');
  const [copiedContent, setCopiedContent] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useConversationStartersGeneration({
    context: {
      type,
      target_user: {
        id: 0, // Placeholder
        name: 'Target User',
        interests: interests.split(',').map(i => i.trim()).filter(Boolean),
      },
      hints: hints.split(',').map(h => h.trim()).filter(Boolean),
    }
  }, { enabled: false });

  const handleGenerate = () => {
    refetch();
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedContent(content);
    setTimeout(() => setCopiedContent(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Conversation Starters</h2>
        <p className="text-gray-600">
          Generate engaging icebreakers tailored to your conversation context.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Conversation Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                data-testid="conversation-type"
                aria-label="Conversation Type"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="casual">Casual</option>
                <option value="romantic">Romantic</option>
                <option value="professional">Professional</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Target Interests (comma separated)</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                data-testid="target-interests"
                placeholder="e.g. travel, music, food"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Context Hints</label>
              <textarea
                value={hints}
                onChange={(e) => setHints(e.target.value)}
                data-testid="conversation-hints"
                placeholder="Any specific context or shared experiences..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <button type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Generating...' : 'Generate Starters (5 🪙)'}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">
                Generating conversation starters costs 5 tokens.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8" data-testid="conversation-loading">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Generating conversation starters...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-600">Failed to generate starters. Please try again.</p>
            </div>
          )}

          {data?.data?.suggestions?.map((suggestion: any, index: number) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700" data-testid="conversation-starter">
              <p className="text-gray-800 dark:text-gray-100 mb-3" data-testid="starter-content">{suggestion.content}</p>
              
              <div className="flex justify-between items-center">
                <div className="flex space-x-3 text-sm text-gray-500">
                  <span data-testid="engagement-score">Engagement: {Math.round((suggestion.confidence || 0.8) * 100)}%</span>
                </div>
                
                <button type="button"
                  onClick={() => handleCopy(suggestion.content)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {copiedContent === suggestion.content ? (
                    <span className="text-green-600" data-testid="copied-starter">Copied!</span>
                  ) : (
                    'Use This'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

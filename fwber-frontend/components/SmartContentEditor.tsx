"use client";

import { useState, useEffect } from 'react';
import { useContentOptimization, useContentQualityAnalysis, useContentImprovementSuggestions } from '@/lib/hooks/use-content-generation';
import { useAuth } from '@/lib/auth-context';

interface SmartContentEditorProps {
  initialContent?: string;
  onContentChange: (content: string) => void;
  context?: any;
  placeholder?: string;
  maxLength?: number;
  enableOptimization?: boolean;
  enableQualityAnalysis?: boolean;
  showSuggestions?: boolean;
}

export default function SmartContentEditor({
  initialContent = '',
  onContentChange,
  context,
  placeholder = 'Start typing...',
  maxLength = 500,
  enableOptimization = true,
  enableQualityAnalysis = true,
  showSuggestions = true,
}: SmartContentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showOptimization, setShowOptimization] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const { user } = useAuth();
  const optimizeContent = useContentOptimization();
  const { data: qualityAnalysis, isLoading: isAnalyzing } = useContentQualityAnalysis(content);
  const { data: improvementSuggestions, isLoading: isAnalyzingSuggestions } = useContentImprovementSuggestions(content);

  useEffect(() => {
    onContentChange(content);
  }, [content, onContentChange]);

  const handleOptimize = async () => {
    if (!content.trim()) return;
    
    setIsOptimizing(true);
    try {
      const result = await optimizeContent.mutateAsync({ 
        content, 
        context,
        optimization_types: ['engagement', 'clarity', 'safety', 'relevance']
      });
      if (result.data.optimized) {
        setContent(result.data.optimized);
        setShowOptimization(false);
      }
    } catch (error) {
      console.error('Content optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setContent(suggestion);
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-4" data-testid="smart-editor">
      {/* Content Editor */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          data-testid="content-textarea"
          className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
        />
        
        {/* Character Count */}
        <div className="absolute bottom-2 right-2 text-sm text-gray-500" data-testid="character-count">
          {content.length}/{maxLength}
        </div>
      </div>

      {/* Quality Analysis */}
      {enableQualityAnalysis && content.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg" data-testid="quality-analysis">
          <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-100">Content Quality Analysis</h3>
          {isAnalyzing ? (
            <div className="text-center py-2">Analyzing content...</div>
          ) : qualityAnalysis ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getQualityColor(qualityAnalysis.readability)}`} data-testid="readability-score">
                  {Math.round(qualityAnalysis.readability * 100)}%
                </div>
                <div className="text-sm text-gray-600">Readability</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getQualityColor(qualityAnalysis.engagement)}`} data-testid="engagement-score">
                  {Math.round(qualityAnalysis.engagement * 100)}%
                </div>
                <div className="text-sm text-gray-600">Engagement</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getQualityColor(qualityAnalysis.clarity)}`} data-testid="clarity-score">
                  {Math.round(qualityAnalysis.clarity * 100)}%
                </div>
                <div className="text-sm text-gray-600">Clarity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100" data-testid="safety-score">
                  {Math.round(qualityAnalysis.safety * 100)}%
                </div>
                <div className="text-sm text-gray-600">Safety</div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Improvement Suggestions */}
      {showSuggestions && content.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg" data-testid="improvement-suggestions">
          <h3 className="font-semibold mb-3 text-blue-800">Improvement Suggestions</h3>
          {isAnalyzingSuggestions ? (
            <div className="text-center py-2">Analyzing suggestions...</div>
          ) : improvementSuggestions && improvementSuggestions.length > 0 ? (
            <div className="space-y-2">
              {improvementSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2" data-testid="suggestion-item">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-blue-700">{suggestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-blue-600">Your content looks great! No suggestions at this time.</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {enableOptimization && (
          <button type="button"
            onClick={() => setShowOptimization(!showOptimization)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {showOptimization ? 'Hide' : 'Show'} Optimization
          </button>
        )}
        
        {enableOptimization && (
          <div className="flex flex-col items-center">
            <button type="button"
              onClick={handleOptimize}
              disabled={!content.trim() || isOptimizing}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isOptimizing ? (
                <span data-testid="optimization-loading">Optimizing...</span>
              ) : 'Optimize Content (10 🪙)'}
            </button>
            <span className="text-xs text-gray-500 mt-1">Cost: 10 Tokens</span>
          </div>
        )}
        
        <button type="button"
          onClick={() => setContent('')}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Optimization Results */}
      {optimizeContent.data && (
        <div className="bg-green-50 p-4 rounded-lg" data-testid="optimized-content">
          <h3 className="font-semibold text-green-800 mb-2">Optimization Complete</h3>
          <div className="text-sm text-green-700">
            <p>Overall Score: {Math.round(optimizeContent.data.data.overall_score * 100)}%</p>
            <p>Improvements: {Object.keys(optimizeContent.data.data.improvements).join(', ')}</p>
          </div>
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-green-200">
             <p className="text-gray-800 dark:text-gray-100" data-testid="optimized-text">{optimizeContent.data.data.optimized}</p>
          </div>
          <button type="button" 
            onClick={() => setContent(optimizeContent.data.data.optimized)}
            className="mt-2 text-sm font-medium text-green-700 hover:text-green-900"
          >
            Apply Optimization
          </button>
        </div>
      )}

      {/* Optimization Error */}
      {optimizeContent.error && (
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Optimization Failed</h3>
          <p className="text-sm text-red-700">
            {optimizeContent.error.message || 'An error occurred during optimization.'}
          </p>
        </div>
      )}

      {/* Content Preview */}
      {content.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Content Preview</h3>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

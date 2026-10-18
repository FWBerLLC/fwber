"use client";

import { useState } from 'react';
import { useProfileContentGeneration, useContentFeedback } from '@/lib/hooks/use-content-generation';
import { useAuth } from '@/lib/auth-context';

interface AIProfileBuilderProps {
  onProfileGenerated?: (profile: any) => void;
  initialPreferences?: {
    personality?: string;
    interests?: string[];
    goals?: string;
    style?: string;
    target_audience?: string;
  };
}

export default function AIProfileBuilder({ 
  onProfileGenerated,
  initialPreferences = {}
}: AIProfileBuilderProps) {
  const [preferences, setPreferences] = useState({
    personality: initialPreferences.personality || '',
    interests: initialPreferences.interests || [],
    goals: initialPreferences.goals || '',
    style: initialPreferences.style || 'casual',
    target_audience: initialPreferences.target_audience || '',
  });
  
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { user } = useAuth();
  const { data: generatedContent, isLoading, error, refetch } = useProfileContentGeneration({
    ...preferences,
    style: (['casual','professional','humorous','romantic'] as readonly string[]).includes(preferences.style)
      ? (preferences.style as 'casual' | 'professional' | 'humorous' | 'romantic')
      : undefined,
  }, { enabled: false });
  const feedbackMutation = useContentFeedback();

  const handleGenerateProfile = async () => {
    setIsGenerating(true);
    try {
      await refetch();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentSelect = (content: string) => {
    setSelectedContent(content);
    if (onProfileGenerated) {
      onProfileGenerated({
        content,
        preferences,
        generated_at: new Date().toISOString(),
      });
    }
  };

  const [feedbackSubmitted, setFeedbackSubmitted] = useState<string | null>(null);

  const handleFeedback = async (contentId: string, rating: number, feedback?: string) => {
    try {
      await feedbackMutation.mutateAsync({
        content_id: contentId,
        content_type: 'profile',
        rating,
        feedback,
      });
      setFeedbackSubmitted(contentId);
      setTimeout(() => setFeedbackSubmitted(null), 3000);
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };

  const personalityTypes = [
    { value: 'extroverted', label: 'Extroverted & Social', description: 'Outgoing and energetic' },
    { value: 'introverted', label: 'Introverted & Thoughtful', description: 'Reflective and deep' },
    { value: 'adventurous', label: 'Adventurous & Spontaneous', description: 'Love new experiences' },
    { value: 'analytical', label: 'Analytical & Logical', description: 'Thoughtful and methodical' },
    { value: 'creative', label: 'Creative & Artistic', description: 'Imaginative and expressive' },
    { value: 'athletic', label: 'Athletic & Active', description: 'Sports and fitness focused' },
  ];

  const interestOptions = [
    'Travel', 'Music', 'Sports', 'Art', 'Technology', 'Food', 'Fitness', 'Reading',
    'Movies', 'Gaming', 'Photography', 'Cooking', 'Dancing', 'Hiking', 'Yoga', 'Writing'
  ];

  const styleOptions = [
    { value: 'casual', label: 'Casual', description: 'Relaxed and friendly' },
    { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
    { value: 'humorous', label: 'Humorous', description: 'Funny and light-hearted' },
    { value: 'romantic', label: 'Romantic', description: 'Sweet and affectionate' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground dark:text-foreground mb-2">AI-Powered Profile Builder</h1>
        <p className="text-muted-foreground">Let AI help you create an engaging and authentic profile</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preferences Form */}
        <div className="space-y-6">
          <div className="bg-card dark:bg-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-foreground">Tell us about yourself</h2>
            
            {/* Personality Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-foreground dark:text-muted-foreground">Personality Type</label>
              <div className="grid grid-cols-1 gap-3">
                {personalityTypes.map(type => (
                  <label key={type.value} className="flex items-start space-x-3 p-3 border border-border dark:border-border rounded-lg cursor-pointer hover:bg-muted dark:bg-background">
                    <input
                      type="radio"
                      name="personality"
                      value={type.value}
                      data-testid={`personality-${type.value}`}
                      checked={preferences.personality === type.value}
                      onChange={(e) => setPreferences(prev => ({ ...prev, personality: e.target.value }))}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-foreground dark:text-foreground">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-foreground dark:text-muted-foreground">Interests</label>
              <div className="grid grid-cols-2 gap-2">
                {interestOptions.map(interest => (
                  <label key={interest} className="flex items-center space-x-2 p-2 border border-border dark:border-border rounded cursor-pointer hover:bg-muted dark:bg-background">
                    <input
                      type="checkbox"
                      data-testid={`interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                      checked={Array.isArray(preferences.interests) && preferences.interests.includes(interest)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPreferences(prev => ({
                            ...prev,
                            interests: [...prev.interests, interest]
                          }));
                        } else {
                          setPreferences(prev => ({
                            ...prev,
                            interests: prev.interests.filter(i => i !== interest)
                          }));
                        }
                      }}
                    />
                    <span className="text-sm text-foreground dark:text-muted-foreground">{interest}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">What are you looking for?</label>
              <textarea
                value={preferences.goals}
                onChange={(e) => setPreferences(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="Describe what you're looking for in a relationship..."
                data-testid="goals-textarea"
                className="w-full p-3 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Writing Style */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-foreground dark:text-muted-foreground">Writing Style</label>
              <div className="grid grid-cols-2 gap-3">
                {styleOptions.map(style => (
                  <label key={style.value} className="flex items-start space-x-3 p-3 border border-border dark:border-border rounded-lg cursor-pointer hover:bg-muted dark:bg-background">
                    <input
                      type="radio"
                      name="style"
                      value={style.value}
                      data-testid={`style-${style.value}`}
                      checked={preferences.style === style.value}
                      onChange={(e) => setPreferences(prev => ({ ...prev, style: e.target.value as "casual" | "professional" | "humorous" | "romantic" }))}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-foreground dark:text-foreground">{style.label}</div>
                      <div className="text-sm text-muted-foreground">{style.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">Target Audience</label>
              <input
                type="text"
                value={preferences.target_audience}
                onChange={(e) => setPreferences(prev => ({ ...prev, target_audience: e.target.value }))}
                placeholder="Who do you want to attract?"
                data-testid="target-audience-input"
                className="w-full p-3 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Generate Button */}
            <button type="button"
              onClick={handleGenerateProfile}
              disabled={isGenerating || isLoading}
              data-testid="generate-btn"
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating || isLoading ? (
                <span data-testid="generation-loading">Generating Profile...</span>
              ) : 'Generate AI Profile (20 🪙)'}
            </button>
            <p className="text-xs text-center text-muted-foreground mt-2">
                Generating an AI profile costs 20 tokens.
            </p>
          </div>
        </div>

        {/* Generated Content */}
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 p-4 rounded-lg" data-testid="generation-error">
              <h3 className="font-semibold text-red-800 mb-2">Generation Failed</h3>
              <p className="text-sm text-red-700" data-testid="error-message">
                {error.message || 'An error occurred while generating your profile.'}
              </p>
              <button type="button" onClick={handleGenerateProfile} className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium">Try Again</button>
            </div>
          )}

          {generatedContent && (
            <div className="bg-card dark:bg-card p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-foreground">Generated Profile Content</h2>
              <div className="space-y-4">
                {generatedContent.data?.suggestions?.map((suggestion: any, index: number) => (
                  <div key={index} className="p-4 border border-border dark:border-border rounded-lg" data-testid="suggestion-item">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-muted-foreground" data-testid="provider-badge">
                          {suggestion.provider === 'openai' ? 'OpenAI' : 'Gemini'}
                        </span>
                        <span className="text-xs text-muted-foreground" data-testid="confidence-score">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </span>
                        <span className="text-xs text-green-600" data-testid="safety-score">
                          Safety: {Math.round(suggestion.safety_score * 100)}%
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => handleContentSelect(suggestion.content)}
                        className={`px-3 py-1 text-sm rounded ${
                          selectedContent === suggestion.content
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted text-foreground hover:bg-gray-300'
                        }`}
                      >
                        {selectedContent === suggestion.content ? 'Selected' : 'Select'}
                      </button>
                    </div>
                    <p className="text-sm text-foreground dark:text-muted-foreground mb-3" data-testid="suggestion-content">{suggestion.content}</p>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button type="button"
                          key={rating}
                          onClick={() => handleFeedback(suggestion.content, rating)}
                          data-testid={`rating-${rating}`}
                          className="text-yellow-400 hover:text-yellow-500 text-lg"
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {feedbackSubmitted === suggestion.content && (
                      <div className="mt-2 text-sm text-green-600" data-testid="feedback-success">
                        Feedback submitted successfully!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedContent && (
            <div className="bg-green-50 p-4 rounded-lg" data-testid="selected-profile">
              <h3 className="font-semibold text-green-800 mb-2">Selected Profile</h3>
              <p className="text-sm text-green-700 mb-3" data-testid="selected-content">{selectedContent}</p>
              <button type="button"
                onClick={() => setSelectedContent('')}
                className="text-sm text-green-600 hover:text-green-800"
              >
                Change Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

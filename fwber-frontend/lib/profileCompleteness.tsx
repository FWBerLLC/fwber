'use client';

import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

export interface ProfileField {
  key: string;
  label: string;
  required: boolean;
  weight: number; // 0-100
}

export const DEFAULT_PROFILE_FIELDS: ProfileField[] = [
  { key: 'photos', label: 'Profile Photos (at least 3)', required: true, weight: 25 },
  { key: 'bio', label: 'Bio / About Me', required: true, weight: 20 },
  { key: 'age', label: 'Age', required: true, weight: 10 },
  { key: 'location', label: 'Location', required: true, weight: 10 },
  { key: 'interests', label: 'Interests (at least 3)', required: false, weight: 10 },
  { key: 'occupation', label: 'Occupation', required: false, weight: 5 },
  { key: 'education', label: 'Education', required: false, weight: 5 },
  { key: 'height', label: 'Height', required: false, weight: 3 },
  { key: 'religion', label: 'Religion', required: false, weight: 3 },
  { key: 'politics', label: 'Political Views', required: false, weight: 3 },
  { key: 'drinking', label: 'Drinking Preference', required: false, weight: 3 },
  { key: 'smoking', label: 'Smoking Preference', required: false, weight: 3 },
];

export interface ProfileCompleteness {
  percentage: number;
  completedFields: string[];
  missingFields: ProfileField[];
  requiredMissing: ProfileField[];
}

/**
 * Calculate profile completeness score
 */
export function calculateProfileCompleteness(
  profile: Record<string, any>,
  fields: ProfileField[] = DEFAULT_PROFILE_FIELDS
): ProfileCompleteness {
  const completedFields: string[] = [];
  const missingFields: ProfileField[] = [];
  const requiredMissing: ProfileField[] = [];
  
  let totalWeight = 0;
  let earnedWeight = 0;

  fields.forEach(field => {
    totalWeight += field.weight;
    
    const value = profile[field.key];
    const isComplete = checkFieldComplete(field.key, value);
    
    if (isComplete) {
      completedFields.push(field.key);
      earnedWeight += field.weight;
    } else {
      missingFields.push(field);
      if (field.required) {
        requiredMissing.push(field);
      }
    }
  });

  const percentage = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    percentage,
    completedFields,
    missingFields,
    requiredMissing,
  };
}

/**
 * Check if a specific field is complete
 */
function checkFieldComplete(key: string, value: any): boolean {
  if (!value) return false;
  
  switch (key) {
    case 'age':
      return !!value;
    case 'location':
      return !!value;
    case 'height':
      return value !== null && value !== undefined && value !== '';
    case 'religion':
    case 'politics':
    case 'drinking':
    case 'smoking':
    case 'occupation':
    case 'education':
      return typeof value === 'string' && value.trim().length > 0;
    case 'photos':
      return Array.isArray(value) && value.length >= 3;
    case 'interests':
      return Array.isArray(value) && value.length >= 3;
    case 'bio':
      return typeof value === 'string' && value.trim().length >= 10;
    default:
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
  }
}

/**
 * Profile completeness progress bar
 */
interface ProfileCompletenessBarProps {
  percentage: number;
  className?: string;
}

export function ProfileCompletenessBar({ percentage, className = '' }: ProfileCompletenessBarProps) {
  const getColor = () => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground dark:text-muted-foreground">
          Profile Completeness
        </span>
        <span className={`text-sm font-bold ${getTextColor()}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-muted dark:dark:bg-muted rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${getColor()} max-w-full`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Profile completeness checklist
 */
interface ProfileCompletenessChecklistProps {
  completeness: ProfileCompleteness;
  onFieldClick?: (field: ProfileField) => void;
  className?: string;
}

export function ProfileCompletenessChecklist({ 
  completeness, 
  onFieldClick,
  className = '' 
}: ProfileCompletenessChecklistProps) {
  const allFields = [
    ...(Array.isArray(completeness.missingFields) ? completeness.missingFields : []),
    ...DEFAULT_PROFILE_FIELDS.filter(f => Array.isArray(completeness.completedFields) && completeness.completedFields.includes(f.key))
  ].sort((a, b) => {
    // Required first, then by weight
    if (a.required && !b.required) return -1;
    if (!a.required && b.required) return 1;
    return b.weight - a.weight;
  });

  return (
    <div className={`bg-card dark:bg-card rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
        Complete Your Profile
      </h3>
      <ProfileCompletenessBar percentage={completeness.percentage} className="mb-4" />
      
      {completeness.percentage < 100 && (
        <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
          {completeness.requiredMissing.length > 0 
            ? `Complete ${completeness.requiredMissing.length} required field${completeness.requiredMissing.length !== 1 ? 's' : ''} to activate your profile.`
            : `Add more details to increase your match quality by ${100 - completeness.percentage}%!`
          }
        </p>
      )}

      <div className="space-y-2">
        {allFields.map(field => {
          const isComplete = Array.isArray(completeness.completedFields) && completeness.completedFields.includes(field.key);
          return (
            <button
              key={field.key}
              onClick={() => onFieldClick?.(field)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isComplete 
                  ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                  : field.required
                  ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'bg-muted dark:dark:bg-muted hover:bg-muted dark:hover:dark:bg-muted'
              }`}
            >
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className={`w-5 h-5 flex-shrink-0 ${
                  field.required ? 'text-red-500' : 'text-muted-foreground'
                }`} />
              )}
              <div className="flex-1 text-left">
                <p className={`text-sm font-medium ${
                  isComplete 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-foreground dark:text-foreground'
                }`}>
                  {field.label}
                  {field.required && !isComplete && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </p>
              </div>
              <div className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                +{field.weight}%
              </div>
            </button>
          );
        })}
      </div>

      {completeness.percentage === 100 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
            🎉 Your profile is 100% complete! Great job!
          </p>
        </div>
      )}
    </div>
  );
}

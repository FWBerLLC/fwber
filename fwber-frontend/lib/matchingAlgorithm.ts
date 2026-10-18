import { calculateProfileCompleteness } from './profileCompleteness';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  };
  photos?: string[];
  interests?: string[];
  occupation?: string;
  education?: string;
  height?: number;
  religion?: string;
  politics?: string;
  drinking?: string;
  smoking?: string;
  
  // Preferences
  preferences?: {
    min_age?: number;
    max_age?: number;
    max_distance?: number; // in miles
    interests?: string[];
    education?: string[];
    religion?: string[];
    politics?: string[];
    drinking?: string[];
    smoking?: string[];
  };
}

export interface MatchScore {
  userId: string;
  score: number; // 0-100
  breakdown: {
    profileCompleteness: number;
    commonInterests: number;
    distance: number;
    ageCompatibility: number;
    preferences: number;
  };
  reasons: string[];
}

/**
 * Calculate haversine distance between two coordinates (in miles)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate match score between current user and potential match
 */
export function calculateMatchScore(
  currentUser: UserProfile,
  potentialMatch: UserProfile
): MatchScore {
  const breakdown = {
    profileCompleteness: 0,
    commonInterests: 0,
    distance: 0,
    ageCompatibility: 0,
    preferences: 0,
  };
  const reasons: string[] = [];

  // 1. Profile Completeness Score (20% weight)
  const matchCompleteness = calculateProfileCompleteness(potentialMatch);
  breakdown.profileCompleteness = matchCompleteness.percentage * 0.2;
  
  if (matchCompleteness.percentage >= 80) {
    reasons.push('Complete profile');
  }

  // 2. Common Interests Score (30% weight)
  const currentInterests = new Set(currentUser.interests || []);
  const matchInterests = new Set(potentialMatch.interests || []);
  const commonInterests = [...currentInterests].filter(i => matchInterests.has(i));
  
  if (currentInterests.size > 0 && matchInterests.size > 0) {
    const interestScore = (commonInterests.length / Math.max(currentInterests.size, matchInterests.size)) * 100;
    breakdown.commonInterests = interestScore * 0.3;
    
    if (commonInterests.length > 0) {
      reasons.push(`${commonInterests.length} shared interest${commonInterests.length > 1 ? 's' : ''}`);
    }
  }

  // 3. Distance Score (20% weight)
  if (currentUser.location && potentialMatch.location) {
    const distance = calculateDistance(
      currentUser.location.latitude,
      currentUser.location.longitude,
      potentialMatch.location.latitude,
      potentialMatch.location.longitude
    );
    
    const maxDistance = currentUser.preferences?.max_distance || 50;
    
    if (distance <= maxDistance) {
      // Closer is better, up to 100% for same location
      const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
      breakdown.distance = distanceScore * 0.2;
      
      if (distance < 10) {
        reasons.push('Very close by');
      } else if (distance < 25) {
        reasons.push('Nearby');
      }
    }
  }

  // 4. Age Compatibility Score (15% weight)
  const minAge = currentUser.preferences?.min_age || 18;
  const maxAge = currentUser.preferences?.max_age || 99;
  
  if (potentialMatch.age >= minAge && potentialMatch.age <= maxAge) {
    // Perfect score if within range
    breakdown.ageCompatibility = 100 * 0.15;
    
    // Extra points for being close to current user's age
    const ageDiff = Math.abs(currentUser.age - potentialMatch.age);
    if (ageDiff <= 5) {
      breakdown.ageCompatibility *= 1.2; // 20% bonus
      reasons.push('Similar age');
    }
  } else {
    // Penalty for being outside age range
    const outOfRange = potentialMatch.age < minAge 
      ? minAge - potentialMatch.age 
      : potentialMatch.age - maxAge;
    breakdown.ageCompatibility = Math.max(0, (100 - outOfRange * 10) * 0.15);
  }

  // 5. Preferences Match Score (15% weight)
  let preferenceMatches = 0;
  let totalPreferences = 0;

  const preferencesChecks = [
    {
      userPref: currentUser.preferences?.education,
      matchValue: potentialMatch.education,
      name: 'education',
    },
    {
      userPref: currentUser.preferences?.religion,
      matchValue: potentialMatch.religion,
      name: 'religion',
    },
    {
      userPref: currentUser.preferences?.politics,
      matchValue: potentialMatch.politics,
      name: 'politics',
    },
    {
      userPref: currentUser.preferences?.drinking,
      matchValue: potentialMatch.drinking,
      name: 'drinking habits',
    },
    {
      userPref: currentUser.preferences?.smoking,
      matchValue: potentialMatch.smoking,
      name: 'smoking habits',
    },
  ];

  for (const check of preferencesChecks) {
    if (check.userPref && check.userPref.length > 0) {
      totalPreferences++;
      if (check.matchValue && Array.isArray(check.userPref) && check.userPref.includes(check.matchValue)) {
        preferenceMatches++;
        reasons.push(`Matching ${check.name}`);
      }
    }
  }

  if (totalPreferences > 0) {
    breakdown.preferences = (preferenceMatches / totalPreferences) * 100 * 0.15;
  } else {
    // No preferences set, give neutral score
    breakdown.preferences = 50 * 0.15;
  }

  // Calculate total score
  const totalScore = Math.min(
    100,
    breakdown.profileCompleteness +
    breakdown.commonInterests +
    breakdown.distance +
    breakdown.ageCompatibility +
    breakdown.preferences
  );

  return {
    userId: potentialMatch.id,
    score: Math.round(totalScore),
    breakdown: {
      profileCompleteness: Math.round(breakdown.profileCompleteness),
      commonInterests: Math.round(breakdown.commonInterests),
      distance: Math.round(breakdown.distance),
      ageCompatibility: Math.round(breakdown.ageCompatibility),
      preferences: Math.round(breakdown.preferences),
    },
    reasons,
  };
}

/**
 * Filter and sort potential matches
 */
export function rankMatches(
  currentUser: UserProfile,
  potentialMatches: UserProfile[],
  options: {
    minScore?: number;
    maxResults?: number;
  } = {}
): MatchScore[] {
  const { minScore = 50, maxResults = 50 } = options;

  // Calculate scores for all potential matches
  const scores = potentialMatches.map(match => 
    calculateMatchScore(currentUser, match)
  );

  // Filter by minimum score and sort by score (descending)
  return scores
    .filter(score => score.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Get match quality description
 */
export function getMatchQualityLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 85) {
    return { label: 'Excellent Match', color: 'text-green-600' };
  } else if (score >= 70) {
    return { label: 'Great Match', color: 'text-blue-600' };
  } else if (score >= 55) {
    return { label: 'Good Match', color: 'text-yellow-600' };
  } else {
    return { label: 'Potential Match', color: 'text-muted-foreground' };
  }
}

/**
 * Format distance for display
 */
export function formatDistance(
  currentUser: UserProfile,
  otherUser: UserProfile
): string {
  if (!currentUser.location || !otherUser.location) {
    return 'Distance unknown';
  }

  const distance = calculateDistance(
    currentUser.location.latitude,
    currentUser.location.longitude,
    otherUser.location.latitude,
    otherUser.location.longitude
  );

  if (distance < 1) {
    return 'Less than a mile away';
  } else if (distance < 10) {
    return `${Math.round(distance)} miles away`;
  } else {
    return `${Math.round(distance / 10) * 10}+ miles away`;
  }
}

/**
 * Check if two users are compatible based on preferences
 */
export function checkPreferenceCompatibility(
  user1: UserProfile,
  user2: UserProfile
): {
  compatible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check age preferences
  if (user1.preferences?.min_age && user2.age < user1.preferences.min_age) {
    reasons.push('Age preference not met');
    return { compatible: false, reasons };
  }
  if (user1.preferences?.max_age && user2.age > user1.preferences.max_age) {
    reasons.push('Age preference not met');
    return { compatible: false, reasons };
  }

  // Check distance preferences
  if (user1.location && user2.location && user1.preferences?.max_distance) {
    const distance = calculateDistance(
      user1.location.latitude,
      user1.location.longitude,
      user2.location.latitude,
      user2.location.longitude
    );
    
    if (distance > user1.preferences.max_distance) {
      reasons.push('Too far away');
      return { compatible: false, reasons };
    }
  }

  // All compatibility checks passed
  return { compatible: true, reasons: ['All preferences met'] };
}

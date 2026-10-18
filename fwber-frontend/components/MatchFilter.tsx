'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { getTopics } from '@/lib/api/topics';

interface MatchFilterProps {
  onFilterChange: (filters: any) => void;
}

type InterestOption = {
  slug: string;
  label: string;
  emoji?: string | null;
}

const FALLBACK_INTEREST_OPTIONS: InterestOption[] = [
  { slug: 'music', label: 'Music' },
  { slug: 'movies', label: 'Movies' },
  { slug: 'sports', label: 'Sports' },
  { slug: 'gaming', label: 'Gaming' },
  { slug: 'travel', label: 'Travel' },
  { slug: 'cooking', label: 'Cooking' },
  { slug: 'reading', label: 'Reading' },
  { slug: 'art', label: 'Art' },
  { slug: 'fitness', label: 'Fitness' },
  { slug: 'outdoors', label: 'Outdoors' },
  { slug: 'tech', label: 'Tech' },
  { slug: 'nightlife', label: 'Nightlife' },
] as const

const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Bald', 'Other'];
const EYE_COLORS = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey', 'Amber', 'Other'];
const SKIN_TONES = ['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Brown', 'Dark', 'Other'];
const ETHNICITIES = ['White', 'Black', 'Hispanic', 'Asian', 'Middle Eastern', 'Native American', 'Pacific Islander', 'Mixed', 'Other'];
const FACIAL_HAIR = ['Clean-shaven', 'Stubble', 'Short Beard', 'Long Beard', 'Goatee', 'Mustache', 'Other'];
const FITNESS_LEVELS = ['Sedentary', 'Occasionally Active', 'Active', 'Very Active', 'Athlete'];
const CLOTHING_STYLES = ['Casual', 'Business', 'Formal', 'Sporty', 'Bohemian', 'Gothic', 'Alternative', 'Trendy', 'Minimalist', 'Vintage'];

export default function MatchFilter({ onFilterChange }: MatchFilterProps) {
  const { user } = useAuth();
  // Threshold for Premium Filters: 100 FWB tokens
  // Ensure we use Lucide icons for consistency
  const PREMIUM_THRESHOLD = 100;
  const isPremium = (user?.token_balance || 0) >= PREMIUM_THRESHOLD;

  const [filters, setFilters] = useState({
    // Standard
    smoking: '',
    drinking: '',
    body_type: '',
    height_min: '',
    height_min_unit: 'cm',
    interests: [] as string[],
    // Premium
    cannabis: '',
    diet: '',
    has_pets: '',
    has_children: '',
    wants_children: '',
    politics: '',
    religion: '',
    zodiac: '',
    // Additional Physical Attributes
    hair_color: '',
    eye_color: '',
    skin_tone: '',
    ethnicity: '',
    facial_hair: '',
    fitness_level: '',
    clothing_style: '',
    dominant_hand: '',
    tattoos: '',
    piercings: '',
  });
  const [topicOptions, setTopicOptions] = useState<InterestOption[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadTopics = async () => {
      try {
        const featuredTopics = await getTopics({ featured: true });
        const topics = featuredTopics.length > 0 ? featuredTopics : await getTopics();

        if (isMounted) {
          setTopicOptions(
            topics.slice(0, 12).map((topic) => ({
              slug: topic.slug,
              label: topic.label,
              emoji: topic.emoji,
            }))
          );
        }
      } catch {
        if (isMounted) {
          setTopicOptions([]);
        }
      }
    };

    void loadTopics();

    return () => {
      isMounted = false;
    };
  }, []);

  const interestOptions = useMemo(() => {
    return topicOptions.length > 0 ? topicOptions : [...FALLBACK_INTEREST_OPTIONS];
  }, [topicOptions]);

  const heightOptions = useMemo(() => {
    const options = [];
    for (let cm = 120; cm <= 220; cm++) {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      options.push({
        cm,
        label: `${feet}'${inches}" (${cm} cm)`
      });
    }
    return options;
  }, []);

  const handleInputChange = (field: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFilters((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((value) => value !== interest)
        : [...prev.interests, interest],
    }))
  }

  const handleApplyFilters = () => {
    // Send standard fields as is
    // Send array fields joined by comma for CSV param parsing in backend
    const apiFilters = {
      ...filters,
      interests: filters.interests.join(','),
    };
    onFilterChange(apiFilters);
  };

  const PremiumOverlay = () => (
    <div className="absolute inset-0 bg-muted dark:bg-card bg-opacity-60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-lg border-2 border-dashed border-border dark:border-border">
      <Lock className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-semibold text-foreground dark:text-muted-foreground">Premium Filters</p>
      <p className="text-xs text-muted-foreground text-center px-4 mb-3">
        Hold {PREMIUM_THRESHOLD}+ FWB Tokens to unlock advanced lifestyle filters.
      </p>
      <Link
        href="/wallet"
        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-full transition-colors"
      >
        Get Tokens
      </Link>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Standard Filters Section */}
      <div className="p-4 bg-card dark:bg-card rounded-lg shadow-sm border border-border dark:border-border">
        <h3 className="text-lg font-medium text-foreground dark:text-foreground mb-4 border-b pb-2">Basic Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="smoking" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Smoking</label>
            <select
              id="smoking"
              value={filters.smoking}
              onChange={(e) => handleInputChange('smoking', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Any</option>
              <option value="non-smoker">Non-smoker</option>
              <option value="occasional">Occasional</option>
              <option value="regular">Regular</option>
              <option value="social">Social</option>
              <option value="trying-to-quit">Trying to quit</option>
            </select>
          </div>

          <div>
            <label htmlFor="drinking" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Drinking</label>
            <select
              id="drinking"
              value={filters.drinking}
              onChange={(e) => handleInputChange('drinking', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Any</option>
              <option value="non-drinker">Non-drinker</option>
              <option value="occasional">Occasional</option>
              <option value="regular">Regular</option>
              <option value="social">Social</option>
              <option value="sober">Sober</option>
            </select>
          </div>

          <div>
            <label htmlFor="body_type" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Body Type</label>
            <select
              id="body_type"
              value={filters.body_type}
              onChange={(e) => handleInputChange('body_type', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Any</option>
              <option value="slim">Slim</option>
              <option value="athletic">Athletic</option>
              <option value="average">Average</option>
              <option value="curvy">Curvy</option>
              <option value="plus-size">Plus size</option>
              <option value="muscular">Muscular</option>
            </select>
          </div>

          <div>
            <label htmlFor="height_min" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Min Height</label>
            <div className="mt-1">
              <select
                id="height_min"
                value={filters.height_min}
                onChange={(e) => handleInputChange('height_min', e.target.value)}
                className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Any height...</option>
                {heightOptions.map(opt => (
                  <option key={opt.cm} value={opt.cm}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground">Shared interests</label>
            <span className="text-xs text-muted-foreground">Boost profiles that overlap with your vibe</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((interest) => {
              const selected = filters.interests.includes(interest.slug)

              return (
                <button
                  key={interest.slug}
                  type="button"
                  onClick={() => handleInterestToggle(interest.slug)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    selected
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {interest.emoji ? <span aria-hidden="true">{interest.emoji}</span> : null}
                    <span>{interest.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Premium Filters Section */}
      <div className="relative p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-sm border border-indigo-100">
        {!isPremium && <PremiumOverlay />}

        <h3 className="text-lg font-medium text-indigo-900 mb-4 border-b border-indigo-200 pb-2 flex items-center justify-between">
          <span>Premium Lifestyle Filters</span>
          {isPremium && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">Unlocked</span>}
        </h3>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${!isPremium ? 'opacity-40 pointer-events-none filter blur-[1px]' : ''}`}>
          {/* Cannabis */}
          <div>
            <label htmlFor="cannabis" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Cannabis</label>
            <select
              id="cannabis"
              value={filters.cannabis}
              onChange={(e) => handleInputChange('cannabis', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="non-smoker">No</option>
              <option value="occasional">Occasional</option>
              <option value="regular">Regular</option>
            </select>
          </div>

          {/* Diet */}
          <div>
            <label htmlFor="diet" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Diet</label>
            <select
              id="diet"
              value={filters.diet}
              onChange={(e) => handleInputChange('diet', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="omnivore">Omnivore</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="paleo">Paleo</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
            </select>
          </div>

          {/* Politics */}
          <div>
            <label htmlFor="politics" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Politics</label>
            <select
              id="politics"
              value={filters.politics}
              onChange={(e) => handleInputChange('politics', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="liberal">Liberal</option>
              <option value="moderate">Moderate</option>
              <option value="conservative">Conservative</option>
              <option value="liberal-conservative">Liberal-Conservative</option>
              <option value="apolitical">Apolitical</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Zodiac */}
          <div>
            <label htmlFor="zodiac" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Zodiac</label>
            <select
              id="zodiac"
              value={filters.zodiac}
              onChange={(e) => handleInputChange('zodiac', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="aries">Aries</option>
              <option value="taurus">Taurus</option>
              <option value="gemini">Gemini</option>
              <option value="cancer">Cancer</option>
              <option value="leo">Leo</option>
              <option value="virgo">Virgo</option>
              <option value="libra">Libra</option>
              <option value="scorpio">Scorpio</option>
              <option value="sagittarius">Sagittarius</option>
              <option value="capricorn">Capricorn</option>
              <option value="aquarius">Aquarius</option>
              <option value="pisces">Pisces</option>
            </select>
          </div>

          {/* Pets */}
           <div>
            <label htmlFor="has_pets" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Has Pets</label>
            <select
              id="has_pets"
              value={filters.has_pets}
              onChange={(e) => handleInputChange('has_pets', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

           {/* Children */}
          <div>
            <label htmlFor="has_children" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Has Children</label>
            <select
              id="has_children"
              value={filters.has_children}
              onChange={(e) => handleInputChange('has_children', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Hair Color */}
          <div>
            <label htmlFor="hair_color" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Hair Color</label>
            <select
              id="hair_color"
              value={filters.hair_color}
              onChange={(e) => handleInputChange('hair_color', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {HAIR_COLORS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Eye Color */}
          <div>
            <label htmlFor="eye_color" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Eye Color</label>
            <select
              id="eye_color"
              value={filters.eye_color}
              onChange={(e) => handleInputChange('eye_color', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {EYE_COLORS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Skin Tone */}
          <div>
            <label htmlFor="skin_tone" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Skin Tone</label>
            <select
              id="skin_tone"
              value={filters.skin_tone}
              onChange={(e) => handleInputChange('skin_tone', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {SKIN_TONES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Ethnicity */}
          <div>
            <label htmlFor="ethnicity" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Ethnicity</label>
            <select
              id="ethnicity"
              value={filters.ethnicity}
              onChange={(e) => handleInputChange('ethnicity', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {ETHNICITIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Facial Hair */}
          <div>
            <label htmlFor="facial_hair" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Facial Hair</label>
            <select
              id="facial_hair"
              value={filters.facial_hair}
              onChange={(e) => handleInputChange('facial_hair', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {FACIAL_HAIR.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Fitness Level */}
          <div>
            <label htmlFor="fitness_level" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Fitness Level</label>
            <select
              id="fitness_level"
              value={filters.fitness_level}
              onChange={(e) => handleInputChange('fitness_level', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {FITNESS_LEVELS.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Clothing Style */}
          <div>
            <label htmlFor="clothing_style" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Clothing Style</label>
            <select
              id="clothing_style"
              value={filters.clothing_style}
              onChange={(e) => handleInputChange('clothing_style', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              {CLOTHING_STYLES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>

          {/* Tattoos */}
          <div>
            <label htmlFor="tattoos" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Tattoos</label>
            <select
              id="tattoos"
              value={filters.tattoos}
              onChange={(e) => handleInputChange('tattoos', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Piercings */}
          <div>
            <label htmlFor="piercings" className="block text-sm font-medium text-foreground dark:text-muted-foreground">Piercings</label>
            <select
              id="piercings"
              value={filters.piercings}
              onChange={(e) => handleInputChange('piercings', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isPremium}
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button type="button"
          onClick={handleApplyFilters}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition duration-200 transform hover:-translate-y-0.5"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

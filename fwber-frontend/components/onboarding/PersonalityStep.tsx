'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const LOVE_LANGUAGES = ['Words of Affirmation', 'Quality Time', 'Physical Touch', 'Acts of Service', 'Receiving Gifts'];
const PERSONALITY_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
  "Don't Know"
];
const POLITICAL_VIEWS = ['Very Liberal', 'Liberal', 'Moderate', 'Conservative', 'Very Conservative', 'Liberal-Conservative', 'Libertarian', 'Apolitical', 'Other'];
const RELIGIONS = ['Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Other', 'Prefer Not to Say'];
const SLEEP_SCHEDULES = ['Early Bird', 'Night Owl', 'Flexible', 'Shift Worker', 'Insomniac'];
const RELATIONSHIP_STYLES = ['Monogamous', 'Non-Monogamous', 'Polyamorous', 'Open', 'Ethically Non-Monogamous', 'Exploring'];
const SEXUAL_ORIENTATIONS = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Queer', 'Asexual', 'Demisexual', 'Questioning', 'Other'];

interface PersonalityStepProps {
  formData: {
    bio: string;
    zodiac_sign: string;
    love_language: string;
    personality_type: string;
    political_views: string;
    religion: string;
    sleep_schedule: string;
    relationship_style: string;
    sexual_orientation: string;
  };
  setFormData: (data: any) => void;
}

export default function PersonalityStep({ formData, setFormData }: PersonalityStepProps) {
  const handleChange = (field: string, value: string) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
  };

  const SelectGrid = ({ options, selected, field, cols = 4, color = 'blue' }: { 
    options: string[], 
    selected: string, 
    field: string, 
    cols?: number,
    color?: 'blue' | 'green' | 'purple' | 'pink' | 'indigo'
  }) => {
    const colorClasses = {
      blue: { active: 'bg-blue-600 border-blue-600', hover: 'hover:border-blue-400' },
      green: { active: 'bg-green-600 border-green-600', hover: 'hover:border-green-400' },
      purple: { active: 'bg-purple-600 border-purple-600', hover: 'hover:border-purple-400' },
      pink: { active: 'bg-pink-600 border-pink-600', hover: 'hover:border-pink-400' },
      indigo: { active: 'bg-indigo-600 border-indigo-600', hover: 'hover:border-indigo-400' },
    };
    
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-2`}>
        {options.map(opt => {
          const val = opt.toLowerCase().replace(/ /g, '_').replace("'", '');
          const isSelected = selected === val;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleChange(field, val)}
              className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                isSelected
                  ? `${colorClasses[color].active} text-white`
                  : `bg-card dark:bg-card border-border dark:border-border ${colorClasses[color].hover}`
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Personality & Values</CardTitle>
        <CardDescription>Help us understand who you are</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-medium">About You</Label>
          <Textarea
            value={formData.bio || ''}
            onChange={e => handleChange('bio', e.target.value)}
            placeholder="Tell potential matches about yourself... What makes you unique? What are you passionate about?"
            className="w-full min-h-[100px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{(formData.bio || '').length}/500</p>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🏳️‍🌈 Sexual Orientation</Label>
          <SelectGrid options={SEXUAL_ORIENTATIONS} selected={formData.sexual_orientation} field="sexual_orientation" cols={5} color="pink" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">💕 Relationship Style</Label>
          <SelectGrid options={RELATIONSHIP_STYLES} selected={formData.relationship_style} field="relationship_style" cols={3} color="pink" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">♈ Zodiac Sign</Label>
          <SelectGrid options={ZODIAC_SIGNS} selected={formData.zodiac_sign} field="zodiac_sign" cols={4} color="purple" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">💝 Love Language</Label>
          <SelectGrid options={LOVE_LANGUAGES} selected={formData.love_language} field="love_language" cols={3} color="pink" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🧠 Personality Type (MBTI)</Label>
          <SelectGrid options={PERSONALITY_TYPES} selected={formData.personality_type} field="personality_type" cols={4} color="indigo" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🗳️ Political Views</Label>
          <SelectGrid options={POLITICAL_VIEWS} selected={formData.political_views} field="political_views" cols={4} color="blue" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🙏 Religion/Spirituality</Label>
          <SelectGrid options={RELIGIONS} selected={formData.religion} field="religion" cols={4} color="purple" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">😴 Sleep Schedule</Label>
          <SelectGrid options={SLEEP_SCHEDULES} selected={formData.sleep_schedule} field="sleep_schedule" cols={5} color="indigo" />
        </div>
      </CardContent>
    </Card>
  );
}

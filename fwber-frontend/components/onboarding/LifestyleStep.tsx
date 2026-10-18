'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const SMOKING_OPTIONS = ['Never', 'Socially', 'Regularly', 'Trying to Quit', 'Former Smoker'];
const DRINKING_OPTIONS = ['Never', 'Socially', 'Regularly', 'Sober', 'In Recovery'];
const CANNABIS_OPTIONS = ['Never', 'Socially', 'Regularly', 'Medical Only', 'Daily'];
const DIETARY_OPTIONS = ['No Restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Gluten-Free', 'Halal', 'Kosher', 'Other'];
const EDUCATION_OPTIONS = ['High School', 'Some College', 'Associates', 'Bachelors', 'Masters', 'Doctorate', 'Trade School', 'Other'];
const KIDS_OPTIONS = ['No Kids', 'Have Kids', 'Want Kids Someday', "Don't Want Kids", 'Open to Kids'];
const PETS_OPTIONS = ['No Pets', 'Dogs', 'Cats', 'Both', 'Other Pets', 'Allergic to Pets'];

interface LifestyleStepProps {
  formData: {
    occupation: string;
    education: string;
    smoking_status: string;
    drinking_status: string;
    cannabis_status: string;
    dietary_preferences: string;
    has_children: string;
    wants_children: string;
    has_pets: string;
  };
  setFormData: (data: any) => void;
}

export default function LifestyleStep({ formData, setFormData }: LifestyleStepProps) {
  const handleChange = (field: string, value: string) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
  };

  const SelectGrid = ({ options, selected, field, cols = 3, color = 'blue' }: { 
    options: string[], 
    selected: string, 
    field: string, 
    cols?: number,
    color?: 'blue' | 'green' | 'purple' | 'orange'
  }) => {
    const colorClasses = {
      blue: { active: 'bg-blue-600 border-blue-600', hover: 'hover:border-blue-400' },
      green: { active: 'bg-green-600 border-green-600', hover: 'hover:border-green-400' },
      purple: { active: 'bg-purple-600 border-purple-600', hover: 'hover:border-purple-400' },
      orange: { active: 'bg-orange-600 border-orange-600', hover: 'hover:border-orange-400' },
    };
    
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-2`}>
        {options.map(opt => {
          const val = opt.toLowerCase().replace(/ /g, '_');
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
        <CardTitle className="text-2xl">Lifestyle & Habits</CardTitle>
        <CardDescription>Tell us about your daily life</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-medium">Occupation</Label>
          <Input
            value={formData.occupation || ''}
            onChange={e => handleChange('occupation', e.target.value)}
            placeholder="What do you do for work?"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Education</Label>
          <SelectGrid options={EDUCATION_OPTIONS} selected={formData.education} field="education" cols={4} color="blue" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🚬 Smoking</Label>
          <SelectGrid options={SMOKING_OPTIONS} selected={formData.smoking_status} field="smoking_status" color="orange" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🍺 Drinking</Label>
          <SelectGrid options={DRINKING_OPTIONS} selected={formData.drinking_status} field="drinking_status" color="purple" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🌿 Cannabis</Label>
          <SelectGrid options={CANNABIS_OPTIONS} selected={formData.cannabis_status} field="cannabis_status" color="green" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🍽️ Dietary Preferences</Label>
          <SelectGrid options={DIETARY_OPTIONS} selected={formData.dietary_preferences} field="dietary_preferences" cols={3} color="blue" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">👶 Children</Label>
          <SelectGrid options={KIDS_OPTIONS} selected={formData.has_children || formData.wants_children} field="has_children" color="purple" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">🐾 Pets</Label>
          <SelectGrid options={PETS_OPTIONS} selected={formData.has_pets} field="has_pets" color="orange" />
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus Size', 'Dad Bod'];
const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Bald', 'Other'];
const EYE_COLORS = ['Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Amber', 'Other'];
const SKIN_TONES = ['Very Fair', 'Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Brown', 'Dark Brown', 'Dark'];
const ETHNICITIES = ['Asian', 'Black', 'Hispanic/Latino', 'Middle Eastern', 'Native American', 'Pacific Islander', 'White', 'Mixed', 'Other'];
const FACIAL_HAIR = ['None', 'Stubble', 'Goatee', 'Mustache', 'Full Beard', 'Other'];
const FITNESS_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active', 'Athlete'];

interface PhysicalStepProps {
  formData: {
    height_cm: number | null;
    body_type: string;
    hair_color: string;
    eye_color: string;
    skin_tone: string;
    ethnicity: string;
    facial_hair: string;
    fitness_level: string;
    tattoos: boolean;
    piercings: boolean;
  };
  setFormData: (data: any) => void;
}

export default function PhysicalStep({ formData, setFormData }: PhysicalStepProps) {
  const cmToFeetInches = (cm: number | null) => {
    if (!cm) return "Not set";
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
  };

  const SelectGrid = ({ options, selected, field, cols = 4 }: { options: string[], selected: string, field: string, cols?: number }) => (
    <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-2`}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => handleChange(field, opt.toLowerCase().replace(/ /g, '_'))}
          className={`px-3 py-2 text-sm rounded-lg border transition-all ${
            selected === opt.toLowerCase().replace(/ /g, '_')
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-card dark:bg-card border-border dark:border-border hover:border-blue-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Physical Attributes</CardTitle>
        <CardDescription>Help others know what you look like</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Height: {formData.height_cm ? `${formData.height_cm} cm (${cmToFeetInches(formData.height_cm)})` : 'Not set'}
          </Label>
          <input
            type="range"
            value={formData.height_cm || 170}
            onChange={e => handleChange('height_cm', parseInt(e.target.value))}
            min={120}
            max={220}
            step={1}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>120cm (3&apos;11&quot;)</span>
            <span>220cm (7&apos;3&quot;)</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Body Type</Label>
          <SelectGrid options={BODY_TYPES} selected={formData.body_type} field="body_type" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Ethnicity</Label>
          <SelectGrid options={ETHNICITIES} selected={formData.ethnicity} field="ethnicity" cols={3} />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Hair Color</Label>
          <SelectGrid options={HAIR_COLORS} selected={formData.hair_color} field="hair_color" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Eye Color</Label>
          <SelectGrid options={EYE_COLORS} selected={formData.eye_color} field="eye_color" />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Skin Tone</Label>
          <SelectGrid options={SKIN_TONES} selected={formData.skin_tone} field="skin_tone" cols={3} />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Facial Hair</Label>
          <SelectGrid options={FACIAL_HAIR} selected={formData.facial_hair} field="facial_hair" cols={3} />
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Fitness Level</Label>
          <SelectGrid options={FITNESS_LEVELS} selected={formData.fitness_level} field="fitness_level" cols={3} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors">
            <input
              type="checkbox"
              checked={formData.tattoos}
              onChange={e => handleChange('tattoos', e.target.checked)}
              className="h-5 w-5 rounded border-2 border-border text-blue-600 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm font-medium">I have tattoos</span>
          </label>
          <label className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors">
            <input
              type="checkbox"
              checked={formData.piercings}
              onChange={e => handleChange('piercings', e.target.checked)}
              className="h-5 w-5 rounded border-2 border-border text-blue-600 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm font-medium">I have piercings</span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

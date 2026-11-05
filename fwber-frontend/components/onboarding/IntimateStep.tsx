'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const BREAST_SIZES = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+', 'N/A'];
const STI_STATUSES = ['HIV Negative', 'HIV Positive', 'HSV-1', 'HSV-2', 'HPV', 'On PrEP', 'Regularly Tested', 'Prefer Not to Say'];
const FETISHES = [
  'Roleplay', 'Voyeurism', 'Exhibitionism', 'Bondage', 
  'Dominant', 'Submissive', 'Feet', 'Leather', 'Latex',
  'Group Play', 'Public', 'Threesomes', 'Swinging', 'Power Dynamics', 'Open Play',
  'Sensory Play', 'Impact Play', 'Rope', 'Toys', 'Other'
];

interface IntimateStepProps {
  formData: {
    gender: string;
    breast_size: string;
    penis_length_cm: number | null;
    penis_girth_cm: number | null;
    sti_status: string[];
    fetishes: string[];
  };
  setFormData: (data: any) => void;
}

export default function IntimateStep({ formData, setFormData }: IntimateStepProps) {
  const handleChange = (field: string, value: string | number | null) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: 'sti_status' | 'fetishes', value: string) => {
    setFormData((prev: Record<string, unknown>) => {
      const current = Array.isArray(prev[field]) ? (prev[field] as string[]) : [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const cmToInches = (cm: number | null) => {
    if (!cm) return "Not set";
    return `${(cm / 2.54).toFixed(1)}"`;
  };

  const showPenisFields = ['male', 'trans_female', 'non_binary', 'other'].includes(formData.gender);
  const showBreastFields = ['female', 'trans_male', 'non_binary', 'other'].includes(formData.gender);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Intimate Details</CardTitle>
        <CardDescription>
          This information is private and only shared with matches you choose.
          Be honest – it helps find compatible partners.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showBreastFields && (
          <div className="space-y-2">
            <Label className="text-base font-medium">Breast/Chest Size</Label>
            <div className="grid grid-cols-5 gap-2">
              {BREAST_SIZES.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleChange('breast_size', size.toLowerCase())}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    formData.breast_size === size.toLowerCase()
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-card dark:bg-card border-border dark:border-border hover:border-pink-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {showPenisFields && (
          <>
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Penis Length: {formData.penis_length_cm ? `${formData.penis_length_cm} cm (${cmToInches(formData.penis_length_cm)})` : 'Not set'}
              </Label>
              <input
                type="range"
                value={formData.penis_length_cm || 15}
                onChange={e => handleChange('penis_length_cm', parseFloat(e.target.value))}
                min={5}
                max={30}
                step={0.5}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5cm (2&quot;)</span>
                <span>30cm (12&quot;)</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">
                Penis Girth: {formData.penis_girth_cm ? `${formData.penis_girth_cm} cm (${cmToInches(formData.penis_girth_cm)})` : 'Not set'}
              </Label>
              <input
                type="range"
                value={formData.penis_girth_cm || 12}
                onChange={e => handleChange('penis_girth_cm', parseFloat(e.target.value))}
                min={5}
                max={20}
                step={0.5}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-pink-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5cm (2&quot;)</span>
                <span>20cm (8&quot;)</span>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label className="text-base font-medium">Sexual Health Status</Label>
          <p className="text-sm text-muted-foreground mb-2">Select all that apply. This helps ensure safe connections.</p>
          <div className="grid grid-cols-2 gap-2">
            {STI_STATUSES.map(status => {
              const val = status.toLowerCase().replace(/ /g, '_');
              const isSelected = Array.isArray(formData.sti_status) && formData.sti_status.includes(val);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleArrayToggle('sti_status', val)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-card dark:bg-card border-border dark:border-border hover:border-green-400'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-medium">Interests & Kinks</Label>
          <p className="text-sm text-muted-foreground mb-2">Select any that apply. No judgment here!</p>
          <div className="grid grid-cols-3 gap-2">
            {FETISHES.map(fetish => {
              const val = fetish.toLowerCase().replace(/ /g, '_');
              const isSelected = (formData.fetishes || []).includes(val);
              return (
                <button
                  key={fetish}
                  type="button"
                  onClick={() => handleArrayToggle('fetishes', val)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-card dark:bg-card border-border dark:border-border hover:border-purple-400'
                  }`}
                >
                  {fetish}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

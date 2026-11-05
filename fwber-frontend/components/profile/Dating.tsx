'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DatingProps {
  formData: any;
  handlePreferenceChange: (field: string, value: any) => void;
}

// Height options from 4'0" (122cm) to 7'0" (213cm)
const HEIGHT_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const cm = 122 + i * 2;
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return {
    value: String(cm),
    label: `${ft}'${inch}" — ${cm}cm`,
  };
});

export default function Dating({ formData, handlePreferenceChange }: DatingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dating Preferences</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label htmlFor="height_min" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Partner Height (minimum)
          </label>
          <select
            id="height_min"
            value={formData.preferences.height_min || ''}
            onChange={(e) => handlePreferenceChange('height_min', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No preference</option>
            {HEIGHT_OPTIONS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="height_max" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Partner Height (maximum)
          </label>
          <select
            id="height_max"
            value={formData.preferences.height_max || ''}
            onChange={(e) => handlePreferenceChange('height_max', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No preference</option>
            {HEIGHT_OPTIONS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="age_range_min" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Minimum Age
          </label>
          <input
            type="number"
            id="age_range_min"
            min="18"
            max="99"
            value={formData.preferences.age_range_min}
            onChange={(e) => handlePreferenceChange('age_range_min', parseInt(e.target.value))}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="age_range_max" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Maximum Age
          </label>
          <input
            type="number"
            id="age_range_max"
            min="18"
            max="99"
            value={formData.preferences.age_range_max}
            onChange={(e) => handlePreferenceChange('age_range_max', parseInt(e.target.value))}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="body_type" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Partner Body Type Preference
          </label>
          <select
            id="body_type"
            value={formData.preferences.body_type}
            onChange={(e) => handlePreferenceChange('body_type', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No preference</option>
            <option value="slim">Slim</option>
            <option value="athletic">Athletic</option>
            <option value="average">Average</option>
            <option value="curvy">Curvy</option>
            <option value="plus-size">Plus size</option>
            <option value="muscular">Muscular</option>
          </select>
        </div>

        <div>
          <label htmlFor="religion" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Partner Religion Preference
          </label>
          <select
            id="religion"
            value={formData.preferences.religion}
            onChange={(e) => handlePreferenceChange('religion', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No preference</option>
            <option value="christian">Christian</option>
            <option value="catholic">Catholic</option>
            <option value="jewish">Jewish</option>
            <option value="muslim">Muslim</option>
            <option value="hindu">Hindu</option>
            <option value="buddhist">Buddhist</option>
            <option value="agnostic">Agnostic</option>
            <option value="atheist">Atheist</option>
            <option value="spiritual">Spiritual</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="politics" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Partner Politics Preference
          </label>
          <select
            id="politics"
            value={formData.preferences.politics}
            onChange={(e) => handlePreferenceChange('politics', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No preference</option>
            <option value="liberal">Liberal</option>
            <option value="moderate">Moderate</option>
            <option value="conservative">Conservative</option>
            <option value="liberal-conservative">Liberal-Conservative</option>
            <option value="apolitical">Apolitical</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="education" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Education Level
          </label>
          <select
            id="education"
            value={formData.preferences.education}
            onChange={(e) => handlePreferenceChange('education', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select education</option>
            <option value="high-school">High School</option>
            <option value="some-college">Some College</option>
            <option value="associates">Associate&apos;s Degree</option>
            <option value="bachelors">Bachelor&apos;s Degree</option>
            <option value="masters">Master&apos;s Degree</option>
            <option value="phd">PhD</option>
            <option value="other">Other</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

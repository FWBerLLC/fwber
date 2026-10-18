'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LifestyleProps {
  formData: any;
  handlePreferenceChange: (field: string, value: any) => void;
}

export default function Lifestyle({ formData, handlePreferenceChange }: LifestyleProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifestyle Preferences</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label htmlFor="occupation" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Occupation
          </label>
          <input
            type="text"
            id="occupation"
            value={formData.preferences.occupation}
            onChange={(e) => handlePreferenceChange('occupation', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Your job or profession"
          />
        </div>

        <div>
          <label htmlFor="smoking" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Smoking
          </label>
          <select
            id="smoking"
            value={formData.preferences.smoking}
            onChange={(e) => handlePreferenceChange('smoking', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="non-smoker">Non-smoker</option>
            <option value="occasional">Occasional smoker</option>
            <option value="regular">Regular smoker</option>
            <option value="social">Social smoker</option>
            <option value="vaping">Vaping / E-cigarettes</option>
            <option value="trying-to-quit">Trying to quit</option>
          </select>
        </div>

        <div>
          <label htmlFor="drinking" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Drinking
          </label>
          <select
            id="drinking"
            value={formData.preferences.drinking}
            onChange={(e) => handlePreferenceChange('drinking', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="non-drinker">Non-drinker</option>
            <option value="occasional">Occasional drinker</option>
            <option value="regular">Regular drinker</option>
            <option value="social">Social drinker</option>
            <option value="sober">Sober</option>
          </select>
        </div>

        <div>
          <label htmlFor="cannabis" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Cannabis
          </label>
          <select
            id="cannabis"
            value={formData.preferences.cannabis || ''}
            onChange={(e) => handlePreferenceChange('cannabis', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="never">Never</option>
            <option value="occasional">Occasional</option>
            <option value="regular">Regular</option>
            <option value="social">Social</option>
            <option value="medical">Medical use only</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label htmlFor="psychedelics" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Psychedelics
          </label>
          <select
            id="psychedelics"
            value={formData.preferences.psychedelics || ''}
            onChange={(e) => handlePreferenceChange('psychedelics', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="never">Never</option>
            <option value="occasional">Occasional</option>
            <option value="regular">Regular</option>
            <option value="exploring">Open to exploring</option>
            <option value="therapeutic">Therapeutic / guided use</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label htmlFor="stimulants" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Stimulants
          </label>
          <select
            id="stimulants"
            value={formData.preferences.stimulants || ''}
            onChange={(e) => handlePreferenceChange('stimulants', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="never">Never</option>
            <option value="occasional">Occasional</option>
            <option value="regular">Regular</option>
            <option value="social">Social</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label htmlFor="opiates" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Opiates
          </label>
          <select
            id="opiates"
            value={formData.preferences.opiates || ''}
            onChange={(e) => handlePreferenceChange('opiates', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="never">Never</option>
            <option value="prescribed">Prescribed use only</option>
            <option value="occasional">Occasional</option>
            <option value="in-recovery">In recovery</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label htmlFor="exercise" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Exercise
          </label>
          <select
            id="exercise"
            value={formData.preferences.exercise}
            onChange={(e) => handlePreferenceChange('exercise', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="daily">Daily</option>
            <option value="several-times-week">Several times a week</option>
            <option value="weekly">Weekly</option>
            <option value="occasional">Occasional</option>
            <option value="rarely">Rarely</option>
            <option value="never">Never</option>
          </select>
        </div>

        <div>
          <label htmlFor="diet" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Diet
          </label>
          <select
            id="diet"
            value={formData.preferences.diet}
            onChange={(e) => handlePreferenceChange('diet', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="omnivore">Omnivore</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="pescatarian">Pescatarian</option>
            <option value="keto">Keto</option>
            <option value="paleo">Paleo</option>
            <option value="gluten-free">Gluten-free</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="pets" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Pets
          </label>
          <select
            id="pets"
            value={formData.preferences.pets}
            onChange={(e) => handlePreferenceChange('pets', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="love-pets">Love pets</option>
            <option value="have-pets">Have pets</option>
            <option value="allergic">Allergic to pets</option>
            <option value="prefer-no-pets">Prefer no pets</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        <div>
          <label htmlFor="children" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Children
          </label>
          <select
            id="children"
            value={formData.preferences.children}
            onChange={(e) => handlePreferenceChange('children', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="have-children">Have children</option>
            <option value="want-children">Want children</option>
            <option value="dont-want-children">Don&apos;t want children</option>
            <option value="maybe-someday">Maybe someday</option>
            <option value="not-sure">Not sure</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

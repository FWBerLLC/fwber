'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommunicationProps {
  formData: any;
  handlePreferenceChange: (field: string, value: any) => void;
}

export default function Communication({ formData, handlePreferenceChange }: CommunicationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Preferences</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label htmlFor="communication_style" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Communication Style
          </label>
          <select
            id="communication_style"
            value={formData.preferences.communication_style}
            onChange={(e) => handlePreferenceChange('communication_style', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select style</option>
            <option value="direct">Direct</option>
            <option value="diplomatic">Diplomatic</option>
            <option value="humorous">Humorous</option>
            <option value="serious">Serious</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
          </select>
        </div>

        <div>
          <label htmlFor="response_time" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Response Time
          </label>
          <select
            id="response_time"
            value={formData.preferences.response_time}
            onChange={(e) => handlePreferenceChange('response_time', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="immediate">Immediate</option>
            <option value="within-hour">Within an hour</option>
            <option value="within-day">Within a day</option>
            <option value="when-convenient">When convenient</option>
            <option value="no-rush">No rush</option>
          </select>
        </div>

        <div>
          <label htmlFor="meeting_preference" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
            Meeting Preference
          </label>
          <select
            id="meeting_preference"
            value={formData.preferences.meeting_preference}
            onChange={(e) => handlePreferenceChange('meeting_preference', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select preference</option>
            <option value="public-places">Public places</option>
            <option value="coffee-dates">Coffee dates</option>
            <option value="dinner-dates">Dinner dates</option>
            <option value="outdoor-activities">Outdoor activities</option>
            <option value="virtual-first">Virtual first</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

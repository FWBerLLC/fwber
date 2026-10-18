'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LookingForProps {
  formData: any;
  handleLookingForChange: (value: string, checked: boolean) => void;
}

export default function LookingFor({ formData, handleLookingForChange }: LookingForProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Looking For</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['friendship', 'dating', 'relationship', 'casual', 'marriage', 'networking'].map((option) => (
            <label key={option} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Array.isArray(formData.looking_for) ? formData.looking_for.includes(option) : false}
                onChange={(e) => handleLookingForChange(option, e.target.checked)}
                className="h-5 w-5 rounded border-2 border-gray-400 text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span className="ml-2 text-sm text-foreground dark:text-muted-foreground capitalize select-none">{option}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

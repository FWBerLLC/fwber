'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VoiceIntroRecorder from './VoiceIntroRecorder';

interface BioProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  handleVoiceUpload?: (file: File) => void;
  handleVoiceDelete?: () => void;
}

export default function Bio({
  formData,
  handleInputChange,
  handleVoiceUpload,
  handleVoiceDelete,
}: BioProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About You</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="bio"
            rows={4}
            value={formData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Tell others about yourself, your interests, and what you're looking for..."
          />
        </CardContent>
      </Card>

      {handleVoiceUpload && handleVoiceDelete && (
        <VoiceIntroRecorder
          currentVoiceUrl={formData.voice_intro_url}
          onVoiceUpload={handleVoiceUpload}
          onVoiceDelete={handleVoiceDelete}
        />
      )}
    </div>
  );
}

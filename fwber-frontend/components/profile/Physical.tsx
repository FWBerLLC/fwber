'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Ruler, User, Palette } from 'lucide-react';

export default function Physical() {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-3 mb-2">
            <Ruler className="w-8 h-8 text-blue-500" />
            <User className="w-8 h-8 text-purple-500" />
            <Palette className="w-8 h-8 text-pink-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Physical Attributes
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Height, body type, ethnicity, hair &amp; eye color, fitness level, clothing style, tattoos, piercings, and more.
          </p>
          <button type="button"
            onClick={() => router.push('/settings/physical-profile')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md"
          >
            Edit Physical Attributes
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

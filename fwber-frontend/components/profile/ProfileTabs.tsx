'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BasicInformation from './BasicInformation';
import Bio from './Bio';
import LookingFor from './LookingFor';
import Location from './Location';
import Lifestyle from './Lifestyle';
import Dating from './Dating';
import Interests from './Interests';
import Communication from './Communication';
import Physical from './Physical';
import Intimate from './Intimate';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Camera } from 'lucide-react';
import { Photo } from '@/lib/api/photos';

const PhotoUpload = dynamic(() => import('../PhotoUpload'), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />
});

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  handleLocationChange: (field: string, value: any) => void;
  handleLookingForChange: (value: string, checked: boolean) => void;
  handlePreferenceChange: (field: string, value: any) => void;
  handleArrayPreferenceChange: (field: string, value: string, checked: boolean) => void;
  handleArrayChange: (field: string, value: string, checked: boolean) => void;
  photos: Photo[];
  uploadPhotos: (
    items: Array<{ file: File; isPrivate?: boolean; unlockPrice?: number }> | File[],
    onProgress?: (fileIndex: number, progress: number, fileName: string) => void
  ) => Promise<void>;
  deletePhoto: (index: number) => void;
  handleVoiceUpload?: (file: File) => void;
  handleVoiceDelete?: () => void;
}

const TAB_ITEMS = [
  { value: 'basic', label: '👤 Basic Info' },
  { value: 'bio', label: '✍️ About You' },
  { value: 'photos', label: '📷 Photos' },
  { value: 'physical', label: '📏 Physical' },
  { value: 'intimate', label: '🔒 Intimate' },
  { value: 'lookingFor', label: '🎯 Looking For' },
  { value: 'location', label: '📍 Location' },
  { value: 'lifestyle', label: '🍷 Lifestyle' },
  { value: 'dating', label: '💕 Dating' },
  { value: 'interests', label: '🎯 Interests' },
  { value: 'communication', label: '💬 Communication' },
];

export default function ProfileTabs({
  activeTab,
  onTabChange,
  formData,
  handleInputChange,
  handleLocationChange,
  handleLookingForChange,
  handlePreferenceChange,
  handleArrayPreferenceChange,
  handleArrayChange,
  photos,
  uploadPhotos,
  deletePhoto,
  handleVoiceUpload,
  handleVoiceDelete,
}: ProfileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={onTabChange}>
        {/* Scrollable tab bar with arrows */}
        <div className="relative flex items-center gap-1 mb-6">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted dark:dark:bg-muted hover:bg-muted dark:hover:dark:bg-muted transition-colors z-10"
            aria-label="Scroll tabs left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <TabsList className="inline-flex w-max bg-muted dark:bg-card p-1 rounded-lg gap-1">
              {TAB_ITEMS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-tab={tab.value}
                  className="px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-blue-600"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted dark:dark:bg-muted hover:bg-muted dark:hover:dark:bg-muted transition-colors z-10"
            aria-label="Scroll tabs right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <TabsContent value="basic">
          <BasicInformation formData={formData} handleInputChange={handleInputChange} handleLocationChange={handleLocationChange} />
        </TabsContent>
        <TabsContent value="bio">
          <Bio
            formData={formData}
            handleInputChange={handleInputChange}
            handleVoiceUpload={handleVoiceUpload}
            handleVoiceDelete={handleVoiceDelete}
          />
        </TabsContent>
        <TabsContent value="photos">
          <Card id="photos">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Profile Photos</span>
                {photos.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({photos.length} photos)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                onUpload={uploadPhotos}
                onRemove={deletePhoto}
                photos={photos}
                maxPhotos={12}
                maxSize={5}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="physical">
          <Physical />
        </TabsContent>
        <TabsContent value="intimate">
          <Intimate formData={formData} handleInputChange={handleInputChange} handleArrayChange={handleArrayChange} />
        </TabsContent>
        <TabsContent value="lookingFor">
          <LookingFor formData={formData} handleLookingForChange={handleLookingForChange} />
        </TabsContent>
        <TabsContent value="location">
          <Location formData={formData} handleLocationChange={handleLocationChange} />
        </TabsContent>
        <TabsContent value="lifestyle">
          <Lifestyle formData={formData} handlePreferenceChange={handlePreferenceChange} />
        </TabsContent>
        <TabsContent value="dating">
          <Dating formData={formData} handlePreferenceChange={handlePreferenceChange} />
        </TabsContent>
        <TabsContent value="interests">
          <Interests formData={formData} handleArrayPreferenceChange={handleArrayPreferenceChange} />
        </TabsContent>
        <TabsContent value="communication">
          <Communication formData={formData} handlePreferenceChange={handlePreferenceChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

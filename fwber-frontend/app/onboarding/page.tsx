'use client'

import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { updateUserProfile, completeOnboarding, getUserProfile, type UserProfile } from '@/lib/api/profile'
import { usePhotos } from '@/lib/api/photos'
import { getCurrentGeolocation } from '@/lib/api/location'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'

const PhotoUpload = dynamic(() => import('@/components/PhotoUpload'), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />
})
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Camera, MapPin, User, Heart } from 'lucide-react'
import { PreferencesStep, type OnboardingFormData } from '@/components/onboarding/PreferencesStep'
import PhysicalStep from '@/components/onboarding/PhysicalStep'
import IntimateStep from '@/components/onboarding/IntimateStep'
import LifestyleStep from '@/components/onboarding/LifestyleStep'
import PersonalityStep from '@/components/onboarding/PersonalityStep'

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'basics', title: 'Basic Info' },
  { id: 'photos', title: 'Photos' },
  { id: 'physical', title: 'Physical' },
  { id: 'lifestyle', title: 'Lifestyle' },
  { id: 'personality', title: 'Personality' },
  { id: 'intimate', title: 'Intimate' },
  { id: 'preferences', title: 'Preferences' },
  { id: 'complete', title: 'All Set!' },
]

export default function OnboardingPage() {
  const { isAuthenticated, token, isLoading: authLoading, updateUser, user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Auto-save debounce timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Photo management
  const { photos, uploadPhotos, deletePhoto } = usePhotos()

  // Form State
  const [formData, setFormData] = useState({
    display_name: '',
    date_of_birth: '',
    gender: '',
    bio: '',
    location: {
      city: '',
      state: '',
      latitude: 0,
      longitude: 0,
    },
    looking_for: [] as string[],
    preferences: {
      age_range_min: 18,
      age_range_max: 50,
    },
    height_cm: null as number | null,
    body_type: '',
    hair_color: '',
    eye_color: '',
    skin_tone: '',
    ethnicity: '',
    facial_hair: '',
    fitness_level: '',
    tattoos: false,
    piercings: false,
    breast_size: '',
    penis_length_cm: null as number | null,
    penis_girth_cm: null as number | null,
    sti_status: [] as string[],
    fetishes: [] as string[],
    occupation: '',
    education: '',
    smoking_status: '',
    drinking_status: '',
    cannabis_status: '',
    dietary_preferences: '',
    has_children: '',
    wants_children: '',
    has_pets: '',
    zodiac_sign: '',
    love_language: '',
    personality_type: '',
    political_views: '',
    religion: '',
    sleep_schedule: '',
    relationship_style: '',
    sexual_orientation: '',
  })

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && token) {
      getUserProfile(token).then(data => {
        if (data.profile) {
          setFormData(prev => ({
            ...prev,
            display_name: data.profile.display_name || '',
            date_of_birth: (data.profile as any).date_of_birth || '',
            gender: data.profile.gender || '',
            location: {
              city: data.profile.location.city || '',
              state: data.profile.location.state || '',
              latitude: data.profile.location.latitude || 0,
              longitude: data.profile.location.longitude || 0,
            },
            looking_for: data.profile.looking_for || [],
            preferences: {
              age_range_min: data.profile.preferences?.age_range_min || 18,
              age_range_max: data.profile.preferences?.age_range_max || 50,
            }
          }))
        }
      }).catch(console.error)
    }
  }, [isAuthenticated, token])

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleUseCurrentLocation = async () => {
    setIsLoading(true)
    try {
      const position = await getCurrentGeolocation()
      updateFormData((prev: typeof formData) => ({
        ...prev,
        location: {
          ...prev.location,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      }))
    } catch (err) {
      console.error(err)
      setError('Could not get location. Please enter manually.')
    } finally {
      setIsLoading(false)
    }
  }

  const sanitizeLocationUpdate = () => {
    const locationUpdate: Record<string, number | string> = { ...formData.location }

    if (locationUpdate.latitude === 0 && locationUpdate.longitude === 0) {
      delete locationUpdate.latitude
      delete locationUpdate.longitude
    }

    if (!locationUpdate.city) delete locationUpdate.city
    if (!locationUpdate.state) delete locationUpdate.state

    return locationUpdate
  }

  const persistStepUpdate = async (updates: Record<string, unknown>) => {
    if (!token) {
      return
    }

    if (Object.keys(updates).length === 0) {
      return
    }

    setSaving(true)
    try {
      await updateUserProfile(token, updates)
    } catch (err) {
      console.error('Auto-save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // Debounced auto-save: saves current step data after 800ms of inactivity
  const autoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const stepId = STEPS[currentStep].id
      let updates: Record<string, unknown> = {}

      if (stepId === 'basics') {
        updates = {
          display_name: formData.display_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          location: sanitizeLocationUpdate(),
        }
      } else if (stepId === 'physical') {
        updates = {
          height_cm: formData.height_cm,
          body_type: formData.body_type,
          hair_color: formData.hair_color,
          eye_color: formData.eye_color,
          skin_tone: formData.skin_tone,
          ethnicity: formData.ethnicity,
          facial_hair: formData.facial_hair,
          fitness_level: formData.fitness_level,
          tattoos: formData.tattoos ? 'yes' : undefined,
          piercings: formData.piercings ? 'yes' : undefined,
        }
      } else if (stepId === 'lifestyle') {
        updates = {
          occupation: formData.occupation,
          education: formData.education,
          smoking_status: formData.smoking_status,
          drinking_status: formData.drinking_status,
          cannabis_status: formData.cannabis_status,
          dietary_preferences: formData.dietary_preferences,
        }
      } else if (stepId === 'personality') {
        const allowedRelationshipStyles = new Set([
          'monogamous', 'non-monogamous', 'polyamorous', 'open', 'swinger', 'other', 'prefer-not-to-say',
        ])
        updates = {
          bio: formData.bio,
          zodiac_sign: formData.zodiac_sign,
          love_language: formData.love_language,
          personality_type: formData.personality_type.length === 4 ? formData.personality_type : undefined,
          political_views: formData.political_views,
          religion: formData.religion,
          sleep_schedule: formData.sleep_schedule,
          relationship_style: allowedRelationshipStyles.has(formData.relationship_style) ? formData.relationship_style : undefined,
          sexual_orientation: formData.sexual_orientation,
        }
      } else if (stepId === 'intimate') {
        updates = {
          breast_size: formData.breast_size,
          penis_length_cm: formData.penis_length_cm,
          penis_girth_cm: formData.penis_girth_cm,
          sti_status: formData.sti_status,
          fetishes: formData.fetishes,
        }
      } else if (stepId === 'preferences') {
        const minAge = Math.min(formData.preferences.age_range_min, formData.preferences.age_range_max)
        const maxAge = Math.max(formData.preferences.age_range_min, formData.preferences.age_range_max)
        updates = {
          looking_for: formData.looking_for,
          preferences: { age_range_min: minAge, age_range_max: maxAge },
        }
      }

      if (Object.keys(updates).length > 0) {
        persistStepUpdate(updates)
      }
    }, 800)
  }, [currentStep, formData, token])

  // Wrapper for setFormData that triggers auto-save
  const updateFormData = useCallback((update: any | ((prev: any) => any)) => {
    setFormData(update)
    autoSave()
  }, [autoSave])

  const handleNext = async () => {
    setError(null)
    setIsLoading(true)

    try {
      if (STEPS[currentStep].id === 'basics') {
        await persistStepUpdate({
          display_name: formData.display_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          location: sanitizeLocationUpdate(),
        })
      } else if (STEPS[currentStep].id === 'physical') {
        await persistStepUpdate({
          height_cm: formData.height_cm,
          body_type: formData.body_type,
          hair_color: formData.hair_color,
          eye_color: formData.eye_color,
          skin_tone: formData.skin_tone,
          ethnicity: formData.ethnicity,
          facial_hair: formData.facial_hair,
          fitness_level: formData.fitness_level,
          tattoos: formData.tattoos ? 'yes' : undefined,
          piercings: formData.piercings ? 'yes' : undefined,
        })
      } else if (STEPS[currentStep].id === 'lifestyle') {
        await persistStepUpdate({
          occupation: formData.occupation,
          education: formData.education,
          smoking_status: formData.smoking_status,
          drinking_status: formData.drinking_status,
          cannabis_status: formData.cannabis_status,
          dietary_preferences: formData.dietary_preferences,
        })
      } else if (STEPS[currentStep].id === 'personality') {
        const allowedRelationshipStyles = new Set([
          'monogamous',
          'non-monogamous',
          'polyamorous',
          'open',
          'swinger',
          'other',
          'prefer-not-to-say',
        ])

        await persistStepUpdate({
          bio: formData.bio,
          zodiac_sign: formData.zodiac_sign,
          love_language: formData.love_language,
          personality_type: formData.personality_type.length === 4 ? formData.personality_type : undefined,
          political_views: formData.political_views,
          religion: formData.religion,
          sleep_schedule: formData.sleep_schedule,
          relationship_style: allowedRelationshipStyles.has(formData.relationship_style) ? formData.relationship_style : undefined,
          sexual_orientation: formData.sexual_orientation,
        })
      } else if (STEPS[currentStep].id === 'intimate') {
        await persistStepUpdate({
          breast_size: formData.breast_size,
          penis_length_cm: formData.penis_length_cm,
          penis_girth_cm: formData.penis_girth_cm,
          sti_status: formData.sti_status,
          fetishes: formData.fetishes,
        })
      } else if (STEPS[currentStep].id === 'preferences') {
        const minAge = Math.min(formData.preferences.age_range_min, formData.preferences.age_range_max)
        const maxAge = Math.max(formData.preferences.age_range_min, formData.preferences.age_range_max)

        await persistStepUpdate({
          looking_for: formData.looking_for,
          preferences: {
            age_range_min: minAge,
            age_range_max: maxAge,
          },
        })
      } else if (STEPS[currentStep].id === 'complete') {
        await completeOnboarding(token!)
        // Update local user context to prevent redirect loop
        if (user) {
            updateUser({
                ...user,
                onboarding_completed_at: new Date().toISOString()
            })
        }
        router.push('/dashboard')
        return
      }

      setCurrentStep(prev => prev + 1)
    } catch (err) {
      console.error('Onboarding error:', err)
      const msg = err instanceof Error ? err.message : 'An error occurred'
      setError(`${msg} (Please check console for details)`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    // Cancel any pending auto-save and save immediately before going back
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    // Save current step before navigating back
    const stepId = STEPS[currentStep].id
    const getStepUpdates = (): Record<string, unknown> => {
      if (stepId === 'basics') return { display_name: formData.display_name, date_of_birth: formData.date_of_birth, gender: formData.gender, location: sanitizeLocationUpdate() }
      if (stepId === 'physical') return { height_cm: formData.height_cm, body_type: formData.body_type, hair_color: formData.hair_color, eye_color: formData.eye_color, skin_tone: formData.skin_tone, ethnicity: formData.ethnicity, facial_hair: formData.facial_hair, fitness_level: formData.fitness_level, tattoos: formData.tattoos ? 'yes' : undefined, piercings: formData.piercings ? 'yes' : undefined }
      if (stepId === 'lifestyle') return { occupation: formData.occupation, education: formData.education, smoking_status: formData.smoking_status, drinking_status: formData.drinking_status, cannabis_status: formData.cannabis_status, dietary_preferences: formData.dietary_preferences }
      if (stepId === 'personality') return { bio: formData.bio, zodiac_sign: formData.zodiac_sign, love_language: formData.love_language, personality_type: formData.personality_type, political_views: formData.political_views, religion: formData.religion, sleep_schedule: formData.sleep_schedule, relationship_style: formData.relationship_style, sexual_orientation: formData.sexual_orientation }
      if (stepId === 'intimate') return { breast_size: formData.breast_size, penis_length_cm: formData.penis_length_cm, penis_girth_cm: formData.penis_girth_cm, sti_status: formData.sti_status, fetishes: formData.fetishes }
      if (stepId === 'preferences') return { looking_for: formData.looking_for, preferences: { age_range_min: Math.min(formData.preferences.age_range_min, formData.preferences.age_range_max), age_range_max: Math.max(formData.preferences.age_range_min, formData.preferences.age_range_max) } }
      return {}
    }
    const updates = getStepUpdates()
    if (Object.keys(updates).length > 0) persistStepUpdate(updates)
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 animate-gradient-chaos">FWBer</span>!</h2>
            <p className="text-muted-foreground">
              We&apos;re excited to have you here. Let&apos;s take a moment to set up your profile so you can start meeting people.
            </p>
            <p className="text-sm text-muted-foreground">
              This will only take a minute.
            </p>
          </div>
        )

      case 'basics':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input 
                id="display_name" 
                value={formData.display_name} 
                onChange={e => updateFormData({...formData, display_name: e.target.value})}
                placeholder="What should we call you?"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.date_of_birth ? formData.date_of_birth.split('-')[1] : ''}
                  onChange={e => {
                    const [y, m, d] = formData.date_of_birth ? formData.date_of_birth.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                    updateFormData({...formData, date_of_birth: `${y}-${e.target.value}-${d}`});
                  }}
                >
                  <option value="">Month</option>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, i) => (
                    <option key={i} value={(i + 1).toString().padStart(2, '0')}>{month}</option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.date_of_birth ? formData.date_of_birth.split('-')[2] : ''}
                  onChange={e => {
                    const [y, m, d] = formData.date_of_birth ? formData.date_of_birth.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                    updateFormData({...formData, date_of_birth: `${y}-${m}-${e.target.value}`});
                  }}
                >
                  <option value="">Day</option>
                  {Array.from({length: 31}, (_, i) => {
                    const d = (i + 1).toString().padStart(2, '0');
                    return <option key={d} value={d}>{i + 1}</option>
                  })}
                </select>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.date_of_birth ? formData.date_of_birth.split('-')[0] : ''}
                  onChange={e => {
                    const [y, m, d] = formData.date_of_birth ? formData.date_of_birth.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                    updateFormData({...formData, date_of_birth: `${e.target.value}-${m}-${d}`});
                  }}
                >
                  <option value="">Year</option>
                  {Array.from({length: 100}, (_, i) => {
                    const year = new Date().getFullYear() - 18 - i;
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.gender}
                onChange={e => updateFormData({...formData, gender: e.target.value})}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input 
                  id="city" 
                  value={formData.location.city} 
                  onChange={e => updateFormData({...formData, location: {...formData.location, city: e.target.value}})}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input 
                  id="state" 
                  value={formData.location.state} 
                  onChange={e => updateFormData({...formData, location: {...formData.location, state: e.target.value}})}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={isLoading}>
                <MapPin className="mr-2 h-4 w-4" />
                Use Current Location
              </Button>
              {formData.location.latitude !== 0 && (
                <p className="text-xs text-green-600">
                  Coordinates set: {formData.location.latitude.toFixed(4)}, {formData.location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        )

      case 'photos':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">Add your best photos</h3>
              <p className="text-sm text-muted-foreground">Upload now or skip and add photos later from your profile.</p>
            </div>
            <PhotoUpload 
              photos={photos} 
              onUpload={async (items, onProgress) => {
                await uploadPhotos(items, onProgress)
              }}
              onRemove={(index) => deletePhoto(photos[index].id)}
              maxPhotos={6}
            />
          </div>
        )

      case 'physical':
        return (
          <PhysicalStep formData={formData} setFormData={updateFormData} />
        )

      case 'lifestyle':
        return (
          <LifestyleStep formData={formData} setFormData={updateFormData} />
        )

      case 'personality':
        return (
          <PersonalityStep formData={formData} setFormData={updateFormData} />
        )

      case 'intimate':
        return (
          <IntimateStep formData={formData} setFormData={updateFormData} />
        )

      case 'preferences':
        return (
          <PreferencesStep formData={formData} setFormData={updateFormData} />
        )

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-24 w-24 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">You&apos;re All Set!</h2>
            <p className="text-muted-foreground">
              Your profile is ready. Start exploring and meeting new people.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center mb-4 gap-1 w-full">
            {STEPS.map((step, idx) => (
              <div key={step.id} className={`h-2 flex-1 rounded-full ${idx <= currentStep ? 'bg-blue-600' : 'bg-muted'}`} />
            ))}
          </div>
          <CardTitle>{STEPS[currentStep].title} {saving && <span className="text-xs font-normal text-muted-foreground ml-2">Saving...</span>}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          {renderStep()}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

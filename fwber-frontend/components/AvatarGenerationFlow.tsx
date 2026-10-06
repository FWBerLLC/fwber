'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  Loader2,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Settings,
  Image as ImageIcon,
  Lock,
  Share2,
  Users,
  Camera,
  Wand2,
} from 'lucide-react'
import Image from 'next/image'
import { api } from '@/lib/api/client'

import axios from 'axios'
import { useWebSocket } from '@/lib/hooks/use-websocket'
import { useAuth } from '@/lib/auth-context'

interface AvatarGenerationProps {
  userId: number
  currentAvatarUrl?: string
  onComplete?: (avatarUrl: string) => void
}

interface PhysicalProfile {
  age?: number
  gender?: string
  ethnicity?: string
  body_type?: string
  hair_color?: string
  eye_color?: string
  height_cm?: number
  skin_tone?: string
  facial_hair?: string
  breast_size?: string
  fitness_level?: string
  tattoos?: string[]
  piercings?: string[]
  clothing_style?: string
  occupation?: string
  personality_type?: string
  love_language?: string
  relationship_style?: string
  interests?: string[]
}

interface UserPhoto {
  id: number
  filename: string
  file_path: string
}

interface AvatarTraitsResponse {
  traits: PhysicalProfile
  has_photos: boolean
  photos: UserPhoto[]
}

interface AvatarGalleryPhoto {
  id: number
  url?: string
  thumbnail_url?: string
  file_path?: string
  metadata?: {
    source?: string
    provider?: string
  }
}

interface ProviderConfig {
  model: string
  api_key?: string
  api_token?: string
}

type GenerationMode = 'traits' | 'photo'

export default function AvatarGenerationFlow({
  userId,
  currentAvatarUrl,
  onComplete,
}: AvatarGenerationProps) {
  const [view, setView] = useState<'generate' | 'gallery'>('generate')
  const [mode, setMode] = useState<GenerationMode>('traits')
  const [step, setStep] = useState<'profile' | 'style' | 'generating' | 'preview' | 'complete'>(
    'profile'
  )
  const [profile, setProfile] = useState<PhysicalProfile>({})
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [style, setStyle] = useState<string>('realistic')
  const [sexyBoost, setSexyBoost] = useState(true) // On by default — this is a physical dating app
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null)
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null)
  const [generatedPhotoId, setGeneratedPhotoId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Provider settings
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({})
  const [selectedProvider, setSelectedProvider] = useState<string>('dalle')
  const [customModel, setCustomModel] = useState<string>('')
  const [loraScale, setLoraScale] = useState<number>(0.8)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)

  const { user } = useAuth()
  const { messages, clearMessages } = useWebSocket()

  const styleOptions = [
    { id: 'realistic', name: 'Realistic', desc: 'Professional model look' },
    { id: 'glamour', name: 'Glamour', desc: 'Red carpet ready' },
    { id: 'fantasy', name: 'Fantasy', desc: 'Mythical & magical' },
    { id: 'anime', name: 'Anime', desc: 'Japanese art style' },
    { id: 'neon', name: 'Neon Cyberpunk', desc: 'Futuristic vibes', premium: true },
    { id: 'oil-painting', name: 'Oil Painting', desc: 'Classic masterpiece', premium: true },
  ]

  const isStyleLocked = (option: (typeof styleOptions)[number]) => {
    if (!option.premium) return false
    return (user?.referrals_count || 0) < 1
  }

  const queryClient = useQueryClient()

  // Auto-load physical traits from user profile
  const traitsQuery = useQuery({
    queryKey: ['avatar-physical-traits'],
    queryFn: async (): Promise<AvatarTraitsResponse> => {
      return await api.get('/avatar/physical-traits')

      const token = localStorage.getItem('fwber_token')
      let res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/avatar/physical-traits`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
    },
  })

  // Auto-populate profile when traits load
  useEffect(() => {
    if (traitsQuery.data?.traits && !profileLoaded) {
      const traits = traitsQuery.data.traits
      const loaded: PhysicalProfile = {}
      if (traits.age) loaded.age = traits.age
      if (traits.gender) loaded.gender = traits.gender
      if (traits.ethnicity) loaded.ethnicity = traits.ethnicity
      if (traits.body_type) loaded.body_type = traits.body_type
      if (traits.hair_color) loaded.hair_color = traits.hair_color
      if (traits.eye_color) loaded.eye_color = traits.eye_color
      if (traits.height_cm) loaded.height_cm = traits.height_cm
      if (traits.skin_tone) loaded.skin_tone = traits.skin_tone
      if (traits.facial_hair) loaded.facial_hair = traits.facial_hair
      if (traits.breast_size) loaded.breast_size = traits.breast_size
      if (traits.fitness_level) loaded.fitness_level = traits.fitness_level
      if (traits.tattoos) loaded.tattoos = traits.tattoos
      if (traits.piercings) loaded.piercings = traits.piercings
      if (traits.clothing_style) loaded.clothing_style = traits.clothing_style
      if (traits.occupation) loaded.occupation = traits.occupation
      if (traits.personality_type) loaded.personality_type = traits.personality_type
      if (traits.love_language) loaded.love_language = traits.love_language
      if (traits.relationship_style) loaded.relationship_style = traits.relationship_style
      if (traits.interests) loaded.interests = traits.interests

      setProfile(loaded)
      setProfileLoaded(true)
    }
  }, [traitsQuery.data, profileLoaded])

  // Listen for avatar generation completion via WebSocket
  useEffect(() => {
    if (step === 'generating') {
      const avatarMsg = messages.find(
        (m: any) =>
          m.type === 'avatar_generated' ||
          (m.type === 'notification' &&
            (m.data?.type === 'avatar_generated' ||
              m.data?.notification?.type === 'avatar_generated'))
      )

      if (avatarMsg) {
        const data = (avatarMsg as any).data?.notification || (avatarMsg as any).data
        if (data?.url) {
          setGeneratedAvatar(data.url)
          setGeneratedPhotoId(data.photo_id)
          setStep('preview')
          setError(null)
        }
      }
    }
  }, [messages, step])

  const galleryQuery = useQuery({
    queryKey: ['avatar-gallery'],
    queryFn: async (): Promise<AvatarGalleryPhoto[]> => {
      const galleryRes = await api.get<{ data: AvatarGalleryPhoto[] }>('/photos')
      const photos: AvatarGalleryPhoto[] = (galleryRes as any)?.data || []
      return photos.filter((photo: any) => photo.metadata?.source === 'ai')
    },
    enabled: view === 'gallery',
  })

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const provRes = await api.get<{ providers: Record<string, ProviderConfig> }>(
          '/avatar/providers'
        )
        setProviders((provRes as any)?.data?.providers || (provRes as any)?.providers || {})
      } catch (e) {
        console.error('Failed to fetch providers', e)
      }
    }
    fetchProviders()
  }, [])

  // Traits-based generation
  const generateMutation = useMutation({
    mutationFn: async (profileData: PhysicalProfile) => {
      const token = localStorage.getItem('fwber_token')
      const payload: Record<string, unknown> = {
        ...profileData,
        style,
        sexy_boost: sexyBoost,
        provider: selectedProvider,
      }

      if (customModel) payload.model = customModel
      if (selectedProvider === 'replicate') payload.lora_scale = loraScale

      return await api.post('/avatar/generate', payload)

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/avatar/generate`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data
    },
    onSuccess: (data: any) => {
      if (data.avatar_url) {
        setGeneratedAvatar(data.avatar_url)
        setGeneratedPhotoId(data.photo_id)
        setStep('preview')
        setError(null)
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to generate avatar')
      setStep('profile')
    },
  })

  // Photo-based generation (img2img)
  const generateFromPhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return await api.post('/avatar/generate-from-photo', {
        photo_id: photoId,
        style,
        sexy_boost: sexyBoost,
        provider: selectedProvider,
      })
    },
    onSuccess: (data: any) => {
      if (data.avatar_url) {
        setGeneratedAvatar(data.avatar_url)
        setStep('preview')
        setError(null)
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to generate avatar from photo')
      setStep('style')
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await api.put('/profile', { avatar_url: generatedAvatar })

      if (generatedPhotoId) {
        await api.put(`/photos/${generatedPhotoId}`, { is_primary: true })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      queryClient.invalidateQueries({ queryKey: ['avatar-gallery'] })
      setStep('complete')
      if (onComplete && generatedAvatar) {
        onComplete(generatedAvatar)
      }
    },
  })

  const handleShare = () => {
    if (!user?.referral_code) return
    const text = encodeURIComponent('Check out my AI Avatar on @fwber! Sign up for 50 free tokens:')
    const url = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://fwber.site'}/?ref=${user.referral_code}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const handleGenerate = () => {
    clearMessages()
    setStep('generating')
    setError(null)

    if (mode === 'photo' && selectedPhotoId) {
      generateFromPhotoMutation.mutate(selectedPhotoId)
    } else {
      generateMutation.mutate(profile)
    }
  }

  const handleProfileSubmit = () => {
    setStep('style')
  }

  const handleRegenerate = () => {
    clearMessages()
    setStep('generating')
    if (mode === 'photo' && selectedPhotoId) {
      generateFromPhotoMutation.mutate(selectedPhotoId)
    } else {
      generateMutation.mutate(profile)
    }
  }

  const handleAccept = () => {
    acceptMutation.mutate()
  }

  const handleReject = () => {
    setStep('profile')
    setGeneratedAvatar(null)
  }

  const isProfileComplete = () => {
    return (
      profile.age &&
      profile.gender &&
      profile.ethnicity &&
      profile.body_type &&
      profile.hair_color &&
      profile.eye_color
    )
  }

  const userPhotos: UserPhoto[] = traitsQuery.data?.photos || []

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* View Toggle */}
      <div className="mb-6 flex justify-center">
        <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setView('generate')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              view === 'generate'
                ? 'bg-white text-purple-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => setView('gallery')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              view === 'gallery'
                ? 'bg-white text-purple-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Gallery
          </button>
        </div>
      </div>

      {view === 'gallery' ? (
        <div className="space-y-6">
          <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
            My AI Avatars
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {galleryQuery.isLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : galleryQuery.data?.length === 0 ? (
              <div className="col-span-full rounded-lg bg-gray-50 py-12 text-center dark:bg-gray-900">
                <ImageIcon className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">No AI avatars generated yet.</p>
                <button
                  onClick={() => setView('generate')}
                  className="mt-4 font-medium text-purple-600 hover:underline"
                >
                  Create your first avatar
                </button>
              </div>
            ) : (
              galleryQuery.data?.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square group relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                >
                  <Image
                    src={photo.url || photo.thumbnail_url || ''}
                    alt="AI Avatar"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setGeneratedAvatar(photo.url || photo.thumbnail_url || null)
                        setGeneratedPhotoId(photo.id)
                        setStep('preview')
                        setView('generate')
                      }}
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold text-purple-600 hover:bg-purple-50 dark:bg-gray-800"
                    >
                      Preview
                    </button>
                    <span className="rounded bg-black/30 px-2 py-0.5 text-[10px] text-white">
                      {photo.metadata?.provider || 'AI'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <StepIndicator
                active={step === 'profile'}
                completed={step !== 'profile'}
                label="Source"
              />
              <div className="mx-2 h-0.5 flex-1 bg-gray-200">
                <div
                  className={`h-full bg-purple-600 transition-all duration-300 ${
                    step !== 'profile' ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
              <StepIndicator
                active={step === 'style'}
                completed={step === 'generating' || step === 'preview' || step === 'complete'}
                label="Style"
              />
              <div className="mx-2 h-0.5 flex-1 bg-gray-200">
                <div
                  className={`h-full bg-purple-600 transition-all duration-300 ${
                    step === 'generating' || step === 'preview' || step === 'complete'
                      ? 'w-full'
                      : 'w-0'
                  }`}
                />
              </div>
              <StepIndicator
                active={step === 'generating'}
                completed={step === 'preview' || step === 'complete'}
                label="Generate"
              />
              <div className="mx-2 h-0.5 flex-1 bg-gray-200">
                <div
                  className={`h-full bg-purple-600 transition-all duration-300 ${
                    step === 'preview' || step === 'complete' ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
              <StepIndicator
                active={step === 'preview'}
                completed={step === 'complete'}
                label="Preview"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <h4 className="font-semibold text-red-900">Generation Failed</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Source Selection — Traits or Photo */}
          {step === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Create Your Stylized Avatar
                </h2>
                <p className="text-gray-600">
                  Generate an attractive, stylized version of yourself from your saved physical
                  traits or an uploaded photo.
                </p>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-900">
                We reuse the detailed physical and private matching traits you&apos;ve already saved
                in your profile to make avatars more accurate, while uploaded photos can anchor
                likeness for stronger identity matching.
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('traits')}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    mode === 'traits'
                      ? 'border-purple-600 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Wand2
                    className={`h-8 w-8 ${mode === 'traits' ? 'text-purple-600' : 'text-gray-400'}`}
                  />
                  <span className="text-sm font-semibold">From Physical Traits</span>
                  <span className="text-xs text-gray-500">Auto-filled from your profile</span>
                </button>
                <button
                  onClick={() => setMode('photo')}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    mode === 'photo'
                      ? 'border-purple-600 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Camera
                    className={`h-8 w-8 ${mode === 'photo' ? 'text-purple-600' : 'text-gray-400'}`}
                  />
                  <span className="text-sm font-semibold">From My Photo</span>
                  <span className="text-xs text-gray-500">AI transforms your pic</span>
                </button>
              </div>

              {/* Traits Mode */}
              {mode === 'traits' && (
                <>
                  {profileLoaded && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Traits loaded from your profile
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Age
                      </label>
                      <input
                        type="number"
                        min="18"
                        max="100"
                        value={profile.age || ''}
                        onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                        placeholder="25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Gender
                      </label>
                      <select
                        aria-label="Select gender"
                        value={profile.gender || ''}
                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Ethnicity
                      </label>
                      <select
                        aria-label="Select ethnicity"
                        value={profile.ethnicity || ''}
                        onChange={(e) => setProfile({ ...profile, ethnicity: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                      >
                        <option value="">Select ethnicity</option>
                        <option value="asian">Asian</option>
                        <option value="black">Black</option>
                        <option value="hispanic">Hispanic/Latino</option>
                        <option value="white">White</option>
                        <option value="middle_eastern">Middle Eastern</option>
                        <option value="mixed">Mixed</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Body Type
                      </label>
                      <select
                        aria-label="Select body type"
                        value={profile.body_type || ''}
                        onChange={(e) => setProfile({ ...profile, body_type: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                      >
                        <option value="">Select body type</option>
                        <option value="slim">Slim</option>
                        <option value="athletic">Athletic</option>
                        <option value="average">Average</option>
                        <option value="curvy">Curvy</option>
                        <option value="heavyset">Heavyset</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Hair Color
                      </label>
                      <select
                        aria-label="Select hair color"
                        value={profile.hair_color || ''}
                        onChange={(e) => setProfile({ ...profile, hair_color: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                      >
                        <option value="">Select hair color</option>
                        <option value="black">Black</option>
                        <option value="brown">Brown</option>
                        <option value="blonde">Blonde</option>
                        <option value="red">Red</option>
                        <option value="gray">Gray</option>
                        <option value="bald">Bald</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Eye Color
                      </label>
                      <select
                        aria-label="Select eye color"
                        value={profile.eye_color || ''}
                        onChange={(e) => setProfile({ ...profile, eye_color: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                      >
                        <option value="">Select eye color</option>
                        <option value="brown">Brown</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="hazel">Hazel</option>
                        <option value="gray">Gray</option>
                        <option value="amber">Amber</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        min="140"
                        max="220"
                        value={profile.height_cm || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, height_cm: parseInt(e.target.value) })
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                        placeholder="170"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fitness Level
                      </label>
                      <select
                        aria-label="Select fitness level"
                        value={profile.fitness_level || ''}
                        onChange={(e) => setProfile({ ...profile, fitness_level: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                      >
                        <option value="">Select fitness level</option>
                        <option value="lean">Lean</option>
                        <option value="fit">Fit</option>
                        <option value="toned">Toned</option>
                        <option value="muscular">Muscular</option>
                        <option value="average">Average</option>
                      </select>
                    </div>

                    {profile.gender && ['female', 'non-binary'].includes(profile.gender) && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Breast Size
                        </label>
                        <select
                          aria-label="Select breast size"
                          value={profile.breast_size || ''}
                          onChange={(e) => setProfile({ ...profile, breast_size: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                        >
                          <option value="">Select size</option>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    )}

                    {profile.gender && ['male'].includes(profile.gender) && (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Facial Hair
                        </label>
                        <select
                          aria-label="Select facial hair"
                          value={profile.facial_hair || ''}
                          onChange={(e) => setProfile({ ...profile, facial_hair: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500 dark:border-gray-600"
                        >
                          <option value="">Select style</option>
                          <option value="none">Clean shaven</option>
                          <option value="stubble">Stubble</option>
                          <option value="beard">Full beard</option>
                          <option value="goatee">Goatee</option>
                          <option value="mustache">Mustache</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Photo Mode */}
              {mode === 'photo' && (
                <div>
                  {userPhotos.length === 0 ? (
                    <div className="rounded-lg bg-gray-50 py-8 text-center dark:bg-gray-900">
                      <Camera className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                      <p className="mb-2 text-gray-500">No photos uploaded yet</p>
                      <p className="text-sm text-gray-400">
                        Upload photos to your profile first, then come back here.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-3 text-sm text-gray-600">
                        Select a photo to transform into a stylized avatar:
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {userPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhotoId(photo.id)}
                            className={`aspect-square border-3 relative overflow-hidden rounded-lg transition-all ${
                              selectedPhotoId === photo.id
                                ? 'scale-105 border-purple-600 shadow-lg ring-2 ring-purple-300'
                                : 'border-transparent hover:border-purple-300'
                            }`}
                          >
                            <Image
                              src={`${(
                                process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site'
                              ).replace('/api', '')}/storage/${photo.file_path || photo.filename}`}
                              alt="Your photo"
                              fill
                              className="object-cover"
                            />
                            {selectedPhotoId === photo.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-purple-600/20">
                                <Check className="h-8 w-8 text-white drop-shadow-lg" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleProfileSubmit}
                disabled={mode === 'traits' ? !isProfileComplete() : !selectedPhotoId}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700 hover:shadow-xl disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300"
              >
                <Sparkles className="h-5 w-5" />
                Continue to Style Selection
              </button>
            </div>
          )}

          {/* Step 2: Style Selection + Style Boost */}
          {step === 'style' && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Choose Your Look
                </h2>
                <p className="text-gray-600">Select a style and boost level for your avatar.</p>
              </div>

              {/* Style Boost Toggle */}
              <div className="rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                      <Sparkles className="h-5 w-5 text-pink-500" />
                      Style Boost
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Maximize attractiveness — model-quality features, alluring gaze, perfect
                      lighting
                    </p>
                  </div>
                  <button
                    onClick={() => setSexyBoost(!sexyBoost)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      sexyBoost ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform dark:bg-gray-800 ${
                        sexyBoost ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {styleOptions.map((option) => {
                  const locked = isStyleLocked(option)
                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        if (locked) {
                          setShowReferralModal(true)
                        } else {
                          setStyle(option.id)
                        }
                      }}
                      className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        style === option.id ? 'border-purple-600 bg-purple-50' : 'border-gray-300'
                      } ${locked ? 'bg-gray-50 opacity-70' : 'hover:border-purple-300'}`}
                    >
                      {locked && (
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-gray-900/10 p-1">
                          <Lock className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                      {option.premium && !locked && (
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-yellow-100 p-1">
                          <Sparkles className="h-4 w-4 text-yellow-600" />
                        </div>
                      )}
                      <div className="mb-2 flex h-24 w-full items-center justify-center rounded-md bg-gray-200">
                        <span className="text-sm text-gray-500">{option.name}</span>
                      </div>
                      <p className="text-center font-medium capitalize">{option.name}</p>
                      <p className="text-center text-xs text-gray-500">{option.desc}</p>
                    </div>
                  )
                })}
              </div>

              {showReferralModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="animate-in fade-in zoom-in w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl duration-200 dark:bg-gray-800">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="rounded-full bg-purple-100 p-3">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <button
                        onClick={() => setShowReferralModal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                      Unlock Premium Styles
                    </h3>
                    <p className="mb-6 text-gray-600">
                      Invite just 1 friend to unlock Neon Cyberpunk, Oil Painting, and other premium
                      styles forever.
                    </p>
                    <button
                      onClick={handleShare}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-bold text-white transition-colors hover:bg-purple-700"
                    >
                      <Share2 className="h-5 w-5" />
                      Invite a Friend
                    </button>
                  </div>
                </div>
              )}

              {/* Advanced Settings Toggle */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-white"
                >
                  <Settings className="h-4 w-4" />
                  {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      AI Provider
                    </label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600"
                      title="Select AI Provider"
                    >
                      {Object.keys(providers).map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Model / Version
                    </label>
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder={providers[selectedProvider]?.model || 'Default Model'}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty to use default.</p>
                  </div>

                  {selectedProvider === 'replicate' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        LoRA Scale ({loraScale})
                      </label>
                      <input
                        type="range"
                        aria-label="LoRA Scale"
                        min="0"
                        max="1"
                        step="0.1"
                        value={loraScale}
                        onChange={(e) => setLoraScale(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('profile')}
                  className="rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:border-purple-600 hover:text-purple-600 dark:border-gray-600 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-purple-700 hover:to-pink-700"
                >
                  {sexyBoost ? '🔥 Generate Stylized Avatar' : 'Generate Avatar'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-purple-600" />
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {mode === 'photo' ? 'Transforming Your Photo...' : 'Generating Your Avatar...'}
              </h3>
              <p className="text-gray-600">
                {sexyBoost
                  ? 'Our AI is creating a stunning, head-turning version of you...'
                  : 'Our AI is creating a unique avatar based on your profile...'}
              </p>
              <div className="mt-8 flex justify-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-600" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-600 delay-150" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-600 delay-300" />
              </div>
            </div>
          )}

          {/* Step 4: Preview & Accept/Reject */}
          {step === 'preview' && generatedAvatar && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Your New Avatar
                </h2>
                <p className="text-gray-600">
                  Review your AI-generated avatar. You can regenerate if you&apos;d like a different
                  result.
                </p>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <Image
                    src={generatedAvatar}
                    alt="Generated avatar"
                    width={256}
                    height={256}
                    className="h-64 w-64 rounded-full border-4 border-purple-200 object-cover shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 rounded-full bg-purple-600 p-2 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="mb-6 flex justify-center">
                <button
                  onClick={handleShare}
                  className="flex w-full transform items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Share2 className="h-5 w-5" />
                  Share & Earn 50 $FWB
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleRegenerate}
                  disabled={generateMutation.isPending || generateFromPhotoMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:border-purple-600 hover:text-purple-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                >
                  <RefreshCw className="h-5 w-5" />
                  Regenerate
                </button>

                <button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white transition-all hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  <Check className="h-5 w-5" />
                  {acceptMutation.isPending ? 'Saving...' : 'Accept Avatar'}
                </button>
              </div>

              <button
                onClick={handleReject}
                className="w-full text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-300"
              >
                Start over with different source
              </button>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                Avatar Created!
              </h3>
              <p className="mb-6 text-gray-600">
                Your AI-generated avatar is now active on your profile.
              </p>
              {generatedAvatar && (
                <Image
                  src={generatedAvatar}
                  alt="Your avatar"
                  width={128}
                  height={128}
                  className="mx-auto h-32 w-32 rounded-full border-4 border-green-200 object-cover"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StepIndicator({
  active,
  completed,
  label,
}: {
  active: boolean
  completed: boolean
  label: string
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
          completed
            ? 'border-purple-600 bg-purple-600'
            : active
              ? 'border-purple-600 bg-white'
              : 'border-gray-300 bg-white'
        }`}
      >
        {completed ? (
          <Check className="h-5 w-5 text-white" />
        ) : (
          <span className={`text-sm font-semibold ${active ? 'text-purple-600' : 'text-gray-400'}`}>
            {label === 'Source' ? '1' : label === 'Style' ? '2' : label === 'Generate' ? '3' : '4'}
          </span>
        )}
      </div>
      <span
        className={`mt-1 text-xs font-medium ${
          active || completed ? 'text-purple-600' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

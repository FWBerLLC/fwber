'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  User, Mail, MapPin, Calendar, Heart, MessageSquare, 
  Save, Loader2, CheckCircle2, AlertCircle, Info, Eye, EyeOff, Sparkles 
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { BioGenerator } from '@/components/ai/BioGenerator';
import { ProfileAnalysis } from '@/components/profile/ProfileAnalysis';
import { ProfileRoast } from '@/components/profile/ProfileRoast';
import { VibeCheck } from '@/components/profile/VibeCheck';
import { DatingFortune } from '@/components/profile/DatingFortune';
import { CosmicMatch } from '@/components/profile/CosmicMatch';
import { NemesisFinder } from '@/components/profile/NemesisFinder';

import { UserProfile } from '@/lib/api/types';

interface ValidationErrors {
  [key: string]: string;
}

export default function EnhancedProfileEditor() {
  const [profile, setProfile] = useState<Partial<UserProfile> & { email?: string }>({
    display_name: '',
    email: '',
    looking_for: [],
    interests: [],
    languages: [],
    fetishes: [],
    sti_status: {},
    social_media: {},
    preferences: {},
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current profile
  const { data: currentProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await api.get<any>('/user');
      // Merge user and profile data
      return {
        ...response.profile,
        email: response.email,
        display_name: response.profile?.display_name || response.name,
      };
    },
  });

  useEffect(() => {
    if (currentProfile) {
      setProfile(currentProfile);
    }
  }, [currentProfile]);

  // Real-time validation
  useEffect(() => {
    const newErrors: ValidationErrors = {};

    if (touched.has('display_name') && !profile.display_name) {
      newErrors.display_name = 'Name is required';
    } else if (touched.has('display_name') && (profile.display_name?.length || 0) < 2) {
      newErrors.display_name = 'Name must be at least 2 characters';
    }

    if (touched.has('bio') && profile.bio && profile.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    if (touched.has('birthdate') && !profile.birthdate) {
      newErrors.birthdate = 'Date of birth is required';
    }
    
    setErrors(newErrors);
  }, [profile, touched]);

  const updateMutation = useMutation({
    mutationFn: async (updatedProfile: Partial<UserProfile>) => {
      return api.put<UserProfile>('/user/profile', updatedProfile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
  });

  const handleChange = (field: keyof UserProfile | 'email', value: any) => {
    setProfile({ ...profile, [field]: value });
    setTouched(prev => new Set(prev).add(field));
  };

  const handleArrayToggle = (field: 'looking_for' | 'interests' | 'languages' | 'interested_in' | 'fetishes', value: string) => {
    const current = Array.isArray(profile[field]) ? (profile[field] as string[]) : [];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    handleChange(field, updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allFields = Object.keys(profile);
    setTouched(new Set(allFields));

    // Check for errors
    if (Object.keys(errors).length === 0) {
      updateMutation.mutate(profile);
    }
  };

  const calculateCompleteness = () => {
    const requiredFields = ['display_name', 'email', 'birthdate', 'gender', 'bio'];
    const optionalFields = ['location_name', 'interested_in', 'interests', 'looking_for', 'relationship_status'];
    
    let completed = 0;
    let total = requiredFields.length + optionalFields.length;

    requiredFields.forEach(field => {
      if (profile[field as keyof typeof profile]) completed++;
    });

    optionalFields.forEach(field => {
      const value = profile[field as keyof typeof profile];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) completed++;
    });

    return Math.round((completed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const completeness = calculateCompleteness();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Completeness */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Edit Profile</h1>
            <p className="text-muted-foreground mt-1">Update your information and preferences</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">Profile Completeness</div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <span className="text-lg font-bold text-purple-600">{completeness}%</span>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">Profile updated successfully!</span>
          </div>
        )}

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && touched.size > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Please fix the following errors:</h4>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Wingman Insights */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Wingman Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ProfileAnalysis />
          <ProfileRoast />
          <VibeCheck />
          <DatingFortune />
          <CosmicMatch />
          <NemesisFinder />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* About Myself */}
        <Section title="About Myself" icon={<User />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              required
              error={errors.display_name}
              touched={touched.has('display_name')}
            >
              <input
                type="text"
                value={profile.display_name || ''}
                onChange={(e) => handleChange('display_name', e.target.value)}
                onBlur={() => setTouched(prev => new Set(prev).add('display_name'))}
                className={inputClassName(errors.display_name, touched.has('display_name'))}
                placeholder="Your display name"
              />
            </FormField>

            <FormField
              label="Email"
              required
              error={errors.email}
              touched={touched.has('email')}
            >
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => setTouched(prev => new Set(prev).add('email'))}
                className={inputClassName(errors.email, touched.has('email'))}
                placeholder="your@email.com"
              />
            </FormField>

            <FormField
              label="Date of Birth"
              required
              error={errors.birthdate}
              touched={touched.has('birthdate')}
            >
              <div className="grid grid-cols-3 gap-2">
                <select
                  title="Month"
                  value={profile.birthdate ? profile.birthdate.split('-')[1] : ''}
                  onChange={(e) => {
                    const [y, m, d] = profile.birthdate ? profile.birthdate.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                    handleChange('birthdate', `${y}-${e.target.value}-${d}`);
                  }}
                  onBlur={() => setTouched(prev => new Set(prev).add('birthdate'))}
                  className={inputClassName(errors.birthdate, touched.has('birthdate'))}
                >
                  <option value="">Month</option>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, i) => (
                    <option key={i} value={(i + 1).toString().padStart(2, '0')}>{month}</option>
                  ))}
                </select>
                <select
                  title="Day"
                  value={profile.birthdate ? profile.birthdate.split('-')[2] : ''}
                  onChange={(e) => {
                    const [y, m, d] = profile.birthdate ? profile.birthdate.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                    handleChange('birthdate', `${y}-${m}-${e.target.value}`);
                  }}
                  onBlur={() => setTouched(prev => new Set(prev).add('birthdate'))}
                  className={inputClassName(errors.birthdate, touched.has('birthdate'))}
                >
                  <option value="">Day</option>
                  {Array.from({length: 31}, (_, i) => {
                    const d = (i + 1).toString().padStart(2, '0');
                    return <option key={d} value={d}>{i + 1}</option>
                  })}
                </select>
                <select
                  title="Year"
                  value={profile.birthdate ? profile.birthdate.split('-')[0] : ''}
                  onChange={(e) => {
                    const [y, m, d] = profile.birthdate ? profile.birthdate.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                    handleChange('birthdate', `${e.target.value}-${m}-${d}`);
                  }}
                  onBlur={() => setTouched(prev => new Set(prev).add('birthdate'))}
                  className={inputClassName(errors.birthdate, touched.has('birthdate'))}
                >
                  <option value="">Year</option>
                  {Array.from({length: 100}, (_, i) => {
                    const year = new Date().getFullYear() - 18 - i;
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>
            </FormField>

            <FormField label="Gender" required>
              <select
                title="Gender"
                value={profile.gender || ''}
                onChange={(e) => handleChange('gender', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Pronouns">
              <select
                title="Pronouns"
                value={profile.pronouns || ''}
                onChange={(e) => handleChange('pronouns', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select pronouns</option>
                <option value="he/him">He/Him</option>
                <option value="she/her">She/Her</option>
                <option value="they/them">They/Them</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Sexual Orientation">
              <select
                title="Sexual Orientation"
                value={profile.sexual_orientation || ''}
                onChange={(e) => handleChange('sexual_orientation', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select orientation</option>
                <option value="straight">Straight</option>
                <option value="gay">Gay</option>
                <option value="lesbian">Lesbian</option>
                <option value="bisexual">Bisexual</option>
                <option value="pansexual">Pansexual</option>
                <option value="asexual">Asexual</option>
                <option value="queer">Queer</option>
                <option value="questioning">Questioning</option>
              </select>
            </FormField>

            <FormField label="Zodiac Sign">
              <select
                title="Zodiac Sign"
                value={profile.zodiac_sign || ''}
                onChange={(e) => handleChange('zodiac_sign', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select sign</option>
                <option value="aries">Aries</option>
                <option value="taurus">Taurus</option>
                <option value="gemini">Gemini</option>
                <option value="cancer">Cancer</option>
                <option value="leo">Leo</option>
                <option value="virgo">Virgo</option>
                <option value="libra">Libra</option>
                <option value="scorpio">Scorpio</option>
                <option value="sagittarius">Sagittarius</option>
                <option value="capricorn">Capricorn</option>
                <option value="aquarius">Aquarius</option>
                <option value="pisces">Pisces</option>
              </select>
            </FormField>

            <FormField label="Languages">
              <div className="flex flex-wrap gap-2">
                {['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Hindi'].map(lang => (
                  <ToggleChip
                    key={lang}
                    label={lang}
                    selected={(profile.languages || []).includes(lang)}
                    onClick={() => handleArrayToggle('languages', lang)}
                  />
                ))}
              </div>
            </FormField>
          </div>

          <FormField
            label="Bio"
            required
            error={errors.bio}
            touched={touched.has('bio')}
            hint={profile.bio ? `${profile.bio.length}/500 characters` : '0/500 characters'}
          >
            <div className="space-y-3">
              <textarea
                value={profile.bio || ''}
                onChange={(e) => handleChange('bio', e.target.value)}
                onBlur={() => setTouched(prev => new Set(prev).add('bio'))}
                className={`${inputClassName(errors.bio, touched.has('bio'))} min-h-[100px]`}
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
              <BioGenerator 
                currentBio={profile.bio || ''}
                onSelectBio={(bio) => handleChange('bio', bio)}
              />
            </div>
          </FormField>
        </Section>

        {/* Location */}
        <Section title="Location" icon={<MapPin />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Location Name">
              <input
                type="text"
                value={profile.location_name || ''}
                onChange={(e) => handleChange('location_name', e.target.value)}
                className={inputClassName()}
                placeholder="City, State"
              />
            </FormField>
          </div>
        </Section>

        {/* Looking For */}
        <Section title="Looking For" icon={<Heart />}>
          <FormField label="Interested In">
            <div className="flex flex-wrap gap-2">
              {['men', 'women', 'non-binary', 'everyone'].map(option => (
                <ToggleChip
                  key={option}
                  label={option.charAt(0).toUpperCase() + option.slice(1)}
                  selected={(profile.interested_in || []).includes(option)}
                  onClick={() => handleArrayToggle('interested_in', option)}
                />
              ))}
            </div>
          </FormField>

          <FormField label="Looking For">
            <div className="flex flex-wrap gap-2">
              {['casual', 'friends', 'dating', 'relationship', 'not-sure'].map(option => (
                <ToggleChip
                  key={option}
                  label={option.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  selected={(profile.looking_for || []).includes(option)}
                  onClick={() => handleArrayToggle('looking_for', option)}
                />
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Relationship Status">
              <select
                title="Relationship Status"
                value={profile.relationship_status || ''}
                onChange={(e) => handleChange('relationship_status', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select status</option>
                <option value="single">Single</option>
                <option value="divorced">Divorced</option>
                <option value="separated">Separated</option>
                <option value="widowed">Widowed</option>
                <option value="open-relationship">Open Relationship</option>
              </select>
            </FormField>

            <FormField label="Relationship Style">
              <select
                title="Relationship Style"
                value={profile.relationship_style || ''}
                onChange={(e) => handleChange('relationship_style', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select style</option>
                <option value="monogamous">Monogamous</option>
                <option value="non-monogamous">Non-monogamous</option>
                <option value="open">Open</option>
                <option value="polyamorous">Polyamorous</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Relationship Goals">
              <select
                title="Relationship Goals"
                value={profile.relationship_goals || ''}
                onChange={(e) => handleChange('relationship_goals', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select goal</option>
                <option value="long-term">Long-term partner</option>
                <option value="long-term-open">Long-term, open to short</option>
                <option value="short-term-open">Short-term, open to long</option>
                <option value="short-term">Short-term fun</option>
                <option value="friends">New friends</option>
                <option value="figuring-out">Still figuring it out</option>
              </select>
            </FormField>
          </div>
        </Section>

        {/* Interests */}
        <Section title="Interests & Hobbies" icon={<MessageSquare />}>
          <FormField label="Select your interests" hint="Choose all that apply">
            <div className="flex flex-wrap gap-2">
              {['music', 'movies', 'sports', 'gaming', 'travel', 'cooking', 'reading', 'art', 'fitness', 'outdoors', 'tech', 'nightlife', 'photography', 'dancing', 'foodie', 'fashion', 'politics', 'volunteering', 'hot tubs', 'saunas', 'spas'].map(interest => (
                <ToggleChip
                  key={interest}
                  label={interest.charAt(0).toUpperCase() + interest.slice(1)}
                  selected={(profile.interests || []).includes(interest)}
                  onClick={() => handleArrayToggle('interests', interest)}
                />
              ))}
            </div>
          </FormField>
        </Section>

        {/* Physical Attributes */}
        <Section title="Physical Attributes" icon={<User />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Height (cm)" error={errors.height_cm} touched={touched.has('height_cm')}>
              <input
                type="number"
                value={profile.height_cm || ''}
                onChange={(e) => handleChange('height_cm', parseInt(e.target.value))}
                onBlur={() => setTouched(prev => new Set(prev).add('height_cm'))}
                className={inputClassName(errors.height_cm, touched.has('height_cm'))}
                placeholder="170"
                min="140"
                max="220"
              />
            </FormField>

            <FormField label="Body Type">
              <select
                title="Body Type"
                value={profile.body_type || ''}
                onChange={(e) => handleChange('body_type', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="slim">Slim</option>
                <option value="athletic">Athletic</option>
                <option value="average">Average</option>
                <option value="curvy">Curvy</option>
                <option value="heavyset">Heavyset</option>
              </select>
            </FormField>

            <FormField label="Ethnicity">
              <select
                title="Ethnicity"
                value={profile.ethnicity || ''}
                onChange={(e) => handleChange('ethnicity', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="asian">Asian</option>
                <option value="black">Black</option>
                <option value="hispanic">Hispanic/Latino</option>
                <option value="white">White</option>
                <option value="middle_eastern">Middle Eastern</option>
                <option value="mixed">Mixed</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Breast Size">
              <select
                title="Breast Size"
                value={profile.breast_size || ''}
                onChange={(e) => handleChange('breast_size', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="flat">Flat</option>
                <option value="a-cup">A Cup</option>
                <option value="b-cup">B Cup</option>
                <option value="c-cup">C Cup</option>
                <option value="d-cup">D Cup</option>
                <option value="dd-cup">DD+ Cup</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </FormField>

            <FormField label="Tattoos">
              <select
                title="Tattoos"
                value={profile.tattoos || ''}
                onChange={(e) => handleChange('tattoos', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="some">Some</option>
                <option value="many">Many</option>
                <option value="full-sleeve">Full Sleeve(s)</option>
                <option value="heavily-inked">Heavily Inked</option>
              </select>
            </FormField>

            <FormField label="Piercings">
              <select
                title="Piercings"
                value={profile.piercings || ''}
                onChange={(e) => handleChange('piercings', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="ears">Ears Only</option>
                <option value="face">Face</option>
                <option value="body">Body</option>
                <option value="intimate">Intimate</option>
                <option value="multiple">Multiple Locations</option>
              </select>
            </FormField>

            <FormField label="Hair Color">
              <select
                title="Hair Color"
                value={profile.hair_color || ''}
                onChange={(e) => handleChange('hair_color', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="black">Black</option>
                <option value="brown">Brown</option>
                <option value="blonde">Blonde</option>
                <option value="red">Red</option>
                <option value="auburn">Auburn</option>
                <option value="grey">Grey</option>
                <option value="white">White</option>
                <option value="bald">Bald</option>
                <option value="dyed">Dyed/Unnatural</option>
              </select>
            </FormField>

            <FormField label="Eye Color">
              <select
                title="Eye Color"
                value={profile.eye_color || ''}
                onChange={(e) => handleChange('eye_color', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="brown">Brown</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="hazel">Hazel</option>
                <option value="grey">Grey</option>
                <option value="amber">Amber</option>
                <option value="heterochromia">Heterochromia</option>
              </select>
            </FormField>

            <FormField label="Skin Tone">
              <select
                title="Skin Tone"
                value={profile.skin_tone || ''}
                onChange={(e) => handleChange('skin_tone', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="fair">Fair</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="olive">Olive</option>
                <option value="tan">Tan</option>
                <option value="brown">Brown</option>
                <option value="dark">Dark</option>
              </select>
            </FormField>

            <FormField label="Facial Hair">
              <select
                title="Facial Hair"
                value={profile.facial_hair || ''}
                onChange={(e) => handleChange('facial_hair', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="clean-shaven">Clean Shaven</option>
                <option value="stubble">Stubble</option>
                <option value="beard">Beard</option>
                <option value="mustache">Mustache</option>
                <option value="goatee">Goatee</option>
              </select>
            </FormField>

            <FormField label="Fitness Level">
              <select
                title="Fitness Level"
                value={profile.fitness_level || ''}
                onChange={(e) => handleChange('fitness_level', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="sedentary">Sedentary</option>
                <option value="lightly-active">Lightly Active</option>
                <option value="moderately-active">Moderately Active</option>
                <option value="very-active">Very Active</option>
                <option value="athlete">Athlete</option>
              </select>
            </FormField>

            <FormField label="Clothing Style">
              <select
                title="Clothing Style"
                value={profile.clothing_style || ''}
                onChange={(e) => handleChange('clothing_style', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="business">Business</option>
                <option value="sporty">Sporty</option>
                <option value="alternative">Alternative</option>
                <option value="vintage">Vintage</option>
                <option value="trendy">Trendy</option>
              </select>
            </FormField>

            <FormField label="Dominant Hand">
              <select
                title="Dominant Hand"
                value={profile.dominant_hand || ''}
                onChange={(e) => handleChange('dominant_hand', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
                <option value="ambidextrous">Ambidextrous</option>
              </select>
            </FormField>
          </div>
        </Section>

        {/* Lifestyle */}
        <Section title="Lifestyle" icon={<Calendar />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Occupation">
              <input
                type="text"
                value={profile.occupation || ''}
                onChange={(e) => handleChange('occupation', e.target.value)}
                className={inputClassName()}
                placeholder="Software Engineer"
              />
            </FormField>

            <FormField label="Education">
              <select
                title="Education"
                value={profile.education || ''}
                onChange={(e) => handleChange('education', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="high-school">High School</option>
                <option value="some-college">Some College</option>
                <option value="bachelors">Bachelor&apos;s Degree</option>
                <option value="masters">Master&apos;s Degree</option>
                <option value="phd">PhD</option>
              </select>
            </FormField>

            <FormField label="Smoking">
              <select
                title="Smoking"
                value={profile.smoking_status || ''}
                onChange={(e) => handleChange('smoking_status', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
                <option value="trying-to-quit">Trying to Quit</option>
              </select>
            </FormField>

            <FormField label="Drinking">
              <select
                title="Drinking"
                value={profile.drinking_status || ''}
                onChange={(e) => handleChange('drinking_status', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
              </select>
            </FormField>

            <FormField label="Cannabis">
              <select
                title="Cannabis"
                value={profile.cannabis_status || ''}
                onChange={(e) => handleChange('cannabis_status', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
              </select>
            </FormField>

            <FormField label="Dietary Preferences">
              <select
                title="Dietary Preferences"
                value={profile.dietary_preferences || ''}
                onChange={(e) => handleChange('dietary_preferences', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="omnivore">Omnivore</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="pescatarian">Pescatarian</option>
                <option value="keto">Keto</option>
                <option value="paleo">Paleo</option>
                <option value="halal">Halal</option>
                <option value="kosher">Kosher</option>
              </select>
            </FormField>

            <FormField label="Pets">
              <select
                title="Pets"
                value={profile.has_pets === undefined ? '' : profile.has_pets.toString()}
                onChange={(e) => handleChange('has_pets', e.target.value === 'true')}
                className={inputClassName()}
              >
                <option value="">Prefer not to say</option>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Has Kids">
              <select
                title="Has Kids"
                value={profile.has_children === undefined ? '' : profile.has_children.toString()}
                onChange={(e) => handleChange('has_children', e.target.value === 'true')}
                className={inputClassName()}
              >
                <option value="">Prefer not to say</option>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>

            <FormField label="Wants Kids">
              <select
                title="Wants Kids"
                value={profile.wants_children === undefined ? '' : profile.wants_children.toString()}
                onChange={(e) => handleChange('wants_children', e.target.value === 'true')}
                className={inputClassName()}
              >
                <option value="">Prefer not to say</option>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
          </div>
        </Section>

        {/* Personality & Social */}
        <Section title="Personality & Social" icon={<Heart />}>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Filling out these details helps our matching algorithm find more compatible partners. 
                If you leave them blank, they won&apos;t be used as criteria for matching.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Love Language">
              <select
                title="Love Language"
                value={profile.love_language || ''}
                onChange={(e) => handleChange('love_language', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="words_of_affirmation">Words of Affirmation</option>
                <option value="acts_of_service">Acts of Service</option>
                <option value="receiving_gifts">Receiving Gifts</option>
                <option value="quality_time">Quality Time</option>
                <option value="physical_touch">Physical Touch</option>
              </select>
            </FormField>

            <FormField label="Personality Type">
              <select
                title="Personality Type"
                value={profile.personality_type || ''}
                onChange={(e) => handleChange('personality_type', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="introvert">Introvert</option>
                <option value="extrovert">Extrovert</option>
                <option value="ambivert">Ambivert</option>
                <option value="intj">INTJ</option>
                <option value="intp">INTP</option>
                <option value="entj">ENTJ</option>
                <option value="entp">ENTP</option>
                <option value="infj">INFJ</option>
                <option value="infp">INFP</option>
                <option value="enfj">ENFJ</option>
                <option value="enfp">ENFP</option>
                <option value="istj">ISTJ</option>
                <option value="isfj">ISFJ</option>
                <option value="estj">ESTJ</option>
                <option value="esfj">ESFJ</option>
                <option value="istp">ISTP</option>
                <option value="isfp">ISFP</option>
                <option value="estp">ESTP</option>
                <option value="esfp">ESFP</option>
              </select>
            </FormField>

            <FormField label="Political Views">
              <select
                title="Political Views"
                value={profile.political_views || ''}
                onChange={(e) => handleChange('political_views', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="liberal">Liberal</option>
                <option value="moderate">Moderate</option>
                <option value="conservative">Conservative</option>
                <option value="liberal-conservative">Liberal-Conservative</option>
                <option value="apolitical">Apolitical</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Religion / Spirituality">
              <select
                title="Religion / Spirituality"
                value={profile.religion || ''}
                onChange={(e) => handleChange('religion', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="agnostic">Agnostic</option>
                <option value="atheist">Atheist</option>
                <option value="christian">Christian</option>
                <option value="muslim">Muslim</option>
                <option value="jewish">Jewish</option>
                <option value="buddhist">Buddhist</option>
                <option value="hindu">Hindu</option>
                <option value="spiritual">Spiritual but not religious</option>
                <option value="other">Other</option>
              </select>
            </FormField>

            <FormField label="Sleep Schedule">
              <select
                title="Sleep Schedule"
                value={profile.sleep_schedule || ''}
                onChange={(e) => handleChange('sleep_schedule', e.target.value)}
                className={inputClassName()}
              >
                <option value="">Select</option>
                <option value="early_bird">Early Bird</option>
                <option value="night_owl">Night Owl</option>
                <option value="flexible">Flexible</option>
                <option value="irregular">Irregular</option>
              </select>
            </FormField>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Social Media (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={profile.social_media?.instagram || ''}
                onChange={(e) => handleChange('social_media', { ...profile.social_media, instagram: e.target.value })}
                className={inputClassName()}
                placeholder="Instagram Handle"
              />
              <input
                type="text"
                value={profile.social_media?.twitter || ''}
                onChange={(e) => handleChange('social_media', { ...profile.social_media, twitter: e.target.value })}
                className={inputClassName()}
                placeholder="Twitter/X Handle"
              />
              <input
                type="text"
                value={profile.social_media?.snapchat || ''}
                onChange={(e) => handleChange('social_media', { ...profile.social_media, snapchat: e.target.value })}
                className={inputClassName()}
                placeholder="Snapchat Handle"
              />
            </div>
          </div>
        </Section>

        {/* Intimate Details */}
        <Section title="Intimate Details" icon={<Info />}>
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <p className="text-sm text-purple-800">
                These details are sensitive and personal. You can choose who sees this information in your privacy settings. 
                Sharing this information can help find more compatible matches.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Penis Length (cm)">
              <input
                type="number"
                value={profile.penis_length_cm || ''}
                onChange={(e) => handleChange('penis_length_cm', parseFloat(e.target.value))}
                className={inputClassName()}
                placeholder="Length in cm"
                step="0.1"
              />
            </FormField>

            <FormField label="Penis Girth (cm)">
              <input
                type="number"
                value={profile.penis_girth_cm || ''}
                onChange={(e) => handleChange('penis_girth_cm', parseFloat(e.target.value))}
                className={inputClassName()}
                placeholder="Girth in cm"
                step="0.1"
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="STI Status">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {['HIV Negative', 'HIV Positive (Undetectable)', 'HSV-1', 'HSV-2', 'HPV', 'PrEP User', 'Regularly Tested'].map(status => (
                    <ToggleChip
                      key={status}
                      label={status}
                      selected={(profile.sti_status?.status || []).includes(status)}
                      onClick={() => {
                        const currentStatus = (profile.sti_status?.status as string[]) || [];
                        const newStatus = currentStatus.includes(status)
                          ? currentStatus.filter(s => s !== status)
                          : [...currentStatus, status];
                        handleChange('sti_status', { ...profile.sti_status, status: newStatus });
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground">Last Tested Date</label>
                  <input
                    title="Last Tested Date"
                    type="date"
                    value={profile.sti_status?.last_tested || ''}
                    onChange={(e) => handleChange('sti_status', { ...profile.sti_status, last_tested: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-border dark:border-border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  />
                </div>
              </div>
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Lifestyle Interests">
              <div className="flex flex-wrap gap-2">
                {['Roleplay', 'Voyeurism', 'Exhibitionism', 'Bondage', 'Domination', 'Submission', 'Feet', 'Leather', 'Latex', 'Public', 'Threesomes', 'Swinging', 'Group Play', 'Power Dynamics', 'Open Play', 'Partner Sharing', 'Group Gatherings'].map(fetish => (
                  <ToggleChip
                    key={fetish}
                    label={fetish}
                    selected={(profile.fetishes || []).includes(fetish)}
                    onClick={() => handleArrayToggle('fetishes', fetish)}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Select all that apply. You can add more specific details in your bio if you wish.</p>
            </FormField>
          </div>
        </Section>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-border dark:border-border text-foreground dark:text-muted-foreground rounded-lg hover:bg-muted dark:bg-background transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending || Object.keys(errors).length > 0}
            className="flex items-center gap-2 px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-muted disabled:cursor-not-allowed transition-colors font-medium"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper Components
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card dark:bg-card rounded-xl border border-border dark:border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-purple-600">{icon}</div>
        <h2 className="text-xl font-semibold text-foreground dark:text-foreground">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function FormField({ 
  label, 
  children, 
  required, 
  error, 
  touched, 
  hint 
}: { 
  label: string; 
  children: React.ReactNode; 
  required?: boolean;
  error?: string;
  touched?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && touched && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleChip({ 
  label, 
  selected, 
  onClick 
}: { 
  label: string; 
  selected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border-2 transition-all font-medium text-sm ${
        selected
          ? 'bg-purple-600 border-purple-600 text-white'
          : 'bg-card border-border text-foreground hover:border-purple-600 hover:text-purple-600'
      }`}
    >
      {label}
    </button>
  );
}

function inputClassName(error?: string, touched?: boolean) {
  const baseClass = 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors';
  if (error && touched) {
    return `${baseClass} border-red-300 focus:ring-red-500`;
  }
  return `${baseClass} border-border`;
}

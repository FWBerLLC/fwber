'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LocationMatcher from './LocationMatcher';

interface BasicInformationProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  handleLocationChange: (field: string, value: any) => void;
}

export default function BasicInformation({ formData, handleInputChange, handleLocationChange }: BasicInformationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Display Name
            </label>
            <input
              type="text"
              id="display_name"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="How would you like to be called?"
            />
          </div>

          <div id="date_of_birth">
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Date of Birth
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <select
                className="block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.date_of_birth ? formData.date_of_birth.split('-')[1] : ''}
                onChange={(e) => {
                   const [y, m, d] = formData.date_of_birth ? formData.date_of_birth.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                   handleInputChange('date_of_birth', `${y}-${e.target.value}-${d}`);
                }}
              >
                <option value="">Month</option>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, i) => (
                  <option key={i} value={(i + 1).toString().padStart(2, '0')}>{month}</option>
                ))}
              </select>
              <select
                className="block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.date_of_birth ? formData.date_of_birth.split('-')[2] : ''}
                onChange={(e) => {
                  const [y, m, d] = formData.date_of_birth ? formData.date_of_birth.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                  handleInputChange('date_of_birth', `${y}-${m}-${e.target.value}`);
                }}
              >
                <option value="">Day</option>
                {Array.from({length: 31}, (_, i) => {
                  const d = (i + 1).toString().padStart(2, '0');
                  return <option key={d} value={d}>{i + 1}</option>
                })}
              </select>
              <select
                className="block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.date_of_birth ? formData.date_of_birth.split('-')[0] : ''}
                onChange={(e) => {
                  const [y, m, d] = formData.date_of_birth ? formData.date_of_birth.split('-') : [`${new Date().getFullYear() - 18}`, '01', '01'];
                  handleInputChange('date_of_birth', `${e.target.value}-${m}-${d}`);
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

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Gender
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="mtf">Trans Woman</option>
              <option value="ftm">Trans Man</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="pronouns" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Pronouns
            </label>
            <select
              id="pronouns"
              value={formData.pronouns}
              onChange={(e) => handleInputChange('pronouns', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select pronouns</option>
              <option value="he/him">He/Him</option>
              <option value="she/her">She/Her</option>
              <option value="they/them">They/Them</option>
              <option value="he/they">He/They</option>
              <option value="she/they">She/They</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="sexual_orientation" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Sexual Orientation
            </label>
            <select
              id="sexual_orientation"
              value={formData.sexual_orientation}
              onChange={(e) => handleInputChange('sexual_orientation', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select orientation</option>
              <option value="straight">Straight</option>
              <option value="gay">Gay</option>
              <option value="lesbian">Lesbian</option>
              <option value="bisexual">Bisexual</option>
              <option value="pansexual">Pansexual</option>
              <option value="asexual">Asexual</option>
              <option value="demisexual">Demisexual</option>
              <option value="queer">Queer</option>
              <option value="questioning">Questioning</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="relationship_style" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Relationship Style
            </label>
            <select
              id="relationship_style"
              value={formData.relationship_style}
              onChange={(e) => handleInputChange('relationship_style', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select relationship style</option>
              <option value="monogamous">Monogamous</option>
              <option value="non-monogamous">Non-monogamous</option>
              <option value="polyamorous">Polyamorous</option>
              <option value="open">Open Relationship</option>
              <option value="swinger">Swinger</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <LocationMatcher formData={formData} handleLocationChange={handleLocationChange} />

          <div>
            <label htmlFor="zodiac_sign" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Zodiac Sign
            </label>
            <select
              id="zodiac_sign"
              value={formData.zodiac_sign}
              onChange={(e) => handleInputChange('zodiac_sign', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
          </div>

          <div>
            <label htmlFor="blood_type" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Blood Type
            </label>
            <select
              id="blood_type"
              value={formData.blood_type}
              onChange={(e) => handleInputChange('blood_type', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select blood type</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <label htmlFor="personality_type" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Personality Type (MBTI)
            </label>
            <select
              id="personality_type"
              value={formData.personality_type}
              onChange={(e) => handleInputChange('personality_type', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select type</option>
              <option value="INTJ">INTJ</option>
              <option value="INTP">INTP</option>
              <option value="ENTJ">ENTJ</option>
              <option value="ENTP">ENTP</option>
              <option value="INFJ">INFJ</option>
              <option value="INFP">INFP</option>
              <option value="ENFJ">ENFJ</option>
              <option value="ENFP">ENFP</option>
              <option value="ISTJ">ISTJ</option>
              <option value="ISFJ">ISFJ</option>
              <option value="ESTJ">ESTJ</option>
              <option value="ESFJ">ESFJ</option>
              <option value="ISTP">ISTP</option>
              <option value="ISFP">ISFP</option>
              <option value="ESTP">ESTP</option>
              <option value="ESFP">ESFP</option>
            </select>
          </div>

          <div>
            <label htmlFor="chronotype" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Chronotype
            </label>
            <select
              id="chronotype"
              value={formData.chronotype}
              onChange={(e) => handleInputChange('chronotype', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select chronotype</option>
              <option value="early_bird">Early Bird</option>
              <option value="night_owl">Night Owl</option>
              <option value="intermediate">Intermediate</option>
            </select>
          </div>

          <div>
            <label htmlFor="love_language" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Love Language
            </label>
            <select
              id="love_language"
              value={formData.love_language}
              onChange={(e) => handleInputChange('love_language', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select love language</option>
              <option value="words_of_affirmation">Words of Affirmation</option>
              <option value="acts_of_service">Acts of Service</option>
              <option value="receiving_gifts">Receiving Gifts</option>
              <option value="quality_time">Quality Time</option>
              <option value="physical_touch">Physical Touch</option>
            </select>
          </div>

          <div>
            <label htmlFor="religion" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Religion
            </label>
            <select
              id="religion"
              value={formData.religion}
              onChange={(e) => handleInputChange('religion', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select religion</option>
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
            <label htmlFor="political_views" className="block text-sm font-medium text-foreground dark:text-muted-foreground">
              Political Views
            </label>
            <select
              id="political_views"
              value={formData.political_views}
              onChange={(e) => handleInputChange('political_views', e.target.value)}
              className="mt-1 block w-full border-border dark:border-border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select views</option>
              <option value="liberal">Liberal</option>
              <option value="moderate">Moderate</option>
              <option value="conservative">Conservative</option>
              <option value="liberal-conservative">Liberal-Conservative</option>
              <option value="apolitical">Apolitical</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

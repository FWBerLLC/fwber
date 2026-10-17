'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { physicalProfileApi } from '@/lib/api/physical-profile';
import { ArrowLeft, Save, Ruler, User, Palette, CheckCircle2 } from 'lucide-react';

const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus Size', 'Dad Bod'];
const HAIR_COLORS = ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Bald', 'Other'];
const EYE_COLORS = ['Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Amber', 'Other'];
const SKIN_TONES = ['Very Fair', 'Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Brown', 'Dark Brown', 'Dark'];
const ETHNICITIES = ['Asian', 'Black', 'Hispanic/Latino', 'Middle Eastern', 'Native American', 'Pacific Islander', 'White', 'Mixed', 'Other'];
const FACIAL_HAIR = ['None', 'Stubble', 'Goatee', 'Mustache', 'Full Beard', 'Other'];
const FITNESS_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active', 'Athlete'];
const CLOTHING_STYLES = ['Casual', 'Streetwear', 'Formal', 'Athleisure', 'Bohemian', 'Punk', 'Minimalist', 'Vintage', 'Other'];

function SelectGrid({ options, selected, onSelect, cols = 4 }: {
  options: string[];
  selected: string | undefined;
  onSelect: (value: string) => void;
  cols?: number;
}) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${cols} gap-2`}>
      {options.map(opt => {
        const val = opt.toLowerCase().replace(/ /g, '_');
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(val)}
            className={`px-3 py-2.5 text-sm rounded-lg border transition-all font-medium ${
              selected === val
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface PhysicalData {
  height_cm: number | null;
  body_type: string;
  hair_color: string;
  eye_color: string;
  skin_tone: string;
  ethnicity: string;
  facial_hair: string;
  fitness_level: string;
  tattoos: boolean;
  piercings: boolean;
  dominant_hand: string;
  clothing_style: string;
}

export default function PhysicalProfilePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [data, setData] = useState<PhysicalData>({
    height_cm: null,
    body_type: '',
    hair_color: '',
    eye_color: '',
    skin_tone: '',
    ethnicity: '',
    facial_hair: '',
    fitness_level: '',
    tattoos: false,
    piercings: false,
    dominant_hand: '',
    clothing_style: '',
  });

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await physicalProfileApi.get(token);
      const p = response.data || {};

      setData({
        height_cm: typeof p.height_cm === 'number' ? p.height_cm : null,
        body_type: p.body_type || '',
        hair_color: p.hair_color || '',
        eye_color: p.eye_color || '',
        skin_tone: p.skin_tone || '',
        ethnicity: p.ethnicity || '',
        facial_hair: p.facial_hair || '',
        fitness_level: p.fitness_level || '',
        tattoos: Boolean(p.tattoos),
        piercings: Boolean(p.piercings),
        dominant_hand: p.dominant_hand || '',
        clothing_style: p.clothing_style || '',
      });
    } catch (err) {
      console.error('Failed to load physical profile', err);
      setMessage({ type: 'error', text: 'Failed to load your physical attributes.' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadProfile();
  }, [token, loadProfile]);

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      setMessage(null);
      await physicalProfileApi.upsert(token, data as any);
      setMessage({ type: 'success', text: 'Physical attributes saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save physical profile', err);
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof PhysicalData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const cmToFeetInches = (cm: number | null | undefined) => {
    if (!cm) return '';
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <button type="button"
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Profile</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Physical Attributes</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Define your physical traits for better matching and AI avatar generation.
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Measurements */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-blue-500" /> Measurements & Build
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Height</label>
                <select
                  value={data.height_cm || ''}
                  onChange={e => update('height_cm', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select your height</option>
                  {Array.from({ length: 42 }, (_, i) => {
                    const cm = 145 + i * 2;
                    const totalIn = Math.round(cm / 2.54);
                    const ft = Math.floor(totalIn / 12);
                    const inch = totalIn % 12;
                    return (
                      <option key={cm} value={cm}>
                        {cm} cm — {ft}&apos;{inch}&quot; ({ft} ft{inch > 0 ? ` ${inch} in` : ''})
                      </option>
                    );
                  })}
                </select>
                {data.height_cm && (
                  <p className="mt-1 text-sm text-gray-500">{data.height_cm} cm &middot; {cmToFeetInches(data.height_cm)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Body Type</label>
                <SelectGrid options={BODY_TYPES} selected={data.body_type} onSelect={v => update('body_type', v)} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Fitness Level</label>
                <SelectGrid options={FITNESS_LEVELS} selected={data.fitness_level} onSelect={v => update('fitness_level', v)} cols={3} />
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" /> Appearance
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ethnicity</label>
                <SelectGrid options={ETHNICITIES} selected={data.ethnicity} onSelect={v => update('ethnicity', v)} cols={3} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Hair Color</label>
                <SelectGrid options={HAIR_COLORS} selected={data.hair_color} onSelect={v => update('hair_color', v)} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Eye Color</label>
                <SelectGrid options={EYE_COLORS} selected={data.eye_color} onSelect={v => update('eye_color', v)} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Skin Tone</label>
                <SelectGrid options={SKIN_TONES} selected={data.skin_tone} onSelect={v => update('skin_tone', v)} cols={3} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Facial Hair</label>
                <SelectGrid options={FACIAL_HAIR} selected={data.facial_hair} onSelect={v => update('facial_hair', v)} cols={3} />
              </div>
            </div>
          </section>

          {/* Style & Details */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-pink-500" /> Style & Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Clothing Style</label>
                <SelectGrid options={CLOTHING_STYLES} selected={data.clothing_style} onSelect={v => update('clothing_style', v)} cols={3} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dominant Hand</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Left', 'Right', 'Ambidextrous'].map(opt => {
                    const val = opt.toLowerCase().replace(/ /g, '_');
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => update('dominant_hand', val)}
                        className={`px-3 py-2.5 text-sm rounded-lg border transition-all font-medium ${
                          data.dominant_hand === val
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={data.tattoos || false}
                    onChange={e => update('tattoos', e.target.checked)}
                    className="h-5 w-5 rounded border-2 border-gray-400 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium">I have tattoos</span>
                </label>
                <label className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:border-blue-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={data.piercings || false}
                    onChange={e => update('piercings', e.target.checked)}
                    className="h-5 w-5 rounded border-2 border-gray-400 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium">I have piercings</span>
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {message ? (
            <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Changes save to your profile</span>
          )}
          <button type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

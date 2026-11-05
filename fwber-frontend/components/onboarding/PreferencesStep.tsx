import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dispatch, SetStateAction } from 'react'

export interface OnboardingFormData {
  looking_for: string[]
  preferences: {
    age_range_min: number
    age_range_max: number
  }
  [key: string]: any
}

interface PreferencesStepProps<T extends OnboardingFormData> {
  formData: T
  setFormData: Dispatch<SetStateAction<T>>
}

export function PreferencesStep<T extends OnboardingFormData>({ formData, setFormData }: PreferencesStepProps<T>) {
  const handleLookingForChange = (val: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      looking_for: checked
        ? [...prev.looking_for, val]
        : prev.looking_for.filter((i) => i !== val)
    }))
  }

  const handleAgeChange = (field: 'age_range_min' | 'age_range_max', value: string) => {
    const intVal = parseInt(value) || 18
    setFormData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: intVal
      }
    }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>I&apos;m looking for...</Label>
        <div className="grid grid-cols-2 gap-2">
          {['Dating', 'Friends', 'Networking', 'Casual'].map(opt => {
            const mapping: Record<string, string> = {
              'Dating': 'dating',
              'Friends': 'friendship',
              'Networking': 'networking',
              'Casual': 'casual'
            }
            const val = mapping[opt] || opt.toLowerCase()
            
            return (
              <label key={opt} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id={`looking_${opt}`}
                  className="h-5 w-5 rounded border-2 border-border text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  checked={Array.isArray(formData.looking_for) ? formData.looking_for.includes(val) : false}
                  onChange={e => handleLookingForChange(val, e.target.checked)}
                />
                <span className="text-sm select-none">{opt}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Age Range ({formData.preferences.age_range_min} - {formData.preferences.age_range_max})</Label>
        <div className="flex items-center space-x-4">
          <Input 
            type="number" 
            min={18} 
            max={99}
            value={formData.preferences.age_range_min}
            onChange={e => handleAgeChange('age_range_min', e.target.value)}
            className="w-20"
          />
          <span>to</span>
          <Input 
            type="number" 
            min={18} 
            max={99}
            value={formData.preferences.age_range_max}
            onChange={e => handleAgeChange('age_range_max', e.target.value)}
            className="w-20"
          />
        </div>
        {formData.preferences.age_range_min > formData.preferences.age_range_max && (
          <p className="text-sm text-red-500">Min age cannot be greater than max age.</p>
        )}
      </div>
    </div>
  )
}

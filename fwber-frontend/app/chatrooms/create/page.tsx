'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateChatroom, useChatroomCategories } from '@/lib/hooks/use-chatrooms';
import { useCreateProximityChatroom } from '@/lib/hooks/use-proximity-chatrooms';
import { useAuth } from '@/lib/auth-context';

export default function CreateChatroomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const createChatroomMutation = useCreateChatroom();
  const createProximityChatroomMutation = useCreateProximityChatroom();
  const { data: categories } = useChatroomCategories();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'interest' as 'interest' | 'city' | 'event' | 'private' | 'proximity',
    proximityType: 'social' as 'conference' | 'event' | 'venue' | 'area' | 'temporary' | 'networking' | 'social' | 'dating' | 'professional' | 'casual',
    category: '',
    city: '',
    neighborhood: '',
    is_public: true,
    latitude: 0,
    longitude: 0,
    radius_meters: 1000,
    token_entry_fee: 0,
  });

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by your browser' }));
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationStatus('success');
        setErrors(prev => ({ ...prev, location: '' }));
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('error');
        setErrors(prev => ({ ...prev, location: 'Unable to retrieve your location. Please enable location services.' }));
      }
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Chatroom name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Chatroom name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.type === 'interest' && !formData.category) {
      newErrors.category = 'Category is required for interest-based chatrooms';
    }

    if (formData.type === 'city' && !formData.city) {
      newErrors.city = 'City is required for city-based chatrooms';
    }

    if (formData.type === 'proximity') {
      if (formData.latitude === 0 && formData.longitude === 0) {
        newErrors.location = 'Location is required for proximity chatrooms';
      }
      if (formData.radius_meters < 100 || formData.radius_meters > 10000) {
        newErrors.radius_meters = 'Radius must be between 100m and 10km';
      }
    }

    if (formData.token_entry_fee < 0) {
      newErrors.token_entry_fee = 'Entry fee cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (formData.type === 'proximity') {
        const chatroom = await createProximityChatroomMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          type: formData.proximityType,
          latitude: formData.latitude,
          longitude: formData.longitude,
          radius_meters: Number(formData.radius_meters),
          city: formData.city || undefined,
          neighborhood: formData.neighborhood || undefined,
          is_public: formData.is_public,
        });
        router.push(`/chatrooms/${chatroom.id}?type=proximity`);
      } else {
        const chatroom = await createChatroomMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          type: formData.type as 'interest' | 'city' | 'event' | 'private',
          category: formData.category,
          city: formData.city,
          neighborhood: formData.neighborhood,
          is_public: formData.is_public,
          token_entry_fee: Number(formData.token_entry_fee),
        });
        router.push(`/chatrooms/${chatroom.id}`);
      }
    } catch (error) {
      console.error('Failed to create chatroom:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-muted dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground mb-4">Authentication Required</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mb-4">You need to be logged in to create a chatroom.</p>
          <button type="button"
            onClick={() => router.push('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted dark:bg-background transition-colors duration-300">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground dark:text-foreground mb-2">
            Create New Chatroom
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Start a conversation with people in your area or with shared interests
          </p>
        </div>

        {/* Form */}
        <div className="bg-card dark:bg-background rounded-lg shadow-sm border border-border dark:border-border dark:dark:border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Chatroom Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Chatroom Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground ${
                  errors.name ? 'border-red-300 dark:border-red-900' : 'border-border dark:border-border'
                }`}
                placeholder="Enter chatroom name..."
                maxLength={100}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground ${
                  errors.description ? 'border-red-300 dark:border-red-900' : 'border-border dark:border-border'
                }`}
                placeholder="Describe what this chatroom is about..."
                maxLength={500}
              />
              <div className="mt-1 flex justify-between text-sm text-muted-foreground dark:text-muted-foreground">
                <span>{errors.description && <span className="text-red-600 dark:text-red-400">{errors.description}</span>}</span>
                <span>{formData.description.length}/500</span>
              </div>
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                Chatroom Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-border dark:border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground"
              >
                <option value="interest">💬 Interest-based</option>
                <option value="city">🏙️ City-based</option>
                <option value="event">🎉 Event-based</option>
                <option value="private">🔒 Private</option>
                <option value="proximity">📍 Proximity (Location-based)</option>
              </select>
              <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                Choose the type of chatroom you want to create
              </p>
            </div>

            {/* Proximity Type */}
            {formData.type === 'proximity' && (
              <div>
                <label htmlFor="proximityType" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                  Proximity Category *
                </label>
                <select
                  id="proximityType"
                  name="proximityType"
                  value={formData.proximityType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground"
                >
                  <option value="social">Social</option>
                  <option value="networking">Networking</option>
                  <option value="event">Event</option>
                  <option value="conference">Conference</option>
                  <option value="venue">Venue</option>
                  <option value="area">Area</option>
                  <option value="temporary">Temporary</option>
                  <option value="dating">Dating</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            )}

            {/* Location (for proximity) */}
            {formData.type === 'proximity' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                    Location *
                  </label>
                  <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                    <button
                      type="button"
                      onClick={getLocation}
                      disabled={locationStatus === 'loading'}
                      className="inline-flex items-center px-4 py-2 border border-border dark:border-border shadow-sm text-sm font-medium rounded-md text-foreground dark:text-muted-foreground bg-card dark:bg-card hover:bg-muted dark:bg-background dark:hover:dark:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {locationStatus === 'loading' ? 'Getting Location...' : '📍 Get Current Location'}
                    </button>
                    {locationStatus === 'success' && (
                      <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Location set ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
                      </span>
                    )}
                  </div>
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="radius_meters" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                    Radius (meters) *
                  </label>
                  <input
                    type="number"
                    id="radius_meters"
                    name="radius_meters"
                    value={formData.radius_meters}
                    onChange={handleInputChange}
                    min="100"
                    max="10000"
                    step="100"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground ${
                      errors.radius_meters ? 'border-red-300 dark:border-red-900' : 'border-border dark:border-border'
                    }`}
                  />
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                    Range: 100m to 10,000m (10km)
                  </p>
                  {errors.radius_meters && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.radius_meters}</p>
                  )}
                </div>
              </div>
            )}

            {/* Category (for interest-based) */}
            {formData.type === 'interest' && (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground ${
                    errors.category ? 'border-red-300 dark:border-red-900' : 'border-border dark:border-border'
                  }`}
                >
                  <option value="">Select a category</option>
                  {categories?.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>
                )}
              </div>
            )}

            {/* City (for city-based) */}
            {formData.type === 'city' && (
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground ${
                    errors.city ? 'border-red-300 dark:border-red-900' : 'border-border dark:border-border'
                  }`}
                  placeholder="Enter city name..."
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                )}
              </div>
            )}

            {/* Neighborhood (optional) */}
            {(formData.type === 'city' || formData.type === 'interest') && (
              <div>
                <label htmlFor="neighborhood" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                  Neighborhood (Optional)
                </label>
                <input
                  type="text"
                  id="neighborhood"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground"
                  placeholder="Enter neighborhood name..."
                />
              </div>
            )}

            {/* Privacy */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_public"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border dark:border-border rounded bg-card dark:bg-card"
                />
                <label htmlFor="is_public" className="ml-2 block text-sm text-foreground dark:text-muted-foreground">
                  Make this chatroom public
                </label>
              </div>
              <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                Public chatrooms can be discovered by anyone. Private chatrooms require an invitation.
              </p>
            </div>

            {/* Token Entry Fee */}
            {formData.type !== 'proximity' && (
              <div>
                <label htmlFor="token_entry_fee" className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                  Entry Fee (Tokens)
                </label>
                <input
                  type="number"
                  id="token_entry_fee"
                  name="token_entry_fee"
                  value={formData.token_entry_fee}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-card dark:bg-card text-foreground dark:text-foreground ${
                    errors.token_entry_fee ? 'border-red-300 dark:border-red-900' : 'border-border dark:border-border'
                  }`}
                />
                <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                  Set a token amount required to join this chatroom (0 for free).
                </p>
                {errors.token_entry_fee && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.token_entry_fee}</p>
                )}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border dark:border-border dark:dark:border-border">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-border dark:border-border rounded-md shadow-sm text-sm font-medium text-foreground dark:text-muted-foreground bg-card dark:bg-card hover:bg-muted dark:bg-background dark:hover:dark:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createChatroomMutation.isPending || createProximityChatroomMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createChatroomMutation.isPending || createProximityChatroomMutation.isPending ? 'Creating...' : 'Create Chatroom'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

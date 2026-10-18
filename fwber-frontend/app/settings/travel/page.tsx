'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, updateUserProfile } from '@/lib/api/profile';
import { MapPin, Plane, Search, Loader2, Check } from 'lucide-react';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function TravelModePage() {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTravelMode, setIsTravelMode] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserProfile(token!);
      const profile = data.profile || data;
      
      setIsTravelMode(profile?.is_travel_mode || false);
      setLocationName(profile?.travel_location_name || '');
      setLatitude(profile?.travel_latitude || null);
      setLongitude(profile?.travel_longitude || null);
      
      if (profile?.travel_location_name) {
        setSearchQuery(profile.travel_location_name);
      }
    } catch (err) {
      console.error('Failed to load profile', err);
      setError('Failed to load profile settings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token, loadProfile]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      setSearchResults([]);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error', err);
      setError('Failed to search for location');
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (result: SearchResult) => {
    setLocationName(result.display_name);
    setLatitude(parseFloat(result.lat));
    setLongitude(parseFloat(result.lon));
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateUserProfile(token!, {
        is_travel_mode: isTravelMode,
        travel_location: {
          name: locationName,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        }
      });

      setSuccess('Travel mode settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Save error', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted dark:bg-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card dark:bg-card rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border dark:border-border bg-gradient-to-r from-purple-50 to-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Plane className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Travel Mode</h1>
              </div>
              <p className="text-muted-foreground">
                Change your location to match with people in other cities before you arrive.
              </p>
            </div>

            <div className="p-6 space-y-8">
              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted dark:bg-background rounded-lg border border-border dark:border-border">
                <div>
                  <h3 className="font-medium text-foreground dark:text-foreground">Enable Travel Mode</h3>
                  <p className="text-sm text-muted-foreground">Your profile will be shown in the selected location</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isTravelMode}
                    onChange={(e) => setIsTravelMode(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card dark:bg-card after:border-border dark:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Location Search */}
              <div className={`space-y-4 transition-opacity duration-200 ${!isTravelMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground">
                  Where are you going?
                </label>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search for a city (e.g. London, UK)"
                        className="w-full pl-10 pr-4 py-2 border border-border dark:border-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button type="button"
                      onClick={handleSearch}
                      disabled={searching || !searchQuery.trim()}
                      className="px-4 py-2 bg-muted dark:bg-card text-foreground dark:text-muted-foreground rounded-lg hover:bg-muted disabled:opacity-50 font-medium flex items-center gap-2"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Search
                    </button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card dark:bg-card border border-border dark:border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button type="button"
                          key={result.place_id}
                          onClick={() => selectLocation(result)}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-border last:border-0"
                        >
                          <div className="font-medium text-foreground dark:text-foreground truncate">{result.display_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {parseFloat(result.lat).toFixed(4)}, {parseFloat(result.lon).toFixed(4)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Location Display */}
                {locationName && (
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Selected Location</p>
                      <p className="text-sm text-purple-700">{locationName}</p>
                      {latitude && longitude && (
                        <p className="text-xs text-purple-500 mt-1">
                          {latitude.toFixed(4)}, {longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}

              {/* Save Button */}
              <div className="pt-4 border-t border-border dark:border-border">
                <button type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

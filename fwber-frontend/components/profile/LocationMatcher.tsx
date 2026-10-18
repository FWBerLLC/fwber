'use client'

import { useState, useMemo, useCallback } from 'react'
import { Globe, MapPin, Navigation, Building2, Crosshair, Loader2, CheckCircle2, Sparkles } from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

type MatchScope = 'local' | 'regional' | 'national' | 'global'

const DISTANCE_PRESETS_LOCAL: Record<string, number> = {
  '5 mi': 5, '10 mi': 10, '25 mi': 25, '50 mi': 50, '100 mi': 100,
}
const DISTANCE_PRESETS_REGIONAL: Record<string, number> = {
  '25 mi': 25, '50 mi': 50, '100 mi': 100, '250 mi': 250, '500 mi': 500,
}

const COUNTRIES: Record<string, { label: string; cities: string[] }> = {
  'US': { label: '🇺🇸 United States', cities: ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin','San Francisco','Seattle','Denver','Washington DC','Nashville','Portland','Las Vegas','Atlanta','Miami','Boston','Orlando','Minneapolis','Detroit','Charlotte'] },
  'GB': { label: '🇬🇧 United Kingdom', cities: ['London','Manchester','Birmingham','Leeds','Glasgow','Liverpool','Edinburgh','Bristol','Cardiff','Belfast'] },
  'CA': { label: '🇨🇦 Canada', cities: ['Toronto','Vancouver','Montreal','Calgary','Ottawa','Edmonton','Winnipeg','Halifax'] },
  'AU': { label: '🇦🇺 Australia', cities: ['Sydney','Melbourne','Brisbane','Perth','Adelaide','Gold Coast','Canberra'] },
  'DE': { label: '🇩🇪 Germany', cities: ['Berlin','Munich','Hamburg','Frankfurt','Cologne','Stuttgart','Düsseldorf'] },
  'FR': { label: '🇫🇷 France', cities: ['Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Strasbourg'] },
  'JP': { label: '🇯🇵 Japan', cities: ['Tokyo','Osaka','Yokohama','Nagoya','Sapporo','Fukuoka','Kobe','Kyoto'] },
  'BR': { label: '🇧🇷 Brazil', cities: ['São Paulo','Rio de Janeiro','Brasília','Salvador','Fortaleza','Belo Horizonte','Manaus'] },
  'MX': { label: '🇲🇽 Mexico', cities: ['Mexico City','Guadalajara','Monterrey','Puebla','Cancún','Tijuana','Mérida'] },
  'KR': { label: '🇰🇷 South Korea', cities: ['Seoul','Busan','Incheon','Daegu','Daejeon','Gwangju'] },
  'IN': { label: '🇮🇳 India', cities: ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad'] },
  'ES': { label: '🇪🇸 Spain', cities: ['Madrid','Barcelona','Valencia','Seville','Málaga','Bilbao'] },
  'IT': { label: '🇮🇹 Italy', cities: ['Rome','Milan','Naples','Florence','Venice','Turin','Bologna'] },
  'NL': { label: '🇳🇱 Netherlands', cities: ['Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven'] },
  'SE': { label: '🇸🇪 Sweden', cities: ['Stockholm','Gothenburg','Malmö','Uppsala','Linköping'] },
  'OTHER': { label: '🌍 Other', cities: [] },
}

// Country code lookup by name
const COUNTRY_CODE_MAP: Record<string, string> = {}
for (const [code, data] of Object.entries(COUNTRIES)) {
  COUNTRY_CODE_MAP[data.label.replace(/^[^\s]+ /, '').toLowerCase()] = code
}
// Also map common names
COUNTRY_CODE_MAP['united states'] = 'US'
COUNTRY_CODE_MAP['united states of america'] = 'US'
COUNTRY_CODE_MAP['usa'] = 'US'
COUNTRY_CODE_MAP['uk'] = 'GB'
COUNTRY_CODE_MAP['united kingdom'] = 'GB'
COUNTRY_CODE_MAP['canada'] = 'CA'
COUNTRY_CODE_MAP['australia'] = 'AU'
COUNTRY_CODE_MAP['germany'] = 'DE'
COUNTRY_CODE_MAP['france'] = 'FR'
COUNTRY_CODE_MAP['japan'] = 'JP'
COUNTRY_CODE_MAP['brazil'] = 'BR'
COUNTRY_CODE_MAP['mexico'] = 'MX'
COUNTRY_CODE_MAP['south korea'] = 'KR'
COUNTRY_CODE_MAP['india'] = 'IN'
COUNTRY_CODE_MAP['spain'] = 'ES'
COUNTRY_CODE_MAP['italy'] = 'IT'
COUNTRY_CODE_MAP['netherlands'] = 'NL'
COUNTRY_CODE_MAP['sweden'] = 'SE'

// ─── Component ───────────────────────────────────────────────────────────────

interface LocationMatcherProps {
  formData: any
  handleLocationChange: (field: string, value: any) => void
}

export default function LocationMatcher({ formData, handleLocationChange }: LocationMatcherProps) {
  const location = formData.location || {}
  const maxDistance = location.max_distance ?? 25
  const matchScope = (location.match_scope as MatchScope) || 'local'
  const searchCountry = location.search_country || ''
  const searchCity = location.search_city || ''

  const effectiveScope: MatchScope = matchScope

  // Geolocation state
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  const availableCities = useMemo(() => {
    if (!searchCountry || !COUNTRIES[searchCountry]) return []
    return COUNTRIES[searchCountry].cities
  }, [searchCountry])

  const handleScopeChange = (scope: MatchScope) => {
    handleLocationChange('match_scope', scope)
    if (scope === 'global') handleLocationChange('max_distance', 0)
    else if (scope === 'national') handleLocationChange('max_distance', 500)
    else if (scope === 'regional') handleLocationChange('max_distance', 100)
    else handleLocationChange('max_distance', 25)
  }

  // ── Auto-detect location ──────────────────────────────────────────────
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setDetectError('Geolocation is not supported by your browser')
      return
    }

    setDetecting(true)
    setDetectError(null)

    try {
      // Get GPS position
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const { latitude, longitude } = pos.coords

      // Reverse geocode using free Nominatim API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const addr = data.address || {}

      const city = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || ''
      const state = addr.state || addr.province || addr.region || ''
      const countryName = (addr.country || '').toLowerCase()
      const countryCode = addr.country_code?.toUpperCase() || COUNTRY_CODE_MAP[countryName] || ''

      // Also store coordinates
      handleLocationChange('latitude', latitude)
      handleLocationChange('longitude', longitude)
      handleLocationChange('city', city)
      handleLocationChange('state', state)
      if (countryCode) {
        handleLocationChange('country', countryCode)
      }

      setDetected(true)
      setTimeout(() => setDetected(false), 3000)
    } catch (err: any) {
      if (err.code === 1) {
        setDetectError('Location permission denied. Please enable it in your browser settings.')
      } else if (err.code === 2) {
        setDetectError('Could not determine your location. Please enter it manually.')
      } else if (err.code === 3) {
        setDetectError('Location request timed out. Please try again.')
      } else {
        setDetectError('Something went wrong. Please enter your location manually.')
      }
    } finally {
      setDetecting(false)
    }
  }, [handleLocationChange])

  const presets = effectiveScope === 'regional' ? DISTANCE_PRESETS_REGIONAL : DISTANCE_PRESETS_LOCAL

  return (
    <div className="space-y-6">
      {/* ── Match Scope Selector ─────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-3">
          <Globe className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Match Scope
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {([
            { key: 'local', label: 'Local', icon: <Navigation className="w-4 h-4" />, desc: 'Nearby' },
            { key: 'regional', label: 'Regional', icon: <MapPin className="w-4 h-4" />, desc: 'Wider area' },
            { key: 'national', label: 'National', icon: <Building2 className="w-4 h-4" />, desc: 'Country-wide' },
            { key: 'global', label: 'Global', icon: <Globe className="w-4 h-4" />, desc: 'Anywhere' },
          ] as const).map(({ key, label, icon, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleScopeChange(key)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                effectiveScope === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'border-border dark:border-border hover:border-border dark:hover:border-gray-600 text-muted-foreground dark:text-muted-foreground'
              }`}
            >
              {icon}
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[10px] opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Distance Slider (Local / Regional) ──────────────────────────── */}
      {(effectiveScope === 'local' || effectiveScope === 'regional') && (
        <div>
          <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
            <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Maximum Distance: <span className="text-blue-600 dark:text-blue-400 font-semibold">{maxDistance} miles</span>
          </label>
          <input
            type="range"
            min={1}
            max={effectiveScope === 'regional' ? 500 : 100}
            value={maxDistance}
            onChange={(e) => handleLocationChange('max_distance', parseInt(e.target.value))}
            className="w-full h-2 bg-muted dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between mt-1.5">
            {Object.entries(presets).map(([label, val]) => (
              <button
                key={val}
                type="button"
                onClick={() => handleLocationChange('max_distance', val)}
                className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                  maxDistance === val
                    ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 font-medium'
                    : 'text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── National: Country Selector ───────────────────────────────────── */}
      {effectiveScope === 'national' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
              <Building2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Country
            </label>
            <select
              value={searchCountry}
              onChange={(e) => {
                handleLocationChange('search_country', e.target.value)
                handleLocationChange('search_city', '')
              }}
              className="w-full border-border dark:border-border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-card dark:text-foreground"
            >
              <option value="">Any country</option>
              {Object.entries(COUNTRIES).map(([code, { label }]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>

          {availableCities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                City (optional)
              </label>
              <select
                value={searchCity}
                onChange={(e) => handleLocationChange('search_city', e.target.value)}
                className="w-full border-border dark:border-border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-card dark:text-foreground"
              >
                <option value="">Any city</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
              Search radius: <span className="text-blue-600 dark:text-blue-400 font-semibold">{maxDistance} miles</span>
            </label>
            <input
              type="range"
              min={50}
              max={3000}
              step={50}
              value={maxDistance}
              onChange={(e) => handleLocationChange('max_distance', parseInt(e.target.value))}
              className="w-full h-2 bg-muted dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>50 mi</span><span>500 mi</span><span>1500 mi</span><span>3000 mi</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Global ──────────────────────────────────────────────────────── */}
      {effectiveScope === 'global' && (
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-800">
              <Globe className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-200">🌍 Matching worldwide</p>
              <p className="text-sm text-purple-700 dark:text-purple-400">You&apos;ll see people from anywhere. No distance limit.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hometown ──────────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-border dark:border-border">
        <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-3">
          <Building2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Hometown
          <span className="ml-2 text-xs text-muted-foreground dark:text-muted-foreground font-normal">Where you grew up</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground dark:text-muted-foreground mb-1 uppercase tracking-wider">
              City
            </label>
            <input
              type="text"
              placeholder="e.g. Chicago"
              value={location.hometown_city || ''}
              onChange={(e) => handleLocationChange('hometown_city', e.target.value)}
              className="w-full border-border dark:border-border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-card dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground dark:text-muted-foreground mb-1 uppercase tracking-wider">
              State / Region
            </label>
            <input
              type="text"
              placeholder="e.g. Illinois"
              value={location.hometown_state || ''}
              onChange={(e) => handleLocationChange('hometown_state', e.target.value)}
              className="w-full border-border dark:border-border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-card dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── Your Location ────────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-border dark:border-border">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground dark:text-muted-foreground">
            <Navigation className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Your Location
          </label>

          {/* ── Auto-detect button ──────────────────────────────────────── */}
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              Recommended for best results
            </span>

            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                detected
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700'
                  : detecting
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800 cursor-wait'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700 hover:ring-blue-400 dark:hover:ring-blue-500 hover:shadow-sm active:scale-95'
              }`}
            >
              {detected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Detected!
                </>
              ) : detecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Crosshair className="w-3.5 h-3.5" />
                  Auto-detect
                </>
              )}
            </button>
          </div>
        </div>

        {/* Detection status message */}
        {detecting && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-2.5">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
              Using your device&apos;s GPS to find your city and state...
            </p>
          </div>
        )}

        {detected && !detecting && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300">
              Location detected! You can still adjust it below if needed.
            </p>
          </div>
        )}

        {detectError && !detecting && (
          <div className="mb-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              ⚠️ {detectError}
            </p>
          </div>
        )}

        {/* City & State inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground dark:text-muted-foreground mb-1 uppercase tracking-wider">
              City
            </label>
            <input
              type="text"
              placeholder="e.g. Austin"
              value={location.city || ''}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className="w-full border-border dark:border-border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-card dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground dark:text-muted-foreground mb-1 uppercase tracking-wider">
              State / Region
            </label>
            <input
              type="text"
              placeholder="e.g. Texas"
              value={location.state || ''}
              onChange={(e) => handleLocationChange('state', e.target.value)}
              className="w-full border-border dark:border-border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-card dark:text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Coordinates preview */}
        {location.latitude && location.longitude && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground dark:text-muted-foreground">
            <Crosshair className="w-3 h-3" />
            <span>
              {Number(location.latitude).toFixed(4)}°, {Number(location.longitude).toFixed(4)}°
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

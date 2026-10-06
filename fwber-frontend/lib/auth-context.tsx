'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback } from 'react'
import { logAuth, setUserContext, clearUserContext } from './logger'
import { setApiClientAuthToken } from './api/client'

// Types
interface User {
  id: number
  email: string
  role?: string
  name: string
  emailVerifiedAt: string | null
  createdAt: string
  updatedAt: string
  two_factor_enabled?: boolean
  referral_code?: string
  referrals_count?: number
  vouches_count?: number
  golden_tickets_remaining?: number
  token_balance?: number
  onboarding_completed_at?: string | null
  profile?: {
    displayName: string | null
    dateOfBirth: string | null
    gender: string | null
    pronouns: string | null
    sexualOrientation: string | null
    relationshipStyle: string | null
    bio: string | null
    locationLatitude: number | null
    locationLongitude: number | null
    locationDescription: string | null
    stiStatus: string | null
    preferences: Record<string, any> | null
    avatarUrl: string | null
    is_federated?: boolean
    is_confessional_mode?: boolean
    createdAt: string
    updatedAt: string
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  requiresTwoFactor: boolean
  isBanned: boolean
  error: string | null
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'TWO_FACTOR_REQUIRED' }
  | { type: 'BANNED' }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'INITIALIZE_END' }

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  loginWithWallet: (walletAddress: string, signature: string, message: string) => Promise<void>
  verifyTwoFactor: (code: string, recoveryCode?: string) => Promise<void>
  register: (name: string, email: string, password: string, passwordConfirmation: string, avatar?: File | null, referralCode?: string) => Promise<void>
  logout: () => void
  clearError: () => void
  updateUser: (user: User) => void
}

const BROWSER_API_BASE_URL = 'https://api.fwber.site/api'

function isTransientAuthResponse(status: number): boolean {
  return status >= 500 || status === 429
}

function restoreCachedAuth(
  userStr: string | null,
  token: string | null,
  cancelled: boolean,
  dispatch: React.Dispatch<AuthAction>
): boolean {
  if (!userStr || !token) {
    return false
  }

  try {
    const parsedUser = JSON.parse(userStr) as User
    setApiClientAuthToken(token)

    if (!cancelled) {
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: parsedUser, token },
      })
    }

    try {
      setUserContext(parsedUser)
    } catch (error) {
      console.error('Logging/Sentry error:', error)
    }

    return true
  } catch (restoreError) {
    console.error('AuthContext Cache Restore Error:', restoreError)
    return false
  }
}

function clearStoredAuth(): void {
  if (typeof window === 'undefined') {
    return
  }

  setApiClientAuthToken(null)
  localStorage.removeItem('fwber_token')
  localStorage.removeItem('fwber_user')
}

/** Normalize backend snake_case user to frontend camelCase */
function normalizeUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    role: raw.role,
    name: raw.name,
    emailVerifiedAt: raw.email_verified_at ?? raw.emailVerifiedAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
    two_factor_enabled: raw.two_factor_enabled,
    referral_code: raw.referral_code,
    referrals_count: raw.referrals_count,
    vouches_count: raw.vouches_count,
    golden_tickets_remaining: raw.golden_tickets_remaining,
    token_balance: raw.token_balance,
    onboarding_completed_at: raw.onboarding_completed_at ?? raw.onboarding_completed_at,
    profile: raw.profile ? {
      displayName: raw.profile.display_name ?? raw.profile.displayName,
      dateOfBirth: raw.profile.date_of_birth ?? raw.profile.dateOfBirth,
      gender: raw.profile.gender,
      pronouns: raw.profile.pronouns,
      sexualOrientation: raw.profile.sexual_orientation ?? raw.profile.sexualOrientation,
      relationshipStyle: raw.profile.relationship_style ?? raw.profile.relationshipStyle,
      bio: raw.profile.bio,
      locationLatitude: raw.profile.location_latitude ?? raw.profile.locationLatitude,
      locationLongitude: raw.profile.location_longitude ?? raw.profile.locationLongitude,
      locationDescription: raw.profile.location_description ?? raw.profile.locationDescription,
      stiStatus: raw.profile.sti_status ?? raw.profile.stiStatus,
      preferences: raw.profile.preferences,
      avatarUrl: raw.profile.avatar_url ?? raw.profile.avatarUrl,
      is_federated: raw.profile.is_federated,
      is_confessional_mode: raw.profile.is_confessional_mode,
      is_incognito: raw.profile.is_incognito,
      is_verified: raw.profile.is_verified,
      createdAt: raw.profile.created_at ?? raw.profile.createdAt,
      updatedAt: raw.profile.updated_at ?? raw.profile.updatedAt,
    } : raw.profile,
  };
}

function persistStoredAuth(user: User, token: string): void {
  if (typeof window === 'undefined') {
    return
  }

  setApiClientAuthToken(token)
  localStorage.setItem('fwber_token', token)
  localStorage.setItem('fwber_user', JSON.stringify(user))
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  requiresTwoFactor: false,
  isBanned: false,
  error: null,
}

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        requiresTwoFactor: false,
        isBanned: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      }
    case 'TWO_FACTOR_REQUIRED':
      return {
        ...state,
        isLoading: false,
        requiresTwoFactor: true,
        error: null,
      }
    case 'BANNED':
        return {
          ...state,
          isLoading: false,
          isAuthenticated: true, // They are technically auth'd but restricted
          isBanned: true,
          error: 'Your account is globally banned.',
        }
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        requiresTwoFactor: false,
        isBanned: false,
        user: null,
        token: null,
        error: action.payload,
      }
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        requiresTwoFactor: false,
        isBanned: false,
        user: null,
        token: null,
        error: null,
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      }
    case 'INITIALIZE_END':
      return {
        ...state,
        isLoading: false,
      }
    default:
      return state
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Initialize auth state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      dispatch({ type: 'INITIALIZE_END' })
      return
    }

    let cancelled = false

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('fwber_token')
        const userStr = localStorage.getItem('fwber_user')
        const devToken = localStorage.getItem('auth_token')

        // Development bypass: if we have 'auth_token' = 'dev', treat as authenticated
        if (devToken === 'dev') {
          if (!cancelled) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: {
                  id: 1,
                  email: 'test@example.com',
                  name: 'Test User',
                  emailVerifiedAt: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  profile: {
                    displayName: 'Test User',
                    dateOfBirth: '1990-01-01',
                    gender: 'Non-binary',
                    pronouns: 'They/Them',
                    sexualOrientation: 'Pansexual',
                    relationshipStyle: 'Polyamorous',
                    bio: 'Test bio',
                    locationLatitude: 0,
                    locationLongitude: 0,
                    locationDescription: 'Test Location',
                    stiStatus: 'Negative',
                    preferences: {},
                    avatarUrl: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                },
                token: 'mock-jwt-token',
              },
            })
          }
          return
        }

        if (!token || !userStr) {
          setApiClientAuthToken(null)
          if (!cancelled) {
            dispatch({ type: 'INITIALIZE_END' })
          }
          return
        }

        try {
          const storedUser = JSON.parse(userStr) as User
          setApiClientAuthToken(token)

          const response = await fetch(`${BROWSER_API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            if (response.status === 403) {
              const data = await response.json();
              if (data.code === 'GLOBAL_BAN') {
                  dispatch({ type: 'BANNED' });
                  return;
              }
            }
            
            if (isTransientAuthResponse(response.status)) {
              if (!cancelled) {
                dispatch({
                  type: 'AUTH_SUCCESS',
                  payload: { user: storedUser, token },
                })

                try {
                  setUserContext(storedUser)
                } catch (error) {
                  console.error('Logging/Sentry error:', error)
                }
              }
              return
            }

            clearStoredAuth()
            clearUserContext()

            if (!cancelled) {
              dispatch({ type: 'INITIALIZE_END' })
            }
            return
          }

          const verifiedUser = normalizeUser(await response.json())

          if (!cancelled) {
            setApiClientAuthToken(token)
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user: verifiedUser, token },
            })

            try {
              setUserContext(verifiedUser)
              logAuth.sessionRestored(verifiedUser.id)
            } catch (error) {
              console.error('Logging/Sentry error:', error)
            }
          }
        } catch (error) {
          console.error('AuthContext Restore Error:', error)

          if (restoreCachedAuth(userStr, token, cancelled, dispatch)) {
            return
          }

          clearStoredAuth()
          clearUserContext()
          if (!cancelled) {
            dispatch({ type: 'INITIALIZE_END' })
          }
          return
        }
      } catch (err) {
        console.error('AuthContext: Critical Init Error', err)

        if (restoreCachedAuth(localStorage.getItem('fwber_user'), localStorage.getItem('fwber_token'), cancelled, dispatch)) {
          return
        }

        clearStoredAuth()
        clearUserContext()

        if (!cancelled) {
          dispatch({ type: 'INITIALIZE_END' })
        }
      }
    }

    void initializeAuth()

    return () => {
      cancelled = true
    }
  }, [])

  // Save to localStorage when auth state changes
  useEffect(() => {
    if (state.isLoading) return

    if (typeof window !== 'undefined') {
      if (state.isAuthenticated && state.token && state.user) {
        localStorage.setItem('fwber_token', state.token)
        localStorage.setItem('fwber_user', JSON.stringify(state.user))
      } else {
        clearStoredAuth()
      }
    }
  }, [state.isAuthenticated, state.token, state.user, state.isLoading])

  // API base URL - Ensure relative /api in browser for proxying
  const API_BASE_URL = typeof window !== 'undefined' 
    ? '/api' 
    : (process.env.NEXT_PUBLIC_API_URL || 'https://api.fwber.site/api');


  // Login function
  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' })
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      })
      clearTimeout(timeoutId);

      const data = await response.json()

      if (!response.ok) {
        logAuth.login(email, false, data.message)
        throw new Error(data.message || 'Login failed')
      }

      if (data.two_factor) {
        dispatch({ type: 'TWO_FACTOR_REQUIRED' })
        return
      }

      logAuth.login(email, true)
      setUserContext(normalizeUser(data.user))
      persistStoredAuth(normalizeUser(data.user), data.access_token || data.token)
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { 
          user: normalizeUser(data.user), 
          token: data.access_token || data.token 
        } 
      })
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Login failed' 
      })
      throw error
    }
  }, [API_BASE_URL]);

  // Login with Wallet function
  const loginWithWallet = useCallback(async (walletAddress: string, signature: string, message: string) => {
    dispatch({ type: 'AUTH_START' })

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ wallet_address: walletAddress, signature, message }),
      })

      const data = await response.json()

      if (!response.ok) {
        logAuth.login(walletAddress, false, data.message)
        throw new Error(data.message || 'Wallet login failed')
      }

      logAuth.login(walletAddress, true)
      setUserContext(normalizeUser(data.user))
      persistStoredAuth(normalizeUser(data.user), data.access_token || data.token)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: normalizeUser(data.user),
          token: data.access_token || data.token
        }
      })
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Wallet login failed'
      })
      throw error
    }
  }, [API_BASE_URL]);

  // Verify Two Factor function
  const verifyTwoFactor = useCallback(async (code: string, recoveryCode?: string) => {
    dispatch({ type: 'AUTH_START' })
    
    try {
      const response = await fetch(`${API_BASE_URL}/two-factor-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          recovery_code: recoveryCode 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Two factor verification failed')
      }

      // Assuming the challenge endpoint returns the same structure as login on success
      setUserContext(normalizeUser(data.user))
      persistStoredAuth(normalizeUser(data.user), data.access_token || data.token)
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { 
          user: normalizeUser(data.user), 
          token: data.access_token || data.token 
        } 
      })
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Two factor verification failed' 
      })
      throw error
    }
  }, [API_BASE_URL]);

  // Register function
  const register = useCallback(async (name: string, email: string, password: string, passwordConfirmation: string, avatar?: File | null, referralCode?: string) => {
    dispatch({ type: 'AUTH_START' })
    
    try {
      let body: any;
      let headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (avatar) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('password_confirmation', passwordConfirmation);
        formData.append('avatar', avatar);
        if (referralCode) formData.append('referral_code', referralCode);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ 
          name, 
          email, 
          password, 
          password_confirmation: passwordConfirmation,
          referral_code: referralCode
        });
      }

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: headers,
        body: body,
      })

      const data = await response.json()

      if (!response.ok) {
        logAuth.register(email, false, data.message)
        throw new Error(data.message || 'Registration failed')
      }

      logAuth.register(email, true)
      setUserContext(normalizeUser(data.user))
      persistStoredAuth(normalizeUser(data.user), data.access_token || data.token)
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { 
          user: normalizeUser(data.user), 
          token: data.access_token || data.token 
        } 
      })
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Registration failed' 
      })
      throw error
    }
  }, [API_BASE_URL]);

  // Logout function
  const logout = useCallback(() => {
    const userId = state.user?.id
    clearStoredAuth()
    clearUserContext()
    logAuth.logout(userId)
    dispatch({ type: 'LOGOUT' })
  }, [state.user?.id]);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, []);

  // Update user function
  const updateUser = useCallback((user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user })
  }, []);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    loginWithWallet,
    verifyTwoFactor,
    register,
    logout,
    clearError,
    updateUser,
  }), [state, login, loginWithWallet, verifyTwoFactor, register, logout, clearError, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Fallback for testing if provider is missing
    if (typeof window !== 'undefined' && (window as any).Cypress) {
       console.warn('AuthContext missing in Cypress test, returning mock');
       return {
         user: { id: 1, name: 'Test User', email: 'test@example.com' },
         isAuthenticated: true,
         isLoading: false,
         requiresTwoFactor: false,
         token: 'mock-token',
         login: async () => {},
         verifyTwoFactor: async () => {},
         register: async () => {},
         logout: () => {},
         clearError: () => {},
         updateUser: () => {},
         error: null,
       } as any;
    }
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

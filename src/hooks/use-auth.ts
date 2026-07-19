/**
 * BetterAuth React Hook
 *
 * This hook provides authentication state management using BetterAuth
 * instead of Supabase.
 */

import { useEffect, useState, useCallback } from 'react';

export type AppRole = 'admin' | 'bendahara';

export interface AuthProfile {
  id: string;
  username: string;
  fullName: string;
  isActive: boolean;
  role: AppRole | null;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
  token: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
}

export interface UseAuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  profile: AuthProfile | null;
  loading: boolean;
  error: string | null;
}

export interface SignInCredentials {
  username: string;
  password: string;
}

const API_BASE = '/api/auth';

export function useAuth(): UseAuthState & {
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
} {
  const [state, setState] = useState<UseAuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/session`, {
        credentials: 'include',
      });

      if (!res.ok) {
        setState({
          session: null,
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
        return;
      }

      const data = await res.json();

      if (data.session) {
        setState({
          session: data.session.session,
          user: data.session.user,
          profile: data.profile,
          loading: false,
          error: null,
        });
      } else {
        setState({
          session: null,
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      setState({
        session: null,
        user: null,
        profile: null,
        loading: false,
        error: 'Failed to fetch session',
      });
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const res = await fetch(`${API_BASE}/sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: data.error }));
        return { success: false, error: data.error };
      }

      setState({
        session: data.session.session,
        user: data.session.user,
        profile: data.profile,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = 'Login failed. Please try again.';
      setState((s) => ({ ...s, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sign-out`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        return { success: false, error: 'Logout failed' };
      }

      setState({
        session: null,
        user: null,
        profile: null,
        loading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Logout failed' };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  return {
    ...state,
    signIn,
    signOut,
    refreshSession,
  };
}

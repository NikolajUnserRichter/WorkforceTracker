/**
 * Auth Context
 * Manages authentication state across the application using Supabase Auth.
 *
 * Provides:
 * - Current user information
 * - Login/logout functions
 * - Role-based access helpers
 * - Auth state persistence
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseAuthService } from '../services/supabaseAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state from Supabase session
  useEffect(() => {
    let mounted = true;
    let timeoutId;

    async function initializeAuth() {
      // Set a fallback timeout to ensure we don't stay loading forever
      timeoutId = setTimeout(() => {
        if (mounted && loading) {
          console.warn('Auth initialization timeout - proceeding without auth');
          setLoading(false);
          setInitialized(true);
        }
      }, 8000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          throw error;
        }

        if (session?.user && mounted) {
          const profile = await supabaseAuthService.getProfile(session.user.id).catch((err) => {
            console.error('Profile fetch error:', err);
            return null;
          });

          if (profile && profile.is_active) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              username: profile.username,
              role: profile.role,
              departments: profile.departments || [],
              isActive: profile.is_active,
            });
          } else {
            // User exists but profile is inactive or missing
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
          }
        }
      } catch (error) {
        // Ignore AbortError - this happens in React Strict Mode during development
        // when components are mounted, unmounted, then remounted
        if (error?.name === 'AbortError' || error?.message?.includes('AbortError') || error?.message?.includes('aborted')) {
          console.log('Auth request aborted (expected in dev mode)');
        } else {
          console.error('Error initializing auth:', error);
        }
        if (mounted) {
          setUser(null);
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Don't fetch profile here - let the login function handle it
          // This prevents double-fetching and potential hangs
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Refresh profile data on token refresh with timeout
          const profile = await supabaseAuthService.getProfile(session.user.id).catch(() => null);
          if (profile && mounted) {
            setUser((prev) => prev ? ({
              ...prev,
              role: profile.role,
              departments: profile.departments || [],
              isActive: profile.is_active,
            }) : null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login with email and password
   */
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const profile = await supabaseAuthService.getProfile(data.user.id);

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      throw new Error('User account is inactive');
    }

    const userData = {
      id: data.user.id,
      email: data.user.email,
      username: profile.username,
      role: profile.role,
      departments: profile.departments || [],
      isActive: profile.is_active,
    };

    setUser(userData);
    return userData;
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /**
   * Check if current user is admin
   */
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  /**
   * Check if user has access to a specific department
   */
  const hasAccessToDepartment = (department) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.departments?.includes('ALL')) return true;
    return user.departments?.includes(department) || false;
  };

  /**
   * Refresh user profile from database
   */
  const refreshProfile = async () => {
    if (!user?.id) return;

    const profile = await supabaseAuthService.getProfile(user.id);
    if (profile) {
      setUser((prev) => ({
        ...prev,
        username: profile.username,
        role: profile.role,
        departments: profile.departments || [],
        isActive: profile.is_active,
      }));
    }
  };

  const value = {
    user,
    loading,
    initialized,
    login,
    logout,
    isAdmin,
    hasAccessToDepartment,
    refreshProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

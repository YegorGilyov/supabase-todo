import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true
  });

  useEffect(() => {
    let isInitialSessionLoaded = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      isInitialSessionLoaded = true;
      setState({
        user: session?.user ?? null,
        loading: false
      });
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only update if we've loaded the initial session and this isn't the initial event
      if (isInitialSessionLoaded && event !== 'INITIAL_SESSION') {
        setState({
          user: session?.user ?? null,
          loading: false
        });
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = useMemo(() => ({
    user: state.user,
    loading: state.loading,
    signIn,
    signUp,
    signOut,
  }), [state.user, state.loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
} 
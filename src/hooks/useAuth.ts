import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService } from '../services/AuthService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    AuthService.getCurrentUser()
      .then(setUser)
      .catch((error) => {
        // If it's just a missing session, we don't need to log the error
        if (error.message !== 'Auth session missing!') {
          console.error('Auth error:', error);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));

    // Subscribe to auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await AuthService.signIn(email, password);
      setUser(user);
      return { user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { user } = await AuthService.signUp(email, password);
      setUser(user);
      return { user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
} 
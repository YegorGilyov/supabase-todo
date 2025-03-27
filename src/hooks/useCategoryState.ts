import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types/models/category';
import { User } from '@supabase/supabase-js';
import { CategoryContextValue } from '../types/contexts/registry';

export function useCategoryState(user: User | null): CategoryContextValue {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial data load
  useEffect(() => {
    if (!user) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCategories(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              // Only add if it's not our optimistic update
              if (!categories.some(category => category.id.startsWith('temp-'))) {
                setCategories(current => [payload.new as Category, ...current]);
              } else {
                // Replace optimistic category with real one
                setCategories(current => 
                  current.map(category => 
                    category.id.startsWith('temp-') ? payload.new as Category : category
                  )
                );
              }
              break;
            case 'DELETE':
              setCategories(current => 
                current.filter(category => category.id !== payload.old.id)
              );
              break;
            case 'UPDATE':
              setCategories(current =>
                current.map(category =>
                  category.id === payload.new.id ? payload.new as Category : category
                )
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, categories]);

  const addCategory = useCallback(async (title: string) => {
    if (!user) throw new Error('User not authenticated');

    // Optimistic update
    const tempId = 'temp-' + Date.now();
    const now = new Date().toISOString();
    const optimisticCategory: Category = {
      id: tempId,
      title,
      user_id: user.id,
      created_at: now,
      updated_at: now
    };

    setCategories(current => [optimisticCategory, ...current]);

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ title, user_id: user.id }]);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setCategories(current => current.filter(c => c.id !== tempId));
      setError(e as Error);
    }
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    // Optimistic update
    const previousCategories = [...categories];
    setCategories(current => current.filter(category => category.id !== id));

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setCategories(previousCategories);
      setError(e as Error);
    }
  }, [categories]);

  const editCategory = useCallback(async (id: string, title: string) => {
    // Optimistic update
    const previousCategories = [...categories];
    setCategories(current =>
      current.map(category =>
        category.id === id ? { ...category, title } : category
      )
    );

    try {
      const { error } = await supabase
        .from('categories')
        .update({ title })
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setCategories(previousCategories);
      setError(e as Error);
    }
  }, [categories]);

  return {
    categories,
    isLoading,
    error,
    addCategory,
    deleteCategory,
    editCategory,
  };
} 
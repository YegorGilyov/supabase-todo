import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types/models/category';
import { User } from '@supabase/supabase-js';
import { CategoryContextValue } from '../types/contexts/registry';

export function useCategoryState(user: User | null): CategoryContextValue {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCategories = async () => {
    try {
      const { data, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoriesError) throw categoriesError;

      setCategories(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (!user) {
      setCategories([]);
      setIsLoading(false);
      return;
    }
    console.log("Initial data load: categories");
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
        () => {
          console.log("Reloading categories on categories table change");
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addCategory = async (title: string) => {
    if (!user) throw new Error('User not authenticated');

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
      setCategories(current => current.filter(c => c.id !== tempId));
      setError(e as Error);
    }
  };

  const deleteCategory = async (id: string) => {
    const previousCategories = [...categories];
    
    setCategories(current => current.filter(category => category.id !== id));

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      setCategories(previousCategories);
      setError(error);
    }
  };

  const editCategory = async (id: string, title: string) => {
    const previousCategories = [...categories];
    
    setCategories(current => current.map(category =>
      category.id === id ? { ...category, title } : category
    ));

    const { error } = await supabase
      .from('categories')
      .update({ title })
      .eq('id', id);

    if (error) {
      setCategories(previousCategories);
      setError(error);
    }
  };

  return {
    categories,
    isLoading,
    error,
    addCategory,
    deleteCategory,
    editCategory,
  };
} 
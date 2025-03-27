import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Todo } from '../types/models/todo';
import { User } from '@supabase/supabase-js';
import { TodoContextValue } from '../types/contexts/registry';

export function useTodoState(user: User | null): TodoContextValue {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial data load
  useEffect(() => {
    if (!user) {
      setTodos([]);
      setIsLoading(false);
      return;
    }

    const loadTodos = async () => {
      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTodos(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              // Only add if it's not our optimistic update
              if (!todos.some(todo => todo.id.startsWith('temp-'))) {
                setTodos(current => [payload.new as Todo, ...current]);
              } else {
                // Replace optimistic todo with real one
                setTodos(current => 
                  current.map(todo => 
                    todo.id.startsWith('temp-') ? payload.new as Todo : todo
                  )
                );
              }
              break;
            case 'DELETE':
              setTodos(current => 
                current.filter(todo => todo.id !== payload.old.id)
              );
              break;
            case 'UPDATE':
              setTodos(current =>
                current.map(todo =>
                  todo.id === payload.new.id ? payload.new as Todo : todo
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
  }, [user, todos]);

  const addTodo = useCallback(async (title: string) => {
    if (!user) throw new Error('User not authenticated');

    // Optimistic update
    const tempId = 'temp-' + Date.now();
    const now = new Date().toISOString();
    const optimisticTodo: Todo = {
      id: tempId,
      title,
      is_complete: false,
      user_id: user.id,
      created_at: now,
      updated_at: now
    };

    setTodos(current => [optimisticTodo, ...current]);

    try {
      const { error } = await supabase
        .from('todos')
        .insert([{ title, user_id: user.id, is_complete: false }]);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setTodos(current => current.filter(t => t.id !== tempId));
      setError(e as Error);
    }
  }, [user]);

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic update
    const previousTodos = [...todos];
    setTodos(current => current.filter(todo => todo.id !== id));

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setTodos(previousTodos);
      setError(e as Error);
    }
  }, [todos]);

  const editTodo = useCallback(async (id: string, title: string) => {
    // Optimistic update
    const previousTodos = [...todos];
    setTodos(current =>
      current.map(todo =>
        todo.id === id ? { ...todo, title } : todo
      )
    );

    try {
      const { error } = await supabase
        .from('todos')
        .update({ title })
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setTodos(previousTodos);
      setError(e as Error);
    }
  }, [todos]);

  const toggleTodo = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) throw new Error('Todo not found');

    // Optimistic update
    const previousTodos = [...todos];
    setTodos(current =>
      current.map(t =>
        t.id === id ? { ...t, is_complete: !t.is_complete } : t
      )
    );

    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: !todo.is_complete })
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      // Rollback on error
      setTodos(previousTodos);
      setError(e as Error);
    }
  }, [todos]);

  return {
    todos,
    isLoading,
    error,
    addTodo,
    deleteTodo,
    editTodo,
    toggleTodo,
  };
} 
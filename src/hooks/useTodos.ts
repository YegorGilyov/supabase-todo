import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Todo, NewTodo } from '../types/todo';
import { useAuth } from './useAuth';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Query key factory
const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...todoKeys.lists(), filters] as const,
  details: (id: string) => [...todoKeys.all, 'detail', id] as const,
};

// Helper for optimistic todo creation
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function useTodos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Query for fetching todos
  const query = useQuery({
    queryKey: todoKeys.lists(),
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Todo[];
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  // Memoized cache update function
  const updateCache = useCallback((updater: (oldData: Todo[]) => Todo[]) => {
    queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old = []) => updater(old));
  }, [queryClient]);

  // Add todo mutation
  const addMutation = useMutation({
    mutationFn: async (newTodo: NewTodo) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('todos')
        .insert([{ ...newTodo, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async (newTodo) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists()) ?? [];

      const optimisticTodo: Todo = {
        id: generateTempId(),
        title: newTodo.title,
        is_complete: false,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      updateCache(old => [optimisticTodo, ...old]);

      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousTodos) {
        updateCache(() => context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  // Toggle todo mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isComplete }: { id: string; isComplete: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('todos')
        .update({ is_complete: isComplete })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async ({ id, isComplete }) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists()) ?? [];

      updateCache(old => 
        old.map(todo => todo.id === id ? { ...todo, is_complete: isComplete } : todo)
      );

      return { previousTodos };
    },
    onError: (err, variables, context) => {
      if (context?.previousTodos) {
        updateCache(() => context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
      const previousTodos = queryClient.getQueryData<Todo[]>(todoKeys.lists()) ?? [];

      updateCache(old => old.filter(todo => todo.id !== id));

      return { previousTodos };
    },
    onError: (err, id, context) => {
      if (context?.previousTodos) {
        updateCache(() => context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });

  // Memoized realtime change handler
  const handleRealtimeChange = useCallback((payload: RealtimePostgresChangesPayload<Todo>) => {
    switch (payload.eventType) {
      case 'INSERT': {
        const newTodo = payload.new;
        // Remove any optimistic version and avoid duplicates
        updateCache(old => {
          const filtered = old.filter(todo => 
            !(todo.id.startsWith('temp_') && todo.title === newTodo.title) && 
            todo.id !== newTodo.id
          );
          return [newTodo, ...filtered];
        });
        break;
      }
      case 'UPDATE': {
        const updatedTodo = payload.new;
        updateCache(old => {
          const filtered = old.filter(todo => todo.id !== updatedTodo.id);
          return [updatedTodo, ...filtered].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        break;
      }
      case 'DELETE': {
        updateCache(old => old.filter(todo => todo.id !== payload.old.id));
        break;
      }
    }
  }, [updateCache]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'todos',
          filter: `user_id=eq.${user.id}`
        },
        handleRealtimeChange
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, handleRealtimeChange]);

  return {
    todos: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addTodo: addMutation.mutate,
    toggleTodo: toggleMutation.mutate,
    deleteTodo: deleteMutation.mutate,
  };
} 
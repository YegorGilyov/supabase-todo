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

// Helper for sorting todos
const sortTodosByDate = (todos: Todo[]) => 
  todos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export function useTodos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Memoized cache update function
  const updateCache = useCallback((updater: (oldData: Todo[]) => Todo[]) => {
    queryClient.setQueryData<Todo[]>(todoKeys.lists(), (old = []) => sortTodosByDate(updater(old)));
  }, [queryClient]);

  // Common mutation error handler
  const handleMutationError = useCallback((context?: { previousTodos: Todo[] }) => {
    if (context?.previousTodos) {
      updateCache(() => context.previousTodos);
    }
  }, [updateCache]);

  // Common mutation setup
  const setupMutation = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    await queryClient.cancelQueries({ queryKey: todoKeys.lists() });
    return queryClient.getQueryData<Todo[]>(todoKeys.lists()) ?? [];
  }, [user, queryClient]);

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

  // Add todo mutation
  const addMutation = useMutation({
    mutationFn: async (newTodo: NewTodo) => {
      await setupMutation();
      const { data, error } = await supabase
        .from('todos')
        .insert([{ ...newTodo, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async (newTodo) => {
      const previousTodos = await setupMutation();

      const optimisticTodo: Todo = {
        id: generateTempId(),
        title: newTodo.title,
        is_complete: false,
        user_id: user!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      updateCache(old => [optimisticTodo, ...old]);
      return { previousTodos };
    },
    onError: (_err, _newTodo, context) => handleMutationError(context)
  });

  // Toggle todo mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isComplete }: { id: string; isComplete: boolean }) => {
      await setupMutation();
      const { data, error } = await supabase
        .from('todos')
        .update({ is_complete: isComplete })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async ({ id, isComplete }) => {
      const previousTodos = await setupMutation();
      updateCache(old => 
        old.map(todo => todo.id === id ? { ...todo, is_complete: isComplete } : todo)
      );
      return { previousTodos };
    },
    onError: (_err, _variables, context) => handleMutationError(context)
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await setupMutation();
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      const previousTodos = await setupMutation();
      updateCache(old => old.filter(todo => todo.id !== id));
      return { previousTodos };
    },
    onError: (_err, _id, context) => handleMutationError(context)
  });

  // Helper for filtering out existing or temporary todos
  const filterExistingTodo = useCallback((todos: Todo[], todoId: string, tempTitle: string | null = null) => 
    todos.filter(todo => 
      !(tempTitle && todo.id.startsWith('temp_') && todo.title === tempTitle) && 
      todo.id !== todoId
    ), []);

  // Memoized realtime change handler
  const handleRealtimeChange = useCallback((payload: RealtimePostgresChangesPayload<Todo>) => {
    switch (payload.eventType) {
      case 'INSERT': {
        const newTodo = payload.new;
        updateCache(old => [newTodo, ...filterExistingTodo(old, newTodo.id, newTodo.title)]);
        break;
      }
      case 'UPDATE': {
        const updatedTodo = payload.new;
        updateCache(old => [updatedTodo, ...filterExistingTodo(old, updatedTodo.id, null)]);
        break;
      }
      case 'DELETE': {
        const todoId = payload.old?.id;
        if (!todoId) return;
        updateCache(old => filterExistingTodo(old, todoId, null));
        break;
      }
    }
  }, [updateCache, filterExistingTodo]);

  // Cleanup channel helper
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return;

    cleanupChannel();

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

    return cleanupChannel;
  }, [user, handleRealtimeChange, cleanupChannel]);

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
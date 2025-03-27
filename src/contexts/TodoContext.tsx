import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Todo, NewTodo } from '../types/todo';
import { useAuthContext } from './AuthContext';

// Helper for optimistic todo creation
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper for sorting todos
const sortTodosByDate = (todos: Todo[]) => 
  todos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

interface TodoContextType {
  todos: Todo[];
  isLoading: boolean;
  addTodo: (todo: NewTodo) => Promise<void>;
  toggleTodo: (params: { id: string; isComplete: boolean }) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  editTodo: (params: { id: string; title: string }) => Promise<void>;
}

const TodoContext = createContext<TodoContextType | null>(null);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial todos
  useEffect(() => {
    async function fetchTodos() {
      if (!user) {
        setTodos([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTodos(data as Todo[]);
      } catch (error) {
        console.error('Error fetching todos:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTodos();
  }, [user]);

  // Update state helper
  const updateTodos = useCallback((updater: (oldTodos: Todo[]) => Todo[]) => {
    setTodos(old => sortTodosByDate(updater(old)));
  }, []);

  // Add todo
  const addTodo = async (newTodo: NewTodo) => {
    if (!user) throw new Error('User not authenticated');

    const optimisticTodo: Todo = {
      id: generateTempId(),
      title: newTodo.title,
      is_complete: false,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    const previousTodos = [...todos];
    updateTodos(old => [optimisticTodo, ...old]);

    try {
      const { error } = await supabase
        .from('todos')
        .insert([{ ...newTodo, user_id: user.id }]);

      if (error) throw error;
      // Real-time will handle the update
    } catch (error) {
      console.error('Error adding todo:', error);
      setTodos(previousTodos);
      throw error;
    }
  };

  // Toggle todo
  const toggleTodo = async ({ id, isComplete }: { id: string; isComplete: boolean }) => {
    if (!user) throw new Error('User not authenticated');

    const previousTodos = [...todos];
    updateTodos(old => 
      old.map(todo => todo.id === id ? { ...todo, is_complete: isComplete } : todo)
    );

    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_complete: isComplete })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling todo:', error);
      setTodos(previousTodos);
      throw error;
    }
  };

  // Delete todo
  const deleteTodo = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const previousTodos = [...todos];
    updateTodos(old => old.filter(todo => todo.id !== id));

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting todo:', error);
      setTodos(previousTodos);
      throw error;
    }
  };

  // Edit todo
  const editTodo = async ({ id, title }: { id: string; title: string }) => {
    if (!user) throw new Error('User not authenticated');

    const previousTodos = [...todos];
    updateTodos(old => 
      old.map(todo => todo.id === id ? { ...todo, title } : todo)
    );

    try {
      const { error } = await supabase
        .from('todos')
        .update({ title })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing todo:', error);
      setTodos(previousTodos);
      throw error;
    }
  };

  // Helper for filtering out existing or temporary todos
  const filterExistingTodo = useCallback((todos: Todo[], todoId: string, tempTitle: string | null = null) => 
    todos.filter(todo => 
      !(tempTitle && todo.id.startsWith('temp_') && todo.title === tempTitle) && 
      todo.id !== todoId
    ), []);

  // Real-time change handler
  const handleRealtimeChange = useCallback((payload: RealtimePostgresChangesPayload<Todo>) => {
    switch (payload.eventType) {
      case 'INSERT': {
        const newTodo = payload.new;
        updateTodos(old => [newTodo, ...filterExistingTodo(old, newTodo.id, newTodo.title)]);
        break;
      }
      case 'UPDATE': {
        const updatedTodo = payload.new;
        updateTodos(old => [updatedTodo, ...filterExistingTodo(old, updatedTodo.id, null)]);
        break;
      }
      case 'DELETE': {
        const todoId = payload.old?.id;
        if (!todoId) return;
        updateTodos(old => filterExistingTodo(old, todoId, null));
        break;
      }
    }
  }, [updateTodos, filterExistingTodo]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return;

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
      }
    };
  }, [user, handleRealtimeChange]);

  const value = {
    todos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
  };

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
}

export function useTodoContext() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodoContext must be used within a TodoProvider');
  }
  return context;
} 
import { useState, useEffect } from 'react';
import type { Todo, NewTodo } from '../types/todo';
import { TodoService } from '../services/TodoService';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true); // Set loading to true whenever user changes
    
    if (!user) {
      setTodos([]);
      setLoading(false);
      return;
    }

    let subscription: RealtimeChannel | undefined;
    
    const setupSubscription = async () => {
      try {
        subscription = await TodoService.subscribeToTodos({
          onAdd: (newTodo) => {
            setTodos(prev => [newTodo, ...prev]);
          },
          onUpdate: (updatedTodo) => {
            setTodos(prev => prev.map(todo => 
              todo.id === updatedTodo.id ? updatedTodo : todo
            ));
          },
          onDelete: (deletedId) => {
            setTodos(prev => prev.filter(todo => todo.id !== deletedId));
          }
        });
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        setError(error instanceof Error ? error.message : 'Failed to setup real-time updates');
      }
    };

    // Load todos first, then set up subscription
    loadTodos().then(() => {
      setupSubscription();
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  const loadTodos = async () => {
    try {
      setError(null);
      const data = await TodoService.getTodos();
      setTodos(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load todos');
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (todo: NewTodo) => {
    try {
      setError(null);
      await TodoService.addTodo(todo);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add todo');
      throw error;
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      setError(null);
      await TodoService.updateTodo(id, updates);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update todo');
      throw error;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      setError(null);
      await TodoService.deleteTodo(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete todo');
      throw error;
    }
  };

  const toggleTodo = async (id: string, isComplete: boolean) => {
    await updateTodo(id, { is_complete: isComplete });
  };

  return {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
} 
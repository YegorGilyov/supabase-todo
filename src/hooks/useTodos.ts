import { useState, useEffect } from 'react';
import type { Todo, NewTodo } from '../types/todo';
import { todoService } from '../services/TodoService';
import { useAuth } from './useAuth';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    
    if (!user) {
      setTodos([]);
      setLoading(false);
      return;
    }

    const unsubscribe = todoService.subscribe((newTodos) => {
      setTodos(newTodos);
      setLoading(false);
    }, user.id);

    return () => {
      unsubscribe();
    };
  }, [user]);

  const addTodo = async (todo: NewTodo) => {
    try {
      setError(null);
      await todoService.addTodo(todo);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add todo');
      throw error;
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    try {
      setError(null);
      await todoService.updateTodo(id, updates);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update todo');
      throw error;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      setError(null);
      await todoService.deleteTodo(id);
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
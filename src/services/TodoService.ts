import { supabase } from '../lib/supabase';
import type { Todo, NewTodo } from '../types/todo';

export class TodoService {
  static async getTodos() {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message.includes('JWT')) {
          throw new Error('Authentication required');
        }
        throw error;
      }

      return data as Todo[];
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  static async addTodo(todo: NewTodo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      const { data, error } = await supabase
        .from('todos')
        .insert([{ ...todo, user_id: user.id }])
        .select()
        .single();

      if (error) {
        if (error.message.includes('JWT')) {
          throw new Error('Authentication required');
        }
        throw error;
      }

      return data as Todo;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  }

  static async updateTodo(id: string, updates: Partial<Todo>) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.message.includes('JWT')) {
          throw new Error('Authentication required');
        }
        throw error;
      }

      return data as Todo;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  static async deleteTodo(id: string) {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.message.includes('JWT')) {
          throw new Error('Authentication required');
        }
        throw error;
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  static async subscribeToTodos(callbacks: {
    onAdd: (todo: Todo) => void;
    onUpdate: (todo: Todo) => void;
    onDelete: (id: string) => void;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      return supabase
        .channel('todos')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            callbacks.onAdd(payload.new as Todo);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            callbacks.onUpdate(payload.new as Todo);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'todos'
          },
          (payload) => {
            callbacks.onDelete(payload.old.id);
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up subscription:', error);
      throw error;
    }
  }
} 
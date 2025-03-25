import { supabase } from '../lib/supabase';
import type { Todo, NewTodo } from '../types/todo';
import { RealtimeChannel } from '@supabase/supabase-js';

// Helper to generate a temporary ID for optimistic updates
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to check if an ID is temporary
const isTempId = (id: string) => id.startsWith('temp_');

type TodoListener = (todos: Todo[]) => void;

class TodoService {
  private listeners = new Set<TodoListener>();
  private subscription: RealtimeChannel | undefined;
  private todos: Todo[] = [];
  private userId: string | undefined;

  constructor() {}

  private notify() {
    this.listeners.forEach(listener => listener(this.todos));
  }

  subscribe(listener: TodoListener, userId: string) {
    // If user changed, reset state
    if (this.userId !== userId) {
      this.todos = [];
      this.unsubscribeAll();
      this.userId = userId;
    }

    this.listeners.add(listener);

    // Setup real-time subscription if not already set up
    if (!this.subscription) {
      this.setupSubscription();
    }

    // Immediately notify with current state
    listener(this.todos);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.unsubscribeAll();
      }
    };
  }

  private async setupSubscription() {
    try {
      // Load initial data
      const data = await this.getTodos();
      this.todos = data;
      this.notify();

      // Setup real-time subscription
      this.subscription = await supabase
        .channel('todos')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${this.userId}`
          },
          (payload) => {
            const newTodo = payload.new as Todo;
            this.todos = this.todos.some(todo => 
              isTempId(todo.id) && todo.title === newTodo.title
            )
              ? this.todos.map(todo => 
                  (isTempId(todo.id) && todo.title === newTodo.title) ? newTodo : todo
                )
              : [newTodo, ...this.todos];
            this.notify();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${this.userId}`
          },
          (payload) => {
            this.todos = this.todos.map(todo => 
              todo.id === payload.new.id ? payload.new as Todo : todo
            );
            this.notify();
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
            this.todos = this.todos.filter(todo => todo.id !== payload.old.id);
            this.notify();
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up subscription:', error);
      throw error;
    }
  }

  private unsubscribeAll() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
    this.todos = [];
    this.userId = undefined;
  }

  async getTodos() {
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

  async addTodo(todo: NewTodo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Add optimistic todo
      const tempId = generateTempId();
      const now = new Date().toISOString();
      const optimisticTodo: Todo = {
        id: tempId,
        user_id: user.id,
        title: todo.title,
        is_complete: false,
        created_at: now,
        updated_at: now
      };

      this.todos = [optimisticTodo, ...this.todos];
      this.notify();

      // Make API call
      const { data, error } = await supabase
        .from('todos')
        .insert([{ ...todo, user_id: user.id }])
        .select()
        .single();

      if (error) {
        // Rollback optimistic update
        this.todos = this.todos.filter(t => !isTempId(t.id));
        this.notify();

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

  async updateTodo(id: string, updates: Partial<Todo>) {
    try {
      const todoToUpdate = this.todos.find(t => t.id === id);
      if (!todoToUpdate) throw new Error('Todo not found');

      // Apply optimistic update
      this.todos = this.todos.map(todo =>
        todo.id === id ? { ...todo, ...updates, updated_at: new Date().toISOString() } : todo
      );
      this.notify();

      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Rollback optimistic update
        if (todoToUpdate) {
          this.todos = this.todos.map(todo =>
            todo.id === id ? todoToUpdate : todo
          );
          this.notify();
        }

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

  async deleteTodo(id: string) {
    try {
      const todoToDelete = this.todos.find(t => t.id === id);
      if (!todoToDelete) throw new Error('Todo not found');

      // Apply optimistic delete
      this.todos = this.todos.filter(todo => todo.id !== id);
      this.notify();

      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) {
        // Rollback optimistic delete
        if (todoToDelete) {
          this.todos = [...this.todos, todoToDelete];
          this.notify();
        }

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
}

// Create and export a single instance
export const todoService = new TodoService(); 
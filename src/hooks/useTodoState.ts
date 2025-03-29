import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Todo, TodoWithCategories } from '../types/models/todo';
import { User } from '@supabase/supabase-js';
import { TodoContextValue } from '../types/contexts/registry';
import { Category } from '../types/models/category';
import { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js';

// Type to represent the raw data structure from Supabase
interface TodoFromDB extends Todo {
  categories: {
    categories: Category;
  }[];
}

export function useTodoState(user: User | null): TodoContextValue {
  const [todos, setTodos] = useState<TodoWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const loadTodos = async () => {
    try {
      if (categoryFilter === 'no-category') {
        // Get todos that have no categories using left join
        const { data: todosData, error: todosError } = await supabase
          .from('todos')
          .select(`
            *,
            categories:todo_categories!left(
              categories(*)
            )
          `)
          .is('categories', null)
          .order('created_at', { ascending: false });

        if (todosError) throw todosError;

        const todosWithCategories = (todosData as TodoFromDB[]).map(todo => ({
          ...todo,
          categories: []  // These todos have no categories by definition
        }));

        setTodos(todosWithCategories);
      } else if (categoryFilter) {
        // Get todos that have the specific category
        const { data: todosWithCategory, error: todosError } = await supabase
          .from('todo_categories')
          .select('todo_id')
          .eq('category_id', categoryFilter);

        if (todosError) throw todosError;

        const todoIds = todosWithCategory.map(t => t.todo_id);
        if (todoIds.length === 0) {
          setTodos([]);
          return;
        }

        const { data: todosData, error: todosDataError } = await supabase
          .from('todos')
          .select(`
            *,
            categories:todo_categories(
              categories(*)
            )
          `)
          .in('id', todoIds)
          .order('created_at', { ascending: false });

        if (todosDataError) throw todosDataError;

        const todosWithCategories = (todosData as TodoFromDB[]).map(todo => ({
          ...todo,
          categories: todo.categories?.map(tc => tc.categories) ?? []
        }));

        setTodos(todosWithCategories);
      } else {
        // Get all todos with their categories
        const { data: todosData, error: todosError } = await supabase
          .from('todos')
          .select(`
            *,
            categories:todo_categories(
              categories(*)
            )
          `)
          .order('created_at', { ascending: false });

        if (todosError) throw todosError;

        const todosWithCategories = (todosData as TodoFromDB[]).map(todo => ({
          ...todo,
          categories: todo.categories?.map(tc => tc.categories) ?? []
        }));

        setTodos(todosWithCategories);
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (!user) {
      setTodos([]);
      setIsLoading(false);
      return;
    }
    console.log("Initial data load: todos", categoryFilter);
    loadTodos();
  }, [user, categoryFilter]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const todosChannel = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log("Reloading todos on todos table change", categoryFilter);
          loadTodos();
        }
      )
      .subscribe();

    const todoCategoriesChannel = supabase
      .channel('todo-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todo_categories'
        },
        async (payload: RealtimePostgresChangesPayload<{ todo_id: string }>) => {
          const record = payload.new || payload.old;
          if (!record) return;
          
          const todoId = (record as { todo_id: string }).todo_id;
          if (!todoId) return;

          const { data: todo } = await supabase
            .from('todos')
            .select('user_id')
            .eq('id', todoId)
            .single();

          if (todo?.user_id === user.id) {
            console.log("Reloading todos on todo_categories table change", categoryFilter);
            loadTodos();
          }
        }
      )
      .subscribe();

    const categoriesChannel = supabase
      .channel('categories-for-todos')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log("Reloading todos on categories table change", categoryFilter);
          loadTodos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(todosChannel);
      supabase.removeChannel(todoCategoriesChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [user, categoryFilter]); // why is categoryFilter needed here?

  const addTodo = async (title: string) => {
    if (!user) throw new Error('User not authenticated');

    const tempId = 'temp-' + Date.now();
    const now = new Date().toISOString();
    const optimisticTodo: TodoWithCategories = {
      id: tempId,
      title,
      is_complete: false,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      categories: []
    };

    setTodos(current => [optimisticTodo, ...current]);

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title, user_id: user.id, is_complete: false }])
        .select('id');

      if (error) throw error;

      if (categoryFilter && data?.[0]?.id) {
        console.log("Adding todo to category", data[0].id, categoryFilter);
        const { error } = await supabase
          .from('todo_categories')
          .insert([{ todo_id: data[0].id, category_id: categoryFilter }]);

        if (error) throw error;
      }

    } catch (e) {
      setTodos(current => current.filter(t => t.id !== tempId));
      setError(e as Error);
    }
  };

  const deleteTodo = async (id: string) => {
    const previousTodos = [...todos];
    
    setTodos(current => current.filter(todo => todo.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      setTodos(previousTodos);
      setError(error);
    }
  };

  const editTodo = async (id: string, title: string) => {
    const previousTodos = [...todos];
    
    setTodos(current => current.map(todo => 
      todo.id === id ? { ...todo, title } : todo
    ));

    const { error } = await supabase
      .from('todos')
      .update({ title })
      .eq('id', id);

    if (error) {
      setTodos(previousTodos);
      setError(error);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) throw new Error('Todo not found');

    const previousTodos = [...todos];
    
    setTodos(current => current.map(t =>
      t.id === id ? { ...t, is_complete: !t.is_complete } : t
    ));

    const { error } = await supabase
      .from('todos')
      .update({ is_complete: !todo.is_complete })
      .eq('id', id);

    if (error) {
      setTodos(previousTodos);
      setError(error);
    }
  };

  const addTodoToCategory = async (todoId: string, categoryId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) throw new Error('Todo not found');
    
    if (todo.categories?.some(c => c.id === categoryId)) {
      return;
    }

    const previousTodos = [...todos];
    
    let category = todos
      .flatMap(t => t.categories ?? [])
      .find(c => c.id === categoryId);
    
    if (!category) {
      const { data: fetchedCategory, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (fetchError || !fetchedCategory) {
        setError(fetchError || new Error('Category not found'));
        return;
      }

      category = fetchedCategory;
    }

    setTodos(current => current.map(t =>
      t.id === todoId ? {
        ...t,
        categories: [...t.categories, category!]
      } : t
    ));

    const { error } = await supabase
      .from('todo_categories')
      .insert([{ todo_id: todoId, category_id: categoryId }]);

    if (error) {
      setTodos(previousTodos);
      setError(error);
    }
  };

  const removeTodoFromCategory = async (todoId: string, categoryId: string) => {
    const previousTodos = [...todos];
    
    setTodos(current => current.map(todo =>
      todo.id === todoId ? {
        ...todo,
        categories: todo.categories.filter(c => c.id !== categoryId)
      } : todo
    ));

    const { error } = await supabase
      .from('todo_categories')
      .delete()
      .match({ todo_id: todoId, category_id: categoryId });

    if (error) {
      setTodos(previousTodos);
      setError(error);
    }
  };

  return {
    todos,
    isLoading,
    error,
    addTodo,
    deleteTodo,
    editTodo,
    toggleTodo,
    addTodoToCategory,
    removeTodoFromCategory,
    categoryFilter,
    setCategoryFilter,
  };
} 
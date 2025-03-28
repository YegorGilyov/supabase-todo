import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Todo, TodoWithCategories } from '../types/models/todo';
import { User } from '@supabase/supabase-js';
import { TodoContextValue } from '../types/contexts/registry';
import { Category } from '../types/models/category';

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

  // Initial data load
  useEffect(() => {
    if (!user) {
      setTodos([]);
      setIsLoading(false);
      return;
    }

    const loadTodos = async () => {
      try {
        // Load todos with their categories in a single query
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

        // Transform the nested data structure into our TodoWithCategories format
        const todosWithCategories = (todosData as TodoFromDB[]).map(todo => ({
          ...todo,
          categories: todo.categories?.map(tc => tc.categories) ?? []
        }));

        console.log("Loading todos", todosWithCategories);

        setTodos(todosWithCategories);
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
      .channel('todos-with-categories')
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
              setTodos(current => {
                if (!current.some(todo => todo.id.startsWith('temp-'))) {
                  console.log("Real-time update: inserting new todo", payload.new);
                  return [{
                    ...(payload.new as Todo),
                    categories: []
                  } as TodoWithCategories, ...current];
                }
                console.log("Real-time update: updating temporary todo", payload.new);
                return current.map(todo => 
                  todo.id.startsWith('temp-') ? {
                    ...(payload.new as Todo),
                    categories: todo.categories
                  } as TodoWithCategories : todo
                );
              });
              break;
            case 'DELETE':
              console.log("Real-time update: deleting todo", payload.old);
              setTodos(current => 
                current.filter(todo => todo.id !== payload.old.id)
              );
              break;
            case 'UPDATE':
              console.log("Real-time update: updating todo", payload.new);
              setTodos(current =>
                current.map(todo =>
                  todo.id === payload.new.id ? {
                    ...(payload.new as Todo),
                    categories: todo.categories
                  } : todo
                )
              );
              break;
          }
        }
      )
      // Listen for todo_categories changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todo_categories',
        },
        async (payload) => {
          switch (payload.eventType) {
            case 'INSERT': {
              const categoryId = payload.new.category_id;
              const todoId = payload.new.todo_id;
              
              console.log("Real-time update: adding category to todo", payload.new);

              // First check if we already have this category in any todo
              setTodos(current => {
                const category = current
                  .flatMap(t => t.categories)
                  .find(c => c.id === categoryId);

                if (category) {
                  return current.map(todo =>
                    todo.id === todoId ? {
                      ...todo,
                      categories: todo.categories.some(c => c.id === category.id)
                        ? todo.categories
                        : [...todo.categories, category]
                    } : todo
                  );
                }

                // If category not found, we'll fetch it separately
                return current;
              });

              // If we didn't find the category in existing todos, fetch it
              const existingCategory = todos
                .flatMap(t => t.categories)
                .find(c => c.id === categoryId);

              if (!existingCategory) {
                const { data: category, error } = await supabase
                  .from('categories')
                  .select('*')
                  .eq('id', categoryId)
                  .single();

                if (!error && category) {
                  setTodos(current =>
                    current.map(todo =>
                      todo.id === todoId ? {
                        ...todo,
                        categories: todo.categories.some(c => c.id === category.id)
                          ? todo.categories
                          : [...todo.categories, category]
                      } : todo
                    )
                  );
                }
              }
              break;
            }
            case 'DELETE': {
              const categoryId = payload.old.category_id;
              const todoId = payload.old.todo_id;
              
              console.log("Real-time update: deleting category from todo", payload.old);

              setTodos(current =>
                current.map(todo =>
                  todo.id === todoId ? {
                    ...todo,
                    categories: todo.categories.filter(c => c.id !== categoryId)
                  } : todo
                )
              );
              break;
            }
          }
        }
      )
      // Listen for category updates (e.g., renaming)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'categories',
        },
        (payload) => {
          const updatedCategory = payload.new as Category;
          
          console.log("Real-time update: updating category in todos", updatedCategory);

          setTodos(current =>
            current.map(todo => ({
              ...todo,
              categories: todo.categories.map(category =>
                category.id === updatedCategory.id
                  ? updatedCategory
                  : category
              )
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
      const { error } = await supabase
        .from('todos')
        .insert([{ title, user_id: user.id, is_complete: false }]);

      if (error) throw error;
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
  };
} 
import { Category } from '../models/category';
import { Todo } from '../models/todo';

export interface TodoContextValue {
  todos: Todo[];
  isLoading: boolean;
  error: Error | null;
  addTodo: (title: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  editTodo: (id: string, title: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  addTodoToCategory: (todoId: string, categoryId: string) => Promise<void>;
  removeTodoFromCategory: (todoId: string, categoryId: string) => Promise<void>;
  categoryFilter: string | null;
  setCategoryFilter: (categoryId: string | null) => void;
}

export interface CategoryContextValue {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  addCategory: (title: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  editCategory: (id: string, title: string) => Promise<void>;
}

export interface ContextRegistry {
  todos: TodoContextValue;
  categories: CategoryContextValue;
} 
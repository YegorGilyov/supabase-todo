import { BaseModel } from './base';
import { Category } from './category';

export interface Todo extends BaseModel {
  id: string;
  title: string;
  is_complete: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Final todo type with categories
export interface TodoWithCategories extends Todo {
  categories: Category[];
}

export type NewTodo = Omit<Todo, 'id' | 'created_at' | 'updated_at'>; 
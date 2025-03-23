export interface Todo {
  id: string;
  user_id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export type NewTodo = Pick<Todo, 'title'>; 
import { BaseModel } from './base';

export interface Todo extends BaseModel {
  title: string;
  is_complete: boolean;
}

export type NewTodo = Pick<Todo, 'title'>; 
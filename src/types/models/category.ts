export interface Category {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type NewCategory = Pick<Category, 'title'>; 
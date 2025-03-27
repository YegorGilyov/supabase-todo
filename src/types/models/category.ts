import { BaseModel } from './base';

export interface Category extends BaseModel {
  title: string;
}

export type NewCategory = Pick<Category, 'title'>; 
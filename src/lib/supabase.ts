import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  type: 'doce' | 'salgado';
  ingredients: string[];
  instructions: string[];
  prep_time: string;
  calories: number;
  servings: number;
  difficulty?: 'fácil' | 'médio' | 'difícil';
  tags?: string[];
  nutrition_info?: {
    protein?: string;
    carbs?: string;
    fiber?: string;
    fat?: string;
  };
  images?: string[];
  detected_ingredients?: string[];
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
}

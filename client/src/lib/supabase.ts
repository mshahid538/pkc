import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface File {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
}

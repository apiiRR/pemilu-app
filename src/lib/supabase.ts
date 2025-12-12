import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  order_number: number;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  has_voted: boolean;
  created_at: string;
}

export interface Vote {
  id: string;
  employee_id: string;
  candidate_id: string;
  selfie_url: string;
  voted_at: string;
}

export interface VoteResult {
  id: string;
  name: string;
  photo_url: string | null;
  description: string | null;
  order_number: number;
  vote_count: number;
  percentage: number;
}

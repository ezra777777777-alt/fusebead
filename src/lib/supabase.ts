import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Pattern = {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  grid_size: number;
  grid_data: string; // JSON string of string[][]
  color_counts: string; // JSON string of Record<string, number>
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url?: string;
  plan: "free" | "pro" | "team";
  created_at: string;
};

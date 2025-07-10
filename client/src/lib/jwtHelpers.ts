// src/lib/jwtHelpers.ts
import { supabase } from "@/lib/supabaseClient";

export async function getSupabaseAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

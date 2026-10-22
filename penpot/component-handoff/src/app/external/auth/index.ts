import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export const initSupabase = (url: string, key: string) => {
  if (!supabaseInstance) supabaseInstance = createClient(url, key)
  return supabaseInstance
}

export const getSupabase = () => {
  return supabaseInstance
}

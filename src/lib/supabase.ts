import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Génère un ID unique par navigateur (stocké dans localStorage)
export function getVisiteurId(): string {
  let id = localStorage.getItem('visiteur_id');
  if (!id) {
    id = 'visiteur_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('visiteur_id', id);
  }
  return id;
}

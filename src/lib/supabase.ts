/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isPlaceholderUrl = !rawUrl || rawUrl.includes('your-project-id') || rawUrl.includes('placeholder');
const isPlaceholderKey = !rawKey || rawKey.includes('your-anon-public-api-key') || rawKey.includes('placeholder');

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = !isPlaceholderUrl && !isPlaceholderKey && isValidHttpUrl(rawUrl);

export const supabase = isSupabaseConfigured 
  ? createClient(rawUrl, rawKey) 
  : null;

/**
 * Loads the entire shared application state from Supabase in a single fast query.
 * Falls back to local defaults if any key is missing.
 */
export async function loadAllStateFromSupabase(): Promise<Record<string, any>> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('sgo_store')
      .select('key, value');
    
    if (error) {
      console.warn("Erro ao carregar estado completo do Supabase:", error);
      return {};
    }
    
    const state: Record<string, any> = {};
    if (data && Array.isArray(data)) {
      data.forEach(row => {
        state[row.key] = row.value;
      });
    }
    return state;
  } catch (err) {
    console.warn("Falha de rede ao tentar carregar estado do Supabase:", err);
    return {};
  }
}

/**
 * Persists a key-value state pair in the Supabase database.
 */
export async function saveKeyToSupabase<T>(key: string, value: T): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('sgo_store')
      .upsert({ 
        key, 
        value, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'key' });
    
    if (error) {
      console.warn(`Erro ao salvar a chave "${key}" no Supabase:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Falha de rede ao tentar salvar a chave "${key}" no Supabase:`, err);
    return false;
  }
}

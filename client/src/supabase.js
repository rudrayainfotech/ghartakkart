import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dyylqpxhkenlnonujwwi.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eWxxcHhoa2VubG5vbnVqd3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2OTMyMjMsImV4cCI6MjEwOTI2OTIyM30.hpfPwdkmJrAkohymM6mJuMXHGG4hg3J-0q0SrzbSRkw';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

/**
 * Universal sync helper to Supabase store_kv table
 * Mirrors the exact JSON document behavior of Firebase RTDB
 */
export async function syncNodeToSupabase(key, data) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('store_kv')
      .upsert({
        key: String(key),
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.warn(`[Supabase Sync] Warning writing to ${key}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Supabase Sync] Error writing to ${key}:`, err);
    return false;
  }
}

/**
 * Universal fetch helper from Supabase store_kv table
 */
export async function fetchNodeFromSupabase(key) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('store_kv')
      .select('data')
      .eq('key', String(key))
      .maybeSingle();

    if (error || !data) return null;
    return data.data;
  } catch (err) {
    console.warn(`[Supabase Fetch] Error reading ${key}:`, err);
    return null;
  }
}

/**
 * Subscribe to realtime updates on store_kv for instant order & catalog updates
 */
export function subscribeStoreKv(onUpdate) {
  if (!supabase) return () => {};
  try {
    const channel = supabase
      .channel('public:store_kv')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_kv' },
        (payload) => {
          if (payload && payload.new && payload.new.key) {
            onUpdate(payload.new.key, payload.new.data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Subscribe error:', err);
    return () => {};
  }
}

export default supabase;

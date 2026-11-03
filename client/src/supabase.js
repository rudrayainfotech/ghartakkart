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

// Alias for seamless backward compatibility
export const syncToSupabase = syncNodeToSupabase;
export const syncToFirebase = syncNodeToSupabase;

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
 * Update a specific item inside an array/list node (e.g. an order in 'orders')
 */
export async function updateNodeItemInSupabase(nodeKey, itemId, patchData) {
  if (!supabase) return false;
  try {
    const existing = await fetchNodeFromSupabase(nodeKey);
    let updated;
    if (Array.isArray(existing)) {
      const idx = existing.findIndex(i => i && (i.id === itemId || i._id === itemId));
      if (idx !== -1) {
        updated = [...existing];
        updated[idx] = { ...updated[idx], ...patchData, updated_at: new Date().toISOString() };
      } else {
        updated = [{ id: itemId, ...patchData, updated_at: new Date().toISOString() }, ...existing];
      }
    } else if (existing && typeof existing === 'object') {
      updated = {
        ...existing,
        [itemId]: { ...(existing[itemId] || {}), ...patchData, updated_at: new Date().toISOString() }
      };
    } else {
      updated = [{ id: itemId, ...patchData, updated_at: new Date().toISOString() }];
    }

    return await syncNodeToSupabase(nodeKey, updated);
  } catch (err) {
    console.warn(`[Supabase Item Update] Error for ${nodeKey}/${itemId}:`, err);
    return false;
  }
}

/**
 * Sync Live Delivery Partner GPS Coordinates
 */
export async function syncPartnerLocationToSupabase(partnerId, coords) {
  if (!supabase) return false;
  try {
    const payload = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy,
      updated_at: new Date().toISOString()
    };
    return await syncNodeToSupabase(`delivery_partner_${partnerId}_location`, payload);
  } catch {
    return false;
  }
}

/**
 * Broadcast SOS Alert to Supabase
 */
export async function broadcastSosAlertToSupabase(partner, location) {
  if (!supabase) return null;
  try {
    const alertId = `SOS-${Date.now()}`;
    const payload = {
      id: alertId,
      partner_id: partner.id,
      partner_name: partner.name,
      partner_phone: partner.phone,
      vehicle: partner.vehicle,
      location: location || { lat: 27.941887, lng: 77.843715 },
      status: 'ACTIVE_EMERGENCY',
      timestamp: new Date().toISOString()
    };
    await syncNodeToSupabase(`sos_alert_${alertId}`, payload);
    return alertId;
  } catch (err) {
    console.warn('[Supabase SOS] warning:', err);
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

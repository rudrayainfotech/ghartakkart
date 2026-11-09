import { createClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : {};
const procEnv = (typeof process !== 'undefined' && process && process.env) ? process.env : {};

export const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || 'https://dyylqpxhkenlnonujwwi.supabase.co';
export const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eWxxcHhoa2VubG5vbnVqd3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2OTMyMjMsImV4cCI6MjEwOTI2OTIyM30.hpfPwdkmJrAkohymM6mJuMXHGG4hg3J-0q0SrzbSRkw';

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
export async function directRestUpsert(key, data) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_kv?on_conflict=key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: String(key),
        data: data,
        updated_at: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (err) {
    console.warn(`[Supabase REST Fallback] Write error on ${key}:`, err);
    return false;
  }
}

export async function directRestFetch(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/store_kv?key=eq.${encodeURIComponent(key)}&select=data`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.[0]?.data ?? null;
  } catch (err) {
    console.warn(`[Supabase REST Fallback] Read error on ${key}:`, err);
    return null;
  }
}

export async function syncNodeToSupabase(key, data) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    if (supabase) {
      const { error } = await supabase
        .from('store_kv')
        .upsert({
          key: String(key),
          data: data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (!error) return true;
      console.warn(`[Supabase Sync] Warning writing to ${key}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase Sync] Error writing to ${key}:`, err);
  }
  // Robust HTTP fallback
  return await directRestUpsert(key, data);
}

// Alias for seamless backward compatibility
export const syncToSupabase = syncNodeToSupabase;
export const syncToFirebase = syncNodeToSupabase;

/**
 * Universal fetch helper from Supabase store_kv table
 */
export async function fetchNodeFromSupabase(key) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('store_kv')
        .select('data')
        .eq('key', String(key))
        .maybeSingle();

      if (!error && data) return data.data;
    }
  } catch (err) {
    console.warn(`[Supabase Fetch] Error reading ${key}:`, err);
  }
  // Robust HTTP fallback
  return await directRestFetch(key);
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

let sharedRealtimeChannel = null;

export function getSharedRealtimeChannel() {
  if (!supabase) return null;
  if (!sharedRealtimeChannel) {
    sharedRealtimeChannel = supabase.channel('ghartakkart_live', {
      config: {
        broadcast: { self: false }
      }
    });
  }
  return sharedRealtimeChannel;
}

/**
 * Ultra-fast Realtime WebSocket Broadcast (< 30ms latency)
 * Delivers order notifications directly to Admin without waiting for database writes!
 */
export async function broadcastStoreEvent(event, payload) {
  if (!supabase) return;
  try {
    const ch = getSharedRealtimeChannel();
    if (ch) {
      if (ch.state !== 'joined') {
        ch.subscribe();
      }
      ch.send({
        type: 'broadcast',
        event: event,
        payload: payload
      });
    }
  } catch (err) {
    console.warn('[Supabase Broadcast] error:', err);
  }
}

/**
 * Subscribe to realtime updates on store_kv for instant order & catalog updates
 * Combines Postgres CDC with ultra-fast WebSocket broadcasts
 */
export function subscribeStoreKv(onUpdate, onBroadcast) {
  if (!supabase) return () => {};
  try {
    const channel = getSharedRealtimeChannel();
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_kv' },
        (payload) => {
          if (payload && payload.new && payload.new.key) {
            onUpdate(payload.new.key, payload.new.data);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'NEW_ORDER' },
        (msg) => {
          if (msg && msg.payload) {
            if (typeof onBroadcast === 'function') onBroadcast('NEW_ORDER', msg.payload);
            if (typeof onUpdate === 'function') onUpdate('orders_inbox', [msg.payload]);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'ORDER_STATUS_CHANGED' },
        (msg) => {
          if (msg && msg.payload) {
            if (typeof onBroadcast === 'function') onBroadcast('ORDER_STATUS_CHANGED', msg.payload);
            if (typeof onUpdate === 'function') onUpdate('orders_inbox', [msg.payload]);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected to live channel');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Supabase Realtime] Channel status warning:', status);
        }
      });

    return () => {
      // Keep channel subscribed across components for uninterrupted alerts
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Subscribe error:', err);
    return () => {};
  }
}

export default supabase;

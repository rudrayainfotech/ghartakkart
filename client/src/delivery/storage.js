import { syncPartnerLocationToSupabase, broadcastSosAlertToSupabase, syncNodeToSupabase } from '../supabase.js';

const OFFLINE_QUEUE_KEY = 'gk_rider_offline_queue';
const PARTNER_STORAGE_KEY = 'gk_delivery_partner';
const CASH_LEDGER_KEY = 'gk_rider_cash_ledger';

export function getStoredPartner() {
  try {
    const raw = localStorage.getItem(PARTNER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    id: 'rider-krishna-01',
    name: 'Krishna Kumar',
    phone: '6398317028',
    vehicle: 'EV Scooty (UP-81-AZ-4412)',
    vehicle_type: '2 Wheeler (EV)',
    kyc_status: 'verified', // 'pending' | 'under_review' | 'verified'
    is_online: true,
    cash_in_hand: 0,
    cash_limit: 2500,
    rating: 4.9,
    acceptance_rate: 96,
    on_time_rate: 94,
    total_delivered: 142,
    bank_details: {
      account_number: '•••• •••• 5612',
      ifsc: 'SBIN0001234',
      bank_name: 'State Bank of India (Khair Branch)',
      upi_id: '6398317028@paytm',
      penny_drop_verified: true
    },
    today_stats: {
      earnings: 480,
      base_pay: 270,
      distance_pay: 110,
      waiting_pay: 25,
      surge_pay: 45,
      tips: 30,
      orders_count: 6,
      duty_hours: '4h 15m'
    }
  };
}

export function saveStoredPartner(partner) {
  try {
    localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(partner));
  } catch {}
}

export function getStoredCashLedger() {
  try {
    const raw = localStorage.getItem(CASH_LEDGER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'tx-101',
      type: 'collection',
      order_id: 'GK-7942',
      amount: 253,
      payment_mode: 'Cash',
      time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      balance_after: 253
    }
  ];
}

export function saveStoredCashLedger(ledger) {
  try {
    localStorage.setItem(CASH_LEDGER_KEY, JSON.stringify(ledger));
  } catch {}
}

// Queue offline updates
export function queueOfflineAction(action) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ ...action, queued_at: new Date().toISOString() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('Action queued offline:', action);
  } catch (e) {
    console.error('Failed to queue offline action:', e);
  }
}

// Flush and sync queued actions to Firebase RTDB
export async function flushOfflineQueue(syncOrderCallback) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    console.log(`Flushing ${queue.length} offline actions...`);
    const remaining = [];

    for (const item of queue) {
      try {
        if (item.type === 'ORDER_STATUS_UPDATE' && syncOrderCallback) {
          await syncOrderCallback(item.orderId, item.status, item.extraData);
        } else if (item.type === 'SYNC_PARTNER') {
          await syncNodeToSupabase(`delivery_partner_${item.partnerId}`, item.data);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Error flushing offline queue:', e);
  }
}

// Send Live Partner GPS Coordinates to Supabase
export async function syncPartnerLocationToFirebase(partnerId, coords) {
  return await syncPartnerLocationToSupabase(partnerId, coords);
}

// Send SOS Alert to Supabase
export async function broadcastSosAlert(partner, location) {
  return await broadcastSosAlertToSupabase(partner, location);
}

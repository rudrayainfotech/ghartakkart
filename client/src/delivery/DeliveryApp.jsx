import React, { useState, useEffect, useRef } from 'react';
import { 
  Bike, Power, Bell, ShieldAlert, IndianRupee, MapPin, 
  Clock, Package, CheckCircle2, AlertTriangle, Coffee, 
  TrendingUp, Award, Calendar, HelpCircle, User, Sparkles, 
  RefreshCw, Wifi, WifiOff, Globe, Plus, XCircle, Upload, UserCheck, LogOut 
} from 'lucide-react';

import { translations } from './translations.js';
import { 
  getStoredPartner, saveStoredPartner, getStoredCashLedger, 
  saveStoredCashLedger, queueOfflineAction, flushOfflineQueue, 
  syncPartnerLocationToFirebase 
} from './storage.js';
import { fetchNodeFromSupabase, updateNodeItemInSupabase } from '../supabase.js';
import { playAcceptChime, playDeliveredChime } from './audio.js';

import { OrderAcceptModal } from './components/OrderAcceptModal.jsx';
import { ActiveOrderView } from './components/ActiveOrderView.jsx';
import { CashLedgerModal } from './components/CashLedgerModal.jsx';
import { EarningsView } from './components/EarningsView.jsx';
import { ShiftsAndHeatmapModal } from './components/ShiftsAndHeatmapModal.jsx';
import { SosEmergencyModal } from './components/SosEmergencyModal.jsx';
import { SupportModal } from './components/SupportModal.jsx';
import { ProfileModal } from './components/ProfileModal.jsx';
import { PartnerOnboardingModal } from './components/PartnerOnboardingModal.jsx';
import { ReuploadDocumentsModal } from './components/ReuploadDocumentsModal.jsx';
import { RiderLoginModal } from './components/RiderLoginModal.jsx';

export default function DeliveryApp() {
  // Language state (en / hi)
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('gk_rider_lang') || 'en';
  });

  const t = translations[lang] || translations.en;

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    try { localStorage.setItem('gk_rider_lang', nextLang); } catch {}
  };

  // Partner State (Declared before any useEffect hooks)
  const [partner, setPartner] = useState(() => getStoredPartner());
  const [isOnline, setIsOnline] = useState(() => {
    const p = getStoredPartner();
    return p.kyc_status === 'verified' ? (p.is_online ?? false) : false;
  });
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimer, setBreakTimer] = useState(0);

  // Active Tab: 'orders' | 'earnings' | 'shifts' | 'help' | 'profile'
  const [activeTab, setActiveTab] = useState('orders');

  // Orders and Staff State
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_orders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [staff, setStaff] = useState([]);

  // Cash Ledger State
  const [cashLedger, setCashLedger] = useState(() => getStoredCashLedger());

  // Modals state
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isShiftsModalOpen, setIsShiftsModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Offline network status
  const [isNetworkOnline, setIsNetworkOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Fetch live orders & staff from Supabase in real-time
  useEffect(() => {
    const fetchRemoteData = async () => {
      try {
        const [ordersData, staffData] = await Promise.all([
          fetchNodeFromSupabase('orders'),
          fetchNodeFromSupabase('staff')
        ]);

        if (ordersData) {
          const list = Array.isArray(ordersData) ? ordersData : Object.values(ordersData || {});
          if (list.length > 0) {
            setOrders(list);
            try { localStorage.setItem('gk_orders', JSON.stringify(list)); } catch {}
          }
        }

        if (staffData) {
          const sList = Array.isArray(staffData) ? staffData : Object.values(staffData || {});
          setStaff(sList);
        }
      } catch (err) {}
    };

    fetchRemoteData();
    const interval = setInterval(fetchRemoteData, 5000);
    return () => clearInterval(interval);
  }, [partner.phone, partner.id]);

  // Keep partner in sync with staff list if available
  useEffect(() => {
    if (Array.isArray(staff) && staff.length > 0) {
      const matched = staff.find(s => s.phone === partner.phone || s.id === partner.id);
      if (matched) {
        setPartner(prev => {
          const updated = {
            ...prev,
            id: matched.id,
            name: matched.name,
            vehicle: matched.vehicle || prev.vehicle,
            kyc_status: matched.kyc_status || prev.kyc_status,
            active: matched.active !== undefined ? matched.active : prev.active,
            shift: matched.shift || prev.shift,
            active_shift: matched.active_shift || prev.active_shift
          };
          saveStoredPartner(updated);
          return updated;
        });
      }
    }
  }, [staff]);

  // Online / Offline window listeners & queue flusher
  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      flushOfflineQueue((orderId, status, extra) => handleUpdateOrderStatus(orderId, status, extra));
    };
    const handleOffline = () => setIsNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic GPS location beacon to Firebase RTDB
  useEffect(() => {
    if (!isOnline || !navigator.geolocation) return;

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          syncPartnerLocationToFirebase(partner.id, pos.coords);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, partner.id]);

  // Break mode countdown
  useEffect(() => {
    let timer;
    if (isOnBreak && breakTimer > 0) {
      timer = setInterval(() => {
        setBreakTimer(prev => {
          if (prev <= 1) {
            setIsOnBreak(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOnBreak, breakTimer]);

  // Immediate cross-tab storage sync for local testing
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'gk_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Watch for assigned orders and REASSIGNMENT removals in real-time from Firebase RTDB & local store
  // If order was reassigned to another rider or cancelled/completed, immediately REMOVE from this screen!
  useEffect(() => {
    // 1. If KYC is no longer verified, clear any orders immediately
    if (partner.kyc_status !== 'verified') {
      if (activeOrder) setActiveOrder(null);
      if (incomingOrder) setIncomingOrder(null);
      return;
    }

    // 2. Actively validate and track CURRENT active order
    if (activeOrder) {
      const currentInStore = (orders || []).find(o => String(o.id) === String(activeOrder.id));
      const isAssignedToMe = currentInStore && 
        (String(currentInStore.assigned_staff_id) === String(partner.id) ||
         String(currentInStore.assigned_partner_id) === String(partner.id) ||
         String(currentInStore.delivery_boy_id) === String(partner.id)) &&
        !['Delivered', 'Cancelled', 'Rejected'].includes(currentInStore.order_status);

      if (!isAssignedToMe) {
        // Order reassigned away or completed/cancelled - REMOVE FROM FIRST DELIVERY BOY IMMEDIATELY!
        console.warn(`[DeliveryApp] Order #${activeOrder.id} is no longer assigned to partner ${partner.id}. Removing from activeOrder!`);
        setActiveOrder(null);
      } else if (
        currentInStore.order_status !== activeOrder.order_status ||
        JSON.stringify(currentInStore.timeline) !== JSON.stringify(activeOrder.timeline)
      ) {
        setActiveOrder(currentInStore);
      }
    }

    // 3. Actively validate and track CURRENT incoming order
    if (incomingOrder) {
      const incomingInStore = (orders || []).find(o => String(o.id) === String(incomingOrder.id));
      const isStillIncomingForMe = incomingInStore &&
        (String(incomingInStore.assigned_staff_id) === String(partner.id) ||
         String(incomingInStore.assigned_partner_id) === String(partner.id) ||
         String(incomingInStore.delivery_boy_id) === String(partner.id)) &&
        incomingInStore.order_status === 'Placed';

      if (!isStillIncomingForMe) {
        console.warn(`[DeliveryApp] Incoming order #${incomingOrder.id} is no longer valid for partner ${partner.id}. Removing!`);
        setIncomingOrder(null);
      }
    }

    // If offline or on break, do not pick up new orders
    if (!isOnline || isOnBreak) return;

    // 4. If free, check if there is an order currently assigned to this partner that needs attention
    if (!activeOrder && !incomingOrder) {
      const assigned = (orders || []).find(o => 
        (String(o.assigned_staff_id) === String(partner.id) || 
         String(o.assigned_partner_id) === String(partner.id) ||
         String(o.delivery_boy_id) === String(partner.id)) && 
        !['Delivered', 'Cancelled', 'Rejected'].includes(o.order_status)
      );

      if (assigned) {
        if (['Out for Delivery', 'Ready', 'Accepted', 'Processing'].includes(assigned.order_status)) {
          setActiveOrder(assigned);
        } else if (assigned.order_status === 'Placed') {
          setIncomingOrder(assigned);
        }
      }
    }
  }, [orders, isOnline, isOnBreak, activeOrder, incomingOrder, partner.id, partner.kyc_status]);

  // Strict Online/Offline Toggle with KYC Authority Validation
  const handleToggleOnline = () => {
    // 1. If KYC is rejected, prevent going online and open re-upload modal
    if (partner.kyc_status === 'rejected') {
      alert(
        lang === 'hi'
          ? `❌ आपकी प्रोफ़ाइल एडमिन द्वारा अस्वीकृत कर दी गई है!\nकारण: "${partner.kyc_reject_reason || 'दस्तावेज़ स्पष्ट नहीं हैं'}"\n\nजब तक आपके दस्तावेज़ दोबारा सत्यापित नहीं होते, आप ऑनलाइन नहीं जा सकते और कोई ऑर्डर नहीं ले सकते।\n\nकृपया दस्तावेज़ पुनः अपलोड करें।`
          : `❌ Your KYC was REJECTED by Admin!\nReason: "${partner.kyc_reject_reason || 'Documents unclear'}"\n\nYou cannot go online or accept any orders.\nPlease re-upload clear documents for verification.`
      );
      setIsReuploadModalOpen(true);
      return;
    }

    // 2. If KYC is under review or pending
    if (partner.kyc_status === 'under_review' || partner.kyc_status === 'pending') {
      alert(
        lang === 'hi'
          ? '⏳ आपकी प्रोफ़ाइल अभी एडमिन जांच (Under Review) में है। एडमिन द्वारा स्वीकृति मिलने के बाद ही आप ऑनलाइन जा सकेंगे।'
          : '⏳ Your profile is currently under admin review. You can go online once Admin approves your KYC.'
      );
      return;
    }

    // 3. If deactivated by store
    if (partner.active === false) {
      alert(
        lang === 'hi'
          ? '🚫 आपका अकाउंट निष्क्रिय है। कृपया स्टोर मैनेजर से संपर्क करें।'
          : '🚫 Your account is currently inactive. Please contact store management.'
      );
      return;
    }

    // 4. Authorized verified rider toggles online
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (!nextState) {
      setIsOnBreak(false);
    }
    const updated = { ...partner, is_online: nextState };
    setPartner(updated);
    saveStoredPartner(updated);
  };

  // Rider Logout Handler
  const handleLogoutPartner = () => {
    if (window.confirm(lang === 'hi' ? 'क्या आप इस राइडर अकाउंट से लॉगआउट करना चाहते हैं?' : 'Are you sure you want to log out / switch rider account?')) {
      setIsOnline(false);
      setIsLoginModalOpen(true);
    }
  };

  // Toggle Break
  const handleToggleBreak = (active, mins) => {
    setIsOnBreak(active);
    setBreakTimer(mins * 60);
  };

  // Order Acceptance Handlers
  const handleAcceptOrder = (order) => {
    setIncomingOrder(null);
    setActiveOrder(order);
    handleUpdateOrderStatus(order.id, 'Accepted', {
      note: `Order accepted by partner ${partner.name}`
    });
  };

  const handleRejectOrder = (orderId, reason) => {
    setIncomingOrder(null);
    console.log(`Order #${orderId} rejected by partner:`, reason);
  };

  // Order Status Update (Syncs with Firebase RTDB + Local Storage)
  const handleUpdateOrderStatus = async (orderId, newStatus, extraData = {}) => {
    const nowIso = new Date().toISOString();

    const updatedOrders = (orders || []).map(o => {
      if (o.id === orderId) {
        const timeline = Array.isArray(o.timeline) ? [...o.timeline] : [];
        timeline.push({
          status: newStatus,
          time: nowIso,
          note: extraData.note || `Order status updated to ${newStatus} by partner`
        });
        return {
          ...o,
          order_status: newStatus,
          updated_at: nowIso,
          timeline
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedOrders)); } catch {}

    const targetOrder = updatedOrders.find(o => o.id === orderId);
    if (targetOrder) {
      setActiveOrder(targetOrder);
    }

    // Direct Remote Supabase sync
    if (navigator.onLine) {
      try {
        await updateNodeItemInSupabase('orders', orderId, {
          order_status: newStatus,
          updated_at: nowIso,
          assigned_staff_id: partner.id,
          timeline: targetOrder?.timeline || []
        });
      } catch (err) {
        queueOfflineAction({
          type: 'ORDER_STATUS_UPDATE',
          orderId,
          status: newStatus,
          extraData
        });
      }
    } else {
      queueOfflineAction({
        type: 'ORDER_STATUS_UPDATE',
        orderId,
        status: newStatus,
        extraData
      });
    }
  };

  // Order Delivery Completion
  const handleCompleteDelivery = async (orderId, completionData) => {
    const isCod = completionData.cod_collected > 0;
    const nowIso = new Date().toISOString();

    // 1. Update Partner Earnings & Stats
    const payoutEarned = Math.round(30 + (Number(activeOrder?.distance_km || 1.8) * 10) + 15);
    const updatedStats = {
      ...partner.today_stats,
      earnings: (partner.today_stats?.earnings || 0) + payoutEarned,
      orders_count: (partner.today_stats?.orders_count || 0) + 1
    };

    // 2. Update Cash in Hand if COD
    const newCashInHand = isCod 
      ? (partner.cash_in_hand || 0) + Number(completionData.cod_collected) 
      : (partner.cash_in_hand || 0);

    const updatedPartner = {
      ...partner,
      cash_in_hand: newCashInHand,
      today_stats: updatedStats,
      total_delivered: (partner.total_delivered || 0) + 1
    };

    setPartner(updatedPartner);
    saveStoredPartner(updatedPartner);

    // 3. Add to Cash Ledger if COD
    if (isCod) {
      const newLedgerEntry = {
        id: `tx-${Date.now()}`,
        type: 'collection',
        order_id: orderId,
        amount: Number(completionData.cod_collected),
        payment_mode: completionData.payment_mode || 'Cash',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        balance_after: newCashInHand
      };
      const updatedLedger = [newLedgerEntry, ...cashLedger];
      setCashLedger(updatedLedger);
      saveStoredCashLedger(updatedLedger);
    }

    // 4. Update Order Status in RTDB
    await handleUpdateOrderStatus(orderId, 'Delivered', {
      note: `Delivered by partner ${partner.name}. ${isCod ? `COD Collected: ₹${completionData.cod_collected}` : 'Prepaid verified.'}`
    });

    setActiveOrder(null);
  };

  // Return to Store / Failed Delivery
  const handleReturnToStore = async (orderId, reason) => {
    await handleUpdateOrderStatus(orderId, 'Cancelled', {
      note: `Delivery failed: ${reason}. Returning package to store.`
    });
    setActiveOrder(null);
  };

  // Deposit Cash handler
  const handleDepositCash = (amount, method) => {
    const newBal = Math.max(0, (partner.cash_in_hand || 0) - amount);
    const updatedPartner = { ...partner, cash_in_hand: newBal };
    setPartner(updatedPartner);
    saveStoredPartner(updatedPartner);

    const depositEntry = {
      id: `dep-${Date.now()}`,
      type: 'deposit',
      order_id: method === 'upi' ? 'UPI-TRANSFER' : 'STORE-HUB-CASH',
      amount,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      balance_after: newBal
    };
    const updatedLedger = [depositEntry, ...cashLedger];
    setCashLedger(updatedLedger);
    saveStoredCashLedger(updatedLedger);
  };

  // Simulation Tool: Generate Test Order
  const handleSimulateNewOrder = () => {
    const demoOrder = {
      id: `GK-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: 'Rahul Sharma (Khair Somna Rd)',
      customer_phone: '9536432003',
      delivery_otp: '7842',
      delivery_slot: 'ASAP (10-20 mins)',
      distance_km: 1.5,
      total: 349,
      payment_method: 'Cash on Delivery',
      payment_status: 'Pending (COD)',
      order_status: 'Placed',
      address: {
        line1: 'Near Chhota Chauraha, Somna Road, Khair, UP',
        landmark: 'Opposite State Bank ATM',
        lat: 27.94203,
        lng: 77.84431
      },
      items: [
        { name: 'Fresh Potatoes', qty: 2, unit: '1 kg', price: 32 },
        { name: 'Amul Taaza Milk 500ml', qty: 2, unit: 'Pouch', price: 54 },
        { name: 'Fortune Mustard Oil 1L', qty: 1, unit: 'Bottle', price: 165 },
        { name: 'Aashirvaad Atta 5kg', qty: 1, unit: 'Bag', price: 215 }
      ]
    };
    setIncomingOrder(demoOrder);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none max-w-md mx-auto shadow-2xl relative border-x border-slate-900">
      
      {/* Top Mobile Status Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3.5 flex items-center justify-between">
        
        {/* App Branding & Language */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-white tracking-tight leading-none">
                GhartakKart
              </h1>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                Partner
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Khair Zone</span>
              {!isNetworkOnline && (
                <span className="text-[9px] text-rose-400 font-bold bg-rose-500/20 px-1 rounded flex items-center gap-0.5">
                  <WifiOff className="w-2.5 h-2.5" /> Offline
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Header Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Switch Rider Account / Login Button */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
            title="Switch Rider Account / Login"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] hidden sm:inline">Login</span>
          </button>

          {/* Rider Logout Button */}
          <button
            onClick={handleLogoutPartner}
            className="p-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-rose-800/60 cursor-pointer"
            title="Log Out / Exit Rider Account"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] hidden sm:inline">Logout</span>
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1 border border-slate-700 cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* 1-Tap SOS Emergency Button */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-900/40 cursor-pointer animate-pulse"
            title="SOS Emergency Panic"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Online/Offline Toggle Switch with Authority Lock */}
          <button
            onClick={handleToggleOnline}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              partner.kyc_status === 'rejected'
                ? 'bg-rose-950/80 text-rose-400 border border-rose-500/50 hover:bg-rose-900'
                : isOnline 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              {partner.kyc_status === 'rejected' 
                ? 'Rejected ✕' 
                : partner.kyc_status === 'under_review' 
                  ? 'In Review...' 
                  : isOnline ? t.online : t.offline}
            </span>
          </button>
        </div>

      </header>

      {/* Online Status Banner & Break Mode Notice */}
      {isOnBreak && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 p-2.5 px-4 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>{t.onBreak}: <strong>{Math.floor(breakTimer / 60)}:{(breakTimer % 60).toString().padStart(2, '0')}</strong></span>
          </div>
          <button onClick={() => setIsOnBreak(false)} className="text-[11px] font-bold underline">
            {t.resumeDuty}
          </button>
        </div>
      )}

      {/* Running Cash Bar & Shift Quick Bar */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs px-4">
        <button
          onClick={() => setIsCashModalOpen(true)}
          className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-slate-400">{t.cashInHand}:</span>
          <span className="font-bold text-amber-400">₹{partner.cash_in_hand || 0}</span>
          <span className="text-[10px] text-slate-500 underline ml-0.5">{t.depositCash}</span>
        </button>

        <button
          onClick={() => setIsShiftsModalOpen(true)}
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Evening Peak (1.5x)</span>
        </button>
      </div>

      {/* Main App Body */}
      <main className="flex-1 p-4 overflow-y-auto">

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            
            {/* If there is an active order in delivery flow */}
            {activeOrder ? (
              <ActiveOrderView
                order={activeOrder}
                onUpdateStatus={handleUpdateOrderStatus}
                onCompleteDelivery={handleCompleteDelivery}
                onReturnToStore={handleReturnToStore}
                lang={lang}
              />
            ) : partner.kyc_status === 'rejected' ? (
              /* REJECTED PROFILE VIEW - CANNOT TAKE ANY ORDERS */
              <div className="bg-rose-950/40 border-2 border-rose-500/80 rounded-3xl p-5 text-center space-y-4 shadow-2xl animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/40">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/40">
                    KYC PROFILE REJECTED
                  </span>
                  <h3 className="text-base font-black text-white mt-2">
                    {lang === 'hi' ? 'आपकी प्रोफ़ाइल अस्वीकृत है' : 'Delivery Profile Rejected'}
                  </h3>
                  <p className="text-xs text-rose-200 mt-1">
                    {partner.kyc_reject_reason 
                      ? `Admin note: "${partner.kyc_reject_reason}"` 
                      : (lang === 'hi' ? 'आपके दस्तावेज़ सत्यापन में सफल नहीं हुए।' : 'Your documents did not meet verification criteria.')}
                  </p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-rose-500/30 text-xs text-slate-300 text-left space-y-1">
                  <span className="font-bold text-rose-300 block">
                    {lang === 'hi' ? 'लागू प्रतिबंध (Authority Blocked):' : 'Authority Blocked:'}
                  </span>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                    <li>{lang === 'hi' ? 'आप ड्यूटी पर ऑनलाइन नहीं जा सकते' : 'You cannot go online'}</li>
                    <li>{lang === 'hi' ? 'आपको कोई भी डिलीवरी ऑर्डर नहीं मिलेगा' : 'You cannot take or receive any orders'}</li>
                    <li>{lang === 'hi' ? 'साफ़ दस्तावेज़ दोबारा अपलोड करें' : 'Please re-upload clear photos to regain approval'}</li>
                  </ul>
                </div>

                <button
                  onClick={() => setIsReuploadModalOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-rose-950/60 cursor-pointer active:scale-98 transition uppercase tracking-wider"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'hi' ? 'दस्तावेज़ दोबारा अपलोड करें (Re-upload Documents)' : 'RE-UPLOAD DOCUMENTS AGAIN'}</span>
                </button>
              </div>
            ) : partner.kyc_status === 'under_review' ? (
              /* UNDER REVIEW VIEW */
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 text-center space-y-4 shadow-xl animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                    UNDER ADMIN REVIEW
                  </span>
                  <h3 className="text-base font-black text-white mt-2">
                    {lang === 'hi' ? 'दस्तावेज़ सत्यापन जारी है' : 'Verification In Progress'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    {lang === 'hi' 
                      ? 'आपके पुनः अपलोड किए गए दस्तावेज़ एडमिन को भेज दिए गए हैं। एडमिन द्वारा स्वीकृति (Approve) मिलते ही आपका खाता सक्रिय हो जाएगा।' 
                      : 'Your re-submitted documents are pending admin approval. You will be able to go online once approved.'}
                  </p>
                </div>
              </div>
            ) : (
              /* Idle Waiting for Orders View */
              <div className="space-y-4 pt-4 text-center">
                
                {/* Visual Radar / Ping Animation */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <div className={`absolute inset-0 rounded-full ${
                    isOnline ? 'bg-emerald-500/10 animate-ping' : 'bg-slate-800'
                  }`} />
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-2xl transition ${
                    isOnline 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-8 ring-emerald-500/10' 
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    <Bike className="w-10 h-10" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black text-white">
                    {isOnline 
                      ? (lang === 'hi' ? 'आप ऑनलाइन हैं!' : "You're Online & Ready!") 
                      : (lang === 'hi' ? 'आप अभी ऑफलाइन हैं' : 'You are currently Offline')}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {isOnline 
                      ? t.noActiveOrders 
                      : (lang === 'hi' ? 'ऑर्डर प्राप्त करने और कमाई शुरू करने के लिए ऑनलाइन जाएं।' : 'Switch toggle above to go online and receive delivery assignments.')}
                  </p>
                </div>

                {/* Today's Quick Earnings Widget */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm mx-auto flex items-center justify-between text-left">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {t.earningsToday}
                    </span>
                    <span className="text-xl font-black text-emerald-400">
                      ₹{partner.today_stats?.earnings || 0}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      {t.ordersCompleted}
                    </span>
                    <span className="text-base font-black text-white">
                      {partner.today_stats?.orders_count || 0} orders
                    </span>
                  </div>
                </div>

                {/* Quick Simulation / Test Order Action */}
                <div className="pt-2">
                  <button
                    onClick={handleSimulateNewOrder}
                    className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'hi' ? 'टेस्ट ऑर्डर सिमुलेट करें (डेमो)' : 'Simulate Demo Order Alert'}</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: EARNINGS */}
        {activeTab === 'earnings' && (
          <EarningsView 
            partner={partner} 
            completedOrders={[]} 
            lang={lang} 
          />
        )}

        {/* TAB 3: SHIFTS */}
        {activeTab === 'shifts' && (
          <div className="pt-2">
            <ShiftsAndHeatmapModal 
              isOpen={true} 
              onClose={() => setActiveTab('orders')} 
              partner={partner} 
              onToggleBreak={handleToggleBreak}
              lang={lang} 
            />
          </div>
        )}

        {/* TAB 4: SUPPORT */}
        {activeTab === 'help' && (
          <div className="pt-2">
            <SupportModal 
              isOpen={true} 
              onClose={() => setActiveTab('orders')} 
              lang={lang} 
            />
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="pt-2">
            <ProfileModal 
              isOpen={true} 
              onClose={() => setActiveTab('orders')} 
              partner={partner} 
              onEditKyc={() => setIsOnboardingModalOpen(true)}
              lang={lang} 
            />
          </div>
        )}

      </main>

      {/* Persistent Bottom Tab Navigation Bar */}
      <nav className="sticky bottom-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around text-[10px] font-bold">
        {[
          { id: 'orders', label: lang === 'hi' ? 'ऑर्डर' : 'Orders', icon: Bike },
          { id: 'earnings', label: lang === 'hi' ? 'कमाई' : 'Earnings', icon: IndianRupee },
          { id: 'shifts', label: lang === 'hi' ? 'शिफ्ट' : 'Shifts', icon: Flame },
          { id: 'help', label: lang === 'hi' ? 'सहायता' : 'Help', icon: HelpCircle },
          { id: 'profile', label: lang === 'hi' ? 'प्रोफ़ाइल' : 'Profile', icon: User }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1.5 flex flex-col items-center gap-1 transition-all rounded-xl ${
                isActive 
                  ? 'text-emerald-400 font-black' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MODALS */}
      {/* 30s Countdown Order Alert Modal */}
      {incomingOrder && (
        <OrderAcceptModal
          order={incomingOrder}
          onAccept={handleAcceptOrder}
          onReject={handleRejectOrder}
          lang={lang}
        />
      )}

      {/* Cash-in-Hand Ledger Modal */}
      <CashLedgerModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        partner={partner}
        ledger={cashLedger}
        onDepositCash={handleDepositCash}
        lang={lang}
      />

      {/* Shifts & Heatmap Modal */}
      <ShiftsAndHeatmapModal
        isOpen={isShiftsModalOpen}
        onClose={() => setIsShiftsModalOpen(false)}
        partner={partner}
        onToggleBreak={handleToggleBreak}
        lang={lang}
      />

      {/* SOS Emergency Panic Modal */}
      <SosEmergencyModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        partner={partner}
        lang={lang}
      />

      {/* Support & FAQs Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        lang={lang}
      />

      {/* Profile & Scorecard Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        partner={partner}
        onEditKyc={() => setIsOnboardingModalOpen(true)}
        onLogout={handleLogoutPartner}
        lang={lang}
      />

      {/* Onboarding & KYC Modal */}
      <PartnerOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        partner={partner}
        onSave={(updated) => {
          setPartner(updated);
          saveStoredPartner(updated);
        }}
        lang={lang}
      />

      {/* Re-upload KYC Documents Modal */}
      <ReuploadDocumentsModal
        isOpen={isReuploadModalOpen}
        onClose={() => setIsReuploadModalOpen(false)}
        partner={partner}
        onDocumentsResubmitted={(updated) => {
          setPartner(updated);
          saveStoredPartner(updated);
        }}
        lang={lang}
      />

      {/* Switch Rider Account / Login Modal */}
      <RiderLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentPartner={partner}
        onLoginSuccess={(newPartner) => {
          setPartner(newPartner);
          saveStoredPartner(newPartner);
          setIsOnline(newPartner.kyc_status === 'verified');
        }}
        lang={lang}
      />

    </div>
  );
}

function Flame(props) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

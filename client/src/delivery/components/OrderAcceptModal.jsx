import React, { useState, useEffect } from 'react';
import { 
  Bell, MapPin, Navigation, IndianRupee, Clock, Package, 
  AlertTriangle, Check, X, ShieldAlert, Sparkles 
} from 'lucide-react';
import { playOrderAlert, stopOrderAlert, playAcceptChime } from '../audio.js';

export function OrderAcceptModal({ order, onAccept, onReject, lang = 'en' }) {
  if (!order) return null;

  const [timeLeft, setTimeLeft] = useState(30);
  const [showRejectReasons, setShowRejectReasons] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  // Start sound alarm and 30-second countdown on mount
  useEffect(() => {
    playOrderAlert();
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          stopOrderAlert();
          onReject(order.id, 'Timeout (30s elapsed)');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      stopOrderAlert();
    };
  }, [order.id]);

  const handleAccept = () => {
    stopOrderAlert();
    playAcceptChime();
    onAccept(order);
  };

  const handleConfirmReject = () => {
    stopOrderAlert();
    onReject(order.id, selectedReason || 'Not available');
    setShowRejectReasons(false);
  };

  const distanceKm = Number(order.distance_km || 1.8);
  const estimatedPay = Math.round(30 + (distanceKm * 10) + (order.total > 500 ? 20 : 10));

  const rejectReasonsList = [
    { id: 'too_far', label: lang === 'hi' ? 'दूरी बहुत अधिक है' : 'Distance too far' },
    { id: 'vehicle_issue', label: lang === 'hi' ? 'वाहन में खराबी / पंचर' : 'Vehicle issue / Puncture' },
    { id: 'bad_weather', label: lang === 'hi' ? 'तेज़ बारिश / ख़राब मौसम' : 'Heavy rain / Bad weather' },
    { id: 'personal', label: lang === 'hi' ? 'व्यक्तिगत कारण' : 'Personal emergency' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-scaleUp">
        
        {/* Animated Header with Siren Pulse */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase bg-black/20 px-2 py-0.5 rounded-full inline-block">
                {lang === 'hi' ? 'नया ऑर्डर' : 'NEW ORDER ALERT'}
              </span>
              <h3 className="text-base font-black tracking-tight leading-tight">
                Order #{order.id}
              </h3>
            </div>
          </div>

          {/* 30s Countdown Dial */}
          <div className="relative w-12 h-12 flex items-center justify-center bg-black/30 rounded-2xl border border-white/20">
            <span className={`text-lg font-black font-mono ${timeLeft <= 10 ? 'text-rose-300 animate-pulse' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Order Details Body */}
        <div className="p-5 space-y-4">

          {/* Earnings & Payment Highlight Box */}
          <div className="bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                {lang === 'hi' ? 'अनुमानित राइडर कमाई' : 'Estimated Earnings'}
              </span>
              <div className="text-2xl font-black text-emerald-400 flex items-center">
                <span>₹{estimatedPay}</span>
                <span className="text-xs text-emerald-500/80 font-normal ml-2">
                  (₹30 + ₹{Math.round(distanceKm * 10)} + Bonus)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                {lang === 'hi' ? 'भुगतान प्रकार' : 'Payment Type'}
              </span>
              <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                order.payment_method?.includes('Cash') || order.payment_status?.includes('COD')
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {order.payment_method?.includes('Cash') || order.payment_status?.includes('COD') 
                  ? `COD: ₹${order.total}` 
                  : 'Prepaid ✓'}
              </span>
            </div>
          </div>

          {/* Route Info: Store to Customer */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Package className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">
                  {lang === 'hi' ? 'पिकअप स्टोर' : 'Pickup Store'}
                </span>
                <p className="text-xs font-bold text-white truncate">
                  GhartakKart Khair Store
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  Somna Road, Main Market, Khair (0.4 km away)
                </p>
              </div>
            </div>

            {/* Connecting line */}
            <div className="ml-3.5 border-l-2 border-dashed border-slate-700 h-4" />

            {/* Drop */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  {lang === 'hi' ? 'डिलीवरी पता' : 'Drop Address'} • {distanceKm} km
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {order.address?.line1 || order.customer_name || 'Khair Customer'}
                </p>
                <p className="text-[11px] text-amber-300/90 truncate">
                  📍 {order.address?.landmark || 'Near Main Road'}
                </p>
              </div>
            </div>
          </div>

          {/* Item count & weight */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>{order.items?.length || 1} {lang === 'hi' ? 'आइटम (सामान)' : 'Items'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{order.delivery_slot || 'ASAP (15-25m)'}</span>
            </span>
          </div>

          {/* Rejection Modal Inline View */}
          {showRejectReasons && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-2.5 animate-fadeIn">
              <span className="text-xs font-bold text-rose-300 block">
                {lang === 'hi' ? 'अस्वीकार करने का कारण चुनें:' : 'Select rejection reason:'}
              </span>
              <div className="space-y-1.5">
                {rejectReasonsList.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.label)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium border transition ${
                      selectedReason === r.label 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-200' 
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectReasons(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!selectedReason}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                >
                  {lang === 'hi' ? 'कन्फर्म रिजेक्ट' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showRejectReasons && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectReasons(true)}
                className="w-1/3 py-3.5 rounded-2xl border border-slate-700 hover:border-rose-500/50 bg-slate-800/80 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>{lang === 'hi' ? 'अस्वीकार' : 'Reject'}</span>
              </button>

              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{lang === 'hi' ? 'ऑर्डर स्वीकार करें' : 'ACCEPT ORDER'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

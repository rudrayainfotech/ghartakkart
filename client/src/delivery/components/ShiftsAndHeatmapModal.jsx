import React, { useState } from 'react';
import { 
  Flame, Clock, Calendar, Coffee, MapPin, 
  ChevronRight, CheckCircle2, X, AlertCircle 
} from 'lucide-react';

export function ShiftsAndHeatmapModal({ isOpen, onClose, partner, onToggleBreak, lang = 'en' }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' | 'shifts' | 'break'
  const [selectedShift, setSelectedShift] = useState('evening');
  const [breakMinutes, setBreakMinutes] = useState(15);
  const [breakActive, setBreakActive] = useState(false);
  const [breakTimer, setBreakTimer] = useState(0);

  const zones = [
    { name: 'Khair Main Market & Somna Rd', surge: '1.5x 🔥', demand: 'Very High', orders: '35+ orders/hr', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { name: 'Chhota Chauraha & Tehsil Rd', surge: '1.3x ⚡', demand: 'High', orders: '20+ orders/hr', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { name: 'Aligarh Bypass & New Basti', surge: '1.1x', demand: 'Moderate', orders: '12 orders/hr', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
  ];

  const shifts = [
    { id: 'morning', time: '07:00 AM - 12:00 PM', name: 'Morning Fresh Groceries', bonus: '₹80 Extra', booked: true },
    { id: 'afternoon', time: '12:00 PM - 05:00 PM', name: 'Afternoon Essentials', bonus: '₹50 Extra', booked: false },
    { id: 'evening', time: '05:00 PM - 10:30 PM', name: 'Evening Peak Super Surge', bonus: '₹150 Extra', booked: false }
  ];

  const handleStartBreak = (mins) => {
    setBreakActive(true);
    setBreakTimer(mins * 60);
    onToggleBreak(true, mins);
  };

  const handleEndBreak = () => {
    setBreakActive(false);
    setBreakTimer(0);
    onToggleBreak(false, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'hi' ? 'शिफ्ट बुकिंग और डिमांड मैप' : 'Shifts & Demand Heatmap'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Khair Hyperlocal Zone
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-3 bg-slate-950 flex gap-1 border-b border-slate-800 text-xs font-bold">
          {[
            { id: 'heatmap', label: lang === 'hi' ? '🔥 डिमांड मैप' : '🔥 Demand Map' },
            { id: 'shifts', label: lang === 'hi' ? '📅 शिफ्ट स्लॉट' : '📅 Book Shifts' },
            { id: 'break', label: lang === 'hi' ? '☕ ब्रेक मोड' : '☕ Break Mode' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-xl transition ${
                activeTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: Heatmap */}
          {activeTab === 'heatmap' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300">
                {lang === 'hi' 
                  ? 'लाइव डिमांड वाले इलाकों में जाएं और प्रति ऑर्डर 1.5x तक अधिक बोनस कमाएं।' 
                  : 'Position yourself near high-demand hotspots to earn up to 1.5x surge pay per delivery.'}
              </div>

              <div className="space-y-2.5">
                {zones.map((z, idx) => (
                  <div key={idx} className={`p-3.5 rounded-2xl border ${z.color} flex items-center justify-between`}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{z.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-300 block">{z.orders}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-sm block">{z.surge}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider">{z.demand}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Book Shifts */}
          {activeTab === 'shifts' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 block">
                {lang === 'hi' ? 'आगामी स्लॉट बुक करें (गारंटीड ऑर्डर):' : 'Reserve peak slots for guaranteed order flow:'}
              </span>

              <div className="space-y-2">
                {shifts.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedShift(s.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      selectedShift === s.id 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-200' 
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs text-white">{s.time}</span>
                      </div>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        {s.bonus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{s.name}</p>
                    <div className="mt-2 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.booked ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {s.booked ? 'Confirmed ✓' : 'Tap to Book'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Break Mode */}
          {activeTab === 'break' && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-3xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                <Coffee className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  {lang === 'hi' ? 'आराम / चाय ब्रेक मोड' : 'Take a Break'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {lang === 'hi' 
                    ? 'बिना किसी रेटिंग पेनल्टी के 15 से 45 मिनट का ब्रेक लें। इस दौरान कोई नया ऑर्डर नहीं आएगा।' 
                    : 'Pause incoming orders without any acceptance rate penalty.'}
                </p>
              </div>

              {!breakActive ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[15, 30, 45].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setBreakMinutes(mins)}
                        className={`p-3 rounded-2xl border text-xs font-bold transition ${
                          breakMinutes === mins 
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {mins} {lang === 'hi' ? 'मिनट' : 'Mins'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleStartBreak(breakMinutes)}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {lang === 'hi' ? `${breakMinutes} मिनट का ब्रेक शुरू करें` : `Start ${breakMinutes}m Break`}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-amber-300 block">
                    {lang === 'hi' ? 'ब्रेक सक्रिय है' : 'Break in progress'}
                  </span>
                  <div className="text-2xl font-mono font-black text-white">
                    {breakMinutes}:00
                  </div>
                  <button
                    onClick={handleEndBreak}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                  >
                    {lang === 'hi' ? 'ड्यूटी पुनः शुरू करें' : 'Resume Duty Now'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

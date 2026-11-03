import React, { useState } from 'react';
import { 
  IndianRupee, TrendingUp, Calendar, Zap, Download, 
  HelpCircle, ChevronRight, Award, CheckCircle2, ArrowUpRight 
} from 'lucide-react';

export function EarningsView({ partner, completedOrders = [], lang = 'en' }) {
  const [period, setPeriod] = useState('today'); // 'today' | 'weekly'
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeOrderId, setDisputeOrderId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  const stats = partner?.today_stats || {
    earnings: 480,
    base_pay: 270,
    distance_pay: 110,
    waiting_pay: 25,
    surge_pay: 45,
    tips: 30,
    orders_count: 6,
    duty_hours: '4h 15m'
  };

  const weeklyTotal = stats.earnings * 5 + 650;

  const handleInstantCashout = () => {
    alert(
      lang === 'hi' 
        ? `₹${stats.earnings} की राशि तुरंत आपके UPI ID (${partner?.bank_details?.upi_id || '6398317028@paytm'}) पर भेज दी गई है!` 
        : `₹${stats.earnings} has been instantly transferred to your UPI ID (${partner?.bank_details?.upi_id || '6398317028@paytm'})!`
    );
  };

  const handleDisputeSubmit = () => {
    if (!disputeOrderId || !disputeReason) return;
    setDisputeSuccess(true);
    setTimeout(() => {
      setDisputeSuccess(false);
      setShowDisputeModal(false);
      setDisputeOrderId('');
      setDisputeReason('');
    }, 1500);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      
      {/* Earnings Period Switcher */}
      <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex text-xs font-bold">
        <button
          onClick={() => setPeriod('today')}
          className={`flex-1 py-2 rounded-xl transition ${
            period === 'today' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'hi' ? 'आज की कमाई' : "Today's Earnings"}
        </button>
        <button
          onClick={() => setPeriod('weekly')}
          className={`flex-1 py-2 rounded-xl transition ${
            period === 'weekly' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'hi' ? 'इस सप्ताह (Weekly)' : 'This Week'}
        </button>
      </div>

      {/* Main Big Earnings Card */}
      <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-5 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-400/90 font-bold uppercase tracking-wider block">
              {period === 'today' ? (lang === 'hi' ? 'आज कुल कमाई' : 'Total Today') : (lang === 'hi' ? 'साप्ताहिक कुल' : 'Weekly Total')}
            </span>
            <div className="text-3xl font-black text-white flex items-center mt-0.5">
              <span>₹{period === 'today' ? stats.earnings : weeklyTotal}</span>
            </div>
          </div>

          <button
            onClick={handleInstantCashout}
            className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{lang === 'hi' ? 'तुरंत निकालें' : 'Instant Cash-out'}</span>
          </button>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              {lang === 'hi' ? 'पूरी की गई डिलीवरी' : 'Orders Delivered'}
            </span>
            <span className="text-base font-black text-white">
              {stats.orders_count} orders
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              {lang === 'hi' ? 'ड्यूटी का समय' : 'Duty Hours'}
            </span>
            <span className="text-base font-black text-white">
              {stats.duty_hours}
            </span>
          </div>
        </div>
      </div>

      {/* Transparent Per-Order Earnings Breakdown (PRD Section 6.7 ER-1) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span>{lang === 'hi' ? 'कमाई का पारदर्शी विवरण' : 'Transparent Pay Breakdown'}</span>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">100% Verified</span>
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2.5 bg-slate-800/50 rounded-xl">
            <span className="text-slate-300 font-medium">{lang === 'hi' ? 'बेस पे (मूल भुगतान ₹30/ऑर्डर)' : 'Base Pay (₹30/order)'}</span>
            <span className="font-bold text-white">₹{stats.base_pay}</span>
          </div>
          <div className="flex justify-between p-2.5 bg-slate-800/50 rounded-xl">
            <span className="text-slate-300 font-medium">{lang === 'hi' ? 'दूरी शुल्क (₹10/किमी)' : 'Distance Pay (₹10/km)'}</span>
            <span className="font-bold text-white">₹{stats.distance_pay}</span>
          </div>
          <div className="flex justify-between p-2.5 bg-slate-800/50 rounded-xl">
            <span className="text-slate-300 font-medium">{lang === 'hi' ? 'स्टोर प्रतीक्षा मुआवजा' : 'Store Waiting Compensation'}</span>
            <span className="font-bold text-emerald-400">+₹{stats.waiting_pay}</span>
          </div>
          <div className="flex justify-between p-2.5 bg-slate-800/50 rounded-xl">
            <span className="text-slate-300 font-medium">{lang === 'hi' ? 'पीक टाइम सर्ज बोनस' : 'Peak Time Surge Bonus'}</span>
            <span className="font-bold text-emerald-400">+₹{stats.surge_pay}</span>
          </div>
          <div className="flex justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300">
            <span className="font-semibold">{lang === 'hi' ? 'ग्राहक टिप (100% आपकी)' : 'Customer Tips (100% to partner)'}</span>
            <span className="font-bold">₹{stats.tips}</span>
          </div>
        </div>
      </div>

      {/* Daily Incentive Tracker with Progress Bar (PRD Section 6.7 ER-3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'hi' ? 'दैनिक इंसेंटिव लक्ष्य' : 'Daily Incentive Target'}
            </h4>
          </div>
          <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            +₹150 Bonus
          </span>
        </div>

        <p className="text-xs text-slate-300">
          {lang === 'hi' ? 'शाम की पीक शिफ्ट (5PM-10PM) में 8 डिलीवरी पूरी करें और ₹150 बोनस पाएं!' : 'Complete 8 deliveries in the Evening Peak shift to unlock ₹150 extra cash!'}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.orders_count / 8) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>{stats.orders_count} / 8 Delivered</span>
            <span>2 orders remaining!</span>
          </div>
        </div>
      </div>

      {/* Payout Schedule & Statement Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">{lang === 'hi' ? 'साप्ताहिक बैंक ट्रांसफर:' : 'Scheduled Bank Transfer:'}</span>
          <span className="text-white font-bold">Every Tuesday (Auto)</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">{lang === 'hi' ? 'लिंक्ड बैंक खाता:' : 'Linked Account:'}</span>
          <span className="text-emerald-400 font-mono font-bold">SBI •••• 5612</span>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            onClick={() => alert(lang === 'hi' ? 'कमाई स्टेटमेंट डाउनलोड हो रही है...' : 'Downloading PDF statement...')}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'hi' ? 'स्टेटमेंट डाउनलोड' : 'Statement'}</span>
          </button>

          <button
            onClick={() => setShowDisputeModal(true)}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{lang === 'hi' ? 'कमाई पर विवाद दर्ज' : 'Dispute Pay'}</span>
          </button>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              <span>{lang === 'hi' ? 'ऑर्डर कमाई विवाद दर्ज करें' : 'Dispute Order Earnings'}</span>
            </h4>
            <input 
              type="text" 
              placeholder="Order ID (e.g. GK-7942)"
              value={disputeOrderId}
              onChange={(e) => setDisputeOrderId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <textarea 
              placeholder="Describe issue (e.g. extra distance not counted, unpaid waiting time)"
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2 pt-1">
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleDisputeSubmit}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                {disputeSuccess ? 'Submitted ✓' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

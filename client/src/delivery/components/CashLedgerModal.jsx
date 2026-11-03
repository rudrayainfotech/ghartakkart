import React, { useState } from 'react';
import { 
  IndianRupee, AlertTriangle, ArrowUpRight, ArrowDownLeft, 
  QrCode, Building2, CheckCircle2, History, X, ShieldAlert 
} from 'lucide-react';

export function CashLedgerModal({ isOpen, onClose, partner, ledger = [], onDepositCash, lang = 'en' }) {
  if (!isOpen) return null;

  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('upi'); // 'upi' | 'hub'
  const [depositSuccess, setDepositSuccess] = useState(false);

  const cashInHand = partner?.cash_in_hand || 0;
  const cashLimit = partner?.cash_limit || 2500;
  const percentage = Math.min(100, Math.round((cashInHand / cashLimit) * 100));
  const isNearLimit = percentage >= 80;

  const handleDepositSubmit = () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0 || amt > cashInHand) {
      alert(lang === 'hi' ? 'कृपया सही राशि दर्ज करें' : 'Please enter a valid deposit amount');
      return;
    }

    onDepositCash(amt, depositMethod);
    setDepositSuccess(true);
    setTimeout(() => {
      setDepositSuccess(false);
      setDepositAmount('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'hi' ? 'कैश-इन-हैंड और लेजर खाता' : 'Cash-in-Hand & Ledger'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'hi' ? 'COD संग्रह व स्टोर जमा' : 'COD collections & hub deposits'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Running Cash Balance Card with Limit Meter */}
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  {lang === 'hi' ? 'वर्तमान कैश-इन-हैंड' : 'Current Cash-in-Hand'}
                </span>
                <div className="text-3xl font-black text-white flex items-center">
                  <span>₹{cashInHand}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                  {lang === 'hi' ? 'अधिकतम सुरक्षित सीमा' : 'Max Safe Limit'}
                </span>
                <span className="text-sm font-bold text-slate-300">
                  ₹{cashLimit}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div 
                  className={`h-full transition-all duration-300 ${
                    percentage >= 90 ? 'bg-rose-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>{percentage}% of limit used</span>
                <span>Remaining: ₹{Math.max(0, cashLimit - cashInHand)}</span>
              </div>
            </div>

            {isNearLimit && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'hi' 
                    ? 'कैश सीमा 80% पार हो चुकी है। नए COD ऑर्डर पाने के लिए कृपया कैश जमा करें।' 
                    : 'Cash limit reached 80%. Please deposit cash to continue receiving COD orders.'}
                </span>
              </div>
            )}
          </div>

          {/* Deposit Action Section */}
          <div className="bg-slate-800/60 border border-slate-700/80 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {lang === 'hi' ? 'कंपनी को कैश जमा करें' : 'Deposit Cash to GhartakKart'}
            </h4>

            {/* Method Select: UPI vs Store Hub */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepositMethod('upi')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  depositMethod === 'upi'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI / QR Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setDepositMethod('hub')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  depositMethod === 'hub'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Store Cashier</span>
              </button>
            </div>

            {depositMethod === 'upi' ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 space-y-2 text-center">
                <span className="text-[11px] text-slate-400 block">
                  {lang === 'hi' ? 'GhartakKart आधिकारिक मर्चेंट UPI ID:' : 'GhartakKart Official Merchant UPI:'}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg inline-block">
                  9058564391@ptsbi
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 space-y-1 text-xs text-slate-300">
                <span className="font-bold text-white block">Somna Road Main Store Counter</span>
                <span className="text-[11px] text-slate-400 block">Hand cash to store manager Mr. Gaurav & obtain digital receipt</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input 
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                    max={cashInHand}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDepositAmount(String(cashInHand))}
                  className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl"
                >
                  All (₹{cashInHand})
                </button>
              </div>

              <button
                type="button"
                onClick={handleDepositSubmit}
                disabled={!depositAmount || Number(depositAmount) <= 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {depositSuccess 
                    ? (lang === 'hi' ? 'जमा सफल! लेजर अपडेट हुआ ✓' : 'Deposit Recorded ✓')
                    : (lang === 'hi' ? `₹${depositAmount || 0} जमा की पुष्टि करें` : `Confirm ₹${depositAmount || 0} Deposit`)}
                </span>
              </button>
            </div>
          </div>

          {/* Transaction Ledger History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'हाल के लेन-देन (लेजर)' : 'Recent Ledger Entries'}</span>
              </span>
            </div>

            <div className="space-y-2">
              {(ledger.length > 0 ? ledger : [
                { id: '1', type: 'collection', order_id: 'GK-7942', amount: 253, time: 'Today, 02:40 PM', balance_after: 253 },
                { id: '2', type: 'deposit', order_id: 'DEP-884', amount: 200, time: 'Today, 04:10 PM', balance_after: 53 }
              ]).map((entry, idx) => (
                <div key={idx} className="p-3 bg-slate-800/50 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      entry.type === 'deposit' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {entry.type === 'deposit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        {entry.type === 'deposit' ? 'Cash Deposited to Store' : `Order #${entry.order_id} COD`}
                      </span>
                      <span className="text-[10px] text-slate-400">{entry.time}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold block ${
                      entry.type === 'deposit' ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                      {entry.type === 'deposit' ? '-' : '+'}₹{entry.amount}
                    </span>
                    <span className="text-[10px] text-slate-500">Bal: ₹{entry.balance_after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

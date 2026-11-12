import React, { useState } from 'react';
import { Bike, KeyRound, Lock, Phone, ShieldAlert, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import { fetchNodeFromSupabase } from '../../supabase.js';

export function RiderLoginModal({ isOpen, onClose, currentPartner, onLoginSuccess, lang = 'en' }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanId = loginId.trim().toLowerCase();
    const cleanDigits = cleanId.replace(/\D/g, '').slice(-10);

    if (!cleanId || !password) {
      setError(lang === 'hi' ? 'कृपया राइडर ID/फ़ोन और पासवर्ड दर्ज करें' : 'Please enter Rider ID / Phone and Password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let staffList = [];
      try {
        const remoteStaff = await fetchNodeFromSupabase('staff');
        if (Array.isArray(remoteStaff)) {
          staffList = remoteStaff;
          try { localStorage.setItem('gk_staff', JSON.stringify(remoteStaff)); } catch {}
        } else if (remoteStaff && typeof remoteStaff === 'object') {
          staffList = Object.values(remoteStaff);
        }
      } catch {}

      if (staffList.length === 0) {
        try {
          const cached = localStorage.getItem('gk_staff');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) staffList = parsed;
          }
        } catch {}
      }

      const matched = staffList.find((s) => {
        if (!s) return false;
        const u = (s.username || '').trim().toLowerCase();
        const pRaw = String(s.phone || '').trim().toLowerCase();
        const pDigits = pRaw.replace(/\D/g, '').slice(-10);
        const idMatch =
          (u && u === cleanId) ||
          (pRaw && pRaw === cleanId) ||
          (cleanDigits && cleanDigits.length >= 10 && pDigits === cleanDigits) ||
          String(s.id || '').toLowerCase() === cleanId;
        const expectedPass = String(s.password || '123456');
        return idMatch && expectedPass === String(password);
      });

      if (!matched) {
        setError(
          lang === 'hi'
            ? 'गलत राइडर ID या पासवर्ड। एडमिन पैनल में अपना ID और पासवर्ड जांचें।'
            : 'Invalid Rider Login ID or Password. Please check credentials in Admin Panel.'
        );
        setLoading(false);
        return;
      }

      if (matched.active === false) {
        setError(
          lang === 'hi'
            ? 'आपका राइडर अकाउंट निष्क्रिय है। कृपया स्टोर एडमिन से संपर्क करें।'
            : 'Your rider account is deactivated. Please contact Store Admin.'
        );
        setLoading(false);
        return;
      }

      const loggedInPartner = {
        ...(currentPartner || {}),
        ...matched,
        id: matched.id,
        name: matched.name,
        phone: matched.phone,
        vehicle: matched.vehicle || currentPartner?.vehicle || 'Bike',
        kyc_status: matched.kyc_status || 'verified',
        is_online: matched.kyc_status === 'verified'
      };

      onLoginSuccess?.(loggedInPartner);
      setLoginId('');
      setPassword('');
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Unable to verify rider credentials right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-slate-100">
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Bike className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {lang === 'hi' ? 'राइडर लॉगिन / अकाउंट बदलें' : 'Rider Login / Switch Account'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'hi' ? 'एडमिन द्वारा दिया गया ID और पासवर्ड डालें' : 'Sign in with Admin-issued Rider ID & Password'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">
              {lang === 'hi' ? 'राइडर लॉगिन ID या मोबाइल नंबर' : 'Rider Login ID or Phone Number'}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. rider01 or 9811122334"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1.5">
              {lang === 'hi' ? 'पासवर्ड' : 'Password'}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (default: 123456)"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            {loading ? (
              <span>{lang === 'hi' ? 'जाँच हो रही है...' : 'Verifying Rider Account...'}</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'लॉगिन करें' : 'Sign In as Delivery Partner'}</span>
              </>
            )}
          </button>

          {currentPartner?.name && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Current: <strong className="text-slate-200">{currentPartner.name}</strong></span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Active Session
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

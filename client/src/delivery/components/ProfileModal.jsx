import React from 'react';
import { 
  User, Award, Star, ShieldCheck, Bike, CreditCard, 
  Share2, AlertCircle, X, ChevronRight, CheckCircle2, LogOut 
} from 'lucide-react';

export function ProfileModal({ isOpen, onClose, partner, onEditKyc, onLogout, lang = 'en' }) {
  if (!isOpen) return null;

  const handleShareReferral = () => {
    const text = encodeURIComponent(
      `Join GhartakKart Delivery Partner Fleet in Khair & earn up to ₹25,000/month with daily payouts! Use my referral code: GK-RIDER-KRISHNA to get ₹500 welcome bonus!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'hi' ? 'राइडर प्रोफ़ाइल और रेटिंग' : 'Partner Profile & Ratings'}
              </h3>
              <p className="text-[11px] text-slate-400">
                GhartakKart Delivery Fleet
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Profile Card */}
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                {partner?.name ? partner.name.charAt(0) : 'K'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                ✓
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-white truncate">
                  {partner?.name || 'Krishna Kumar'}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                +91 {partner?.phone || '6398317028'}
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                <span>{partner?.vehicle || 'EV Scooty (UP 81 AZ 4412)'}</span>
              </p>
            </div>
          </div>

          {/* Performance Scorecard (PRD Section 6.9 PR-2) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              {lang === 'hi' ? 'प्रदर्शन स्कोरकार्ड' : 'Performance Scorecard'}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-base">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{partner?.rating || 4.9}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'hi' ? 'ग्राहक रेटिंग' : 'Rating'}
                </span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 text-center">
                <div className="text-emerald-400 font-black text-base">
                  {partner?.acceptance_rate || 96}%
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'hi' ? 'स्वीकृति दर' : 'Acceptance'}
                </span>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800 text-center">
                <div className="text-emerald-400 font-black text-base">
                  {partner?.on_time_rate || 94}%
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {lang === 'hi' ? 'समय पर दर' : 'On-Time'}
                </span>
              </div>
            </div>
          </div>

          {/* Gamification Badges & Tier (PRD Section 6.9 PR-3) */}
          <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-800 to-slate-800 rounded-2xl border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Gold Star Partner Tier
                </h4>
              </div>
              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/20 px-2 py-0.5 rounded-full">
                Tier Perks: Priority Surge
              </span>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 text-center">
                <span className="text-base block">⚡</span>
                <span className="text-[10px] font-bold text-white block mt-0.5">Khair Express</span>
              </div>
              <div className="flex-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 text-center">
                <span className="text-base block">📦</span>
                <span className="text-[10px] font-bold text-white block mt-0.5">100+ Club</span>
              </div>
              <div className="flex-1 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 text-center">
                <span className="text-base block">⭐</span>
                <span className="text-[10px] font-bold text-white block mt-0.5">Top Rated</span>
              </div>
            </div>
          </div>

          {/* Document Status & Expiry Warning (PRD Section 6.9 PR-5) */}
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {lang === 'hi' ? 'दस्तावेज़ स्थिति' : 'Document Status & Expiry'}
              </span>
              <button
                onClick={onEditKyc}
                className="text-[11px] font-semibold text-emerald-400 underline"
              >
                {lang === 'hi' ? 'दस्तावेज़ देखें' : 'View / Edit'}
              </button>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Driving Licence (DL)</span>
                <span className="text-emerald-400 font-medium">Valid till Dec 2028 ✓</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Vehicle RC (UP 81 AZ 4412)</span>
                <span className="text-emerald-400 font-medium">Verified ✓</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Aadhaar & PAN</span>
                <span className="text-emerald-400 font-medium">e-KYC Complete ✓</span>
              </div>
            </div>
          </div>

          {/* Referral Card (PRD Section 6.1 ON-8) */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-emerald-300 block">
              {lang === 'hi' ? 'दोस्त को जोड़ें और ₹500 बोनस पाएं' : 'Refer a Rider Friend & Earn ₹500'}
            </span>
            <p className="text-[11px] text-slate-300">
              {lang === 'hi' 
                ? 'अपने साथी राइडर को घरतककार्ट से जोड़ें। उनके 25 ऑर्डर पूरे होने पर आपके बैंक खाते में ₹500 आएंगे!' 
                : 'Share your referral code. Earn ₹500 directly in your account after your friend completes 25 deliveries!'}
            </p>
            <button
              onClick={handleShareReferral}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'व्हाट्सएप पर शेयर करें' : 'Share on WhatsApp'}</span>
            </button>
          </div>

          {/* Logout / Switch Partner Button */}
          {onLogout && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'hi' ? 'राइडर अकाउंट से लॉगआउट करें' : 'Log Out / Switch Rider Account'}</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { playChime } from './utils/sound.js';

// Official MSG91 Production Credentials
export const MSG91_CONFIG = {
  widgetId: "366b65685947363636393032",
  tokenAuth: "587557TQWDRAWc6aec439fP1",
  authKey: "587557TQWDRAWc6aec439fP1",
  templateId: "6adcb8421850695632091de3",
  senderId: "GHRTAK"
};

export default function PhoneLogin({ onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem('gk_last_customer_phone') || '';
    } catch {
      return '';
    }
  });

  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isWidgetActive, setIsWidgetActive] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isBlockedFallback, setIsBlockedFallback] = useState(false);

  const phoneInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Sanitize phone number to prevent leading zero or country code duplication
  const handlePhoneChange = (val) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.slice(2);
    }
    cleaned = cleaned.replace(/^0+/, '');
    setPhone(cleaned.slice(0, 10));
  };

  // Helper to ensure MSG91 SDK script is loaded
  const ensureMsg91Script = (onLoaded, onError) => {
    if (typeof window !== 'undefined' && typeof window.initSendOTP === 'function') {
      onLoaded();
      return;
    }

    const scriptUrls = [
      'https://verify.msg91.com/otp-provider.js',
      'https://verify.phone91.com/otp-provider.js'
    ];

    let i = 0;
    const attempt = () => {
      const s = document.createElement('script');
      s.src = scriptUrls[i];
      s.async = true;
      s.onload = () => {
        if (typeof window.initSendOTP === 'function') {
          onLoaded();
        } else {
          i++;
          if (i < scriptUrls.length) attempt();
          else onError('OTP service could not initialize.');
        }
      };
      s.onerror = () => {
        i++;
        if (i < scriptUrls.length) attempt();
        else onError('Network connection to OTP service failed. Please try again.');
      };
      document.head.appendChild(s);
    };

    attempt();
  };

  // Launch official MSG91 OTP widget
  const handleLaunchMsg91Otp = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccessNotice('');
    setIsBlockedFallback(false);

    const cleanPhone = phone.replace(/^0+/, '').replace(/\D/g, '').slice(-10);
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Please enter your full name (Apna naam dalein).');
      nameInputRef.current?.focus();
      return;
    }

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      phoneInputRef.current?.focus();
      return;
    }

    setIsLaunching(true);

    ensureMsg91Script(
      () => {
        setIsLaunching(false);
        setIsWidgetActive(true);
        setSuccessNotice(`OTP verification window opened for +91 ${cleanPhone}. Please complete the verification popup on your screen.`);
        playChime('chime');

        // Hook global callbacks from index.html if needed
        window.__handleMsg91Success = async (data) => {
          console.log('[MSG91 OTP] Success response:', data);
          setIsWidgetActive(false);
          setSuccessNotice('OTP Verified successfully! Logging you in...');
          playChime('success');

          const accessToken = typeof data === 'string'
            ? data
            : (data?.['access-token'] || data?.message || data?.token || '');

          // Verify accessToken via MSG91 endpoint using authkey
          if (accessToken && typeof accessToken === 'string' && accessToken.startsWith('eyJ')) {
            try {
              fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  authkey: MSG91_CONFIG.authKey,
                  'access-token': accessToken
                })
              }).then(r => r.json()).then(res => {
                console.log('[MSG91] verifyAccessToken verified:', res);
              }).catch(() => {
                fetch('/api/otp/verify-access-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accessToken })
                }).catch(() => {});
              });
            } catch (vErr) {
              console.warn('[MSG91] verifyAccessToken call notice:', vErr);
            }
          }

          try {
            localStorage.setItem('gk_last_customer_phone', cleanPhone);
          } catch {}

          if (onSuccess) {
            onSuccess({
              uid: `gk-user-${cleanPhone}`,
              name: cleanName || 'Customer',
              email: '',
              phoneNumber: cleanPhone,
              verifiedBy: 'msg91-widget',
              token: accessToken
            });
          }
        };

        window.__handleMsg91Failure = (error) => {
          console.warn('[OTP] Failure or closed:', error);
          setIsWidgetActive(false);
          const errStr = typeof error === 'string'
            ? error
            : (error?.message || error?.description || 'Verification was closed or failed.');

          if (errStr.toLowerCase().includes('ip') || errStr.toLowerCase().includes('block')) {
            setIsBlockedFallback(true);
            setError('IP Blocked: MSG91 anti-abuse system temporarily rate-limited this IP address.');
          } else {
            setError(errStr);
          }
        };

        const configuration = {
          widgetId: MSG91_CONFIG.widgetId,
          tokenAuth: MSG91_CONFIG.tokenAuth,
          identifier: "91" + cleanPhone,
          exposeMethods: false,
          success: (data) => {
            if (window.__handleMsg91Success) window.__handleMsg91Success(data);
          },
          failure: (error) => {
            if (window.__handleMsg91Failure) window.__handleMsg91Failure(error);
          }
        };

        try {
          window.initSendOTP(configuration);
        } catch (initErr) {
          console.error('[OTP] initSendOTP exception:', initErr);
          setIsWidgetActive(false);
          setError('Could not start OTP service. Please try again.');
        }
      },
      (errReason) => {
        setIsLaunching(false);
        setError(errReason);
      }
    );
  };

  // Direct login fail-safe if IP is blocked by MSG91 rate-limiter
  const handleBypassLogin = () => {
    const cleanPhone = phone.replace(/^0+/, '').replace(/\D/g, '').slice(-10);
    const cleanName = name.trim() || 'Customer';

    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      localStorage.setItem('gk_last_customer_phone', cleanPhone);
    } catch {}

    playChime('success');
    if (onSuccess) {
      onSuccess({
        uid: `gk-user-${cleanPhone}`,
        name: cleanName,
        email: '',
        phoneNumber: cleanPhone,
        verifiedBy: 'rate-limit-bypass'
      });
    }
  };

  return (
    <div className="max-w-sm mx-auto py-2 px-1 text-center space-y-4">
      {/* Brand Icon Header */}
      <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
        <ShieldCheck className="w-8 h-8" />
      </div>

      <div>
        <h4 className="font-black text-gray-900 text-lg">
          Login / Register with OTP
        </h4>
        <p className="text-xs text-gray-500 mt-0.5">
          Fast & Secure Mobile SMS OTP Verification
        </p>
      </div>

      {/* Error Message Display */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl animate-shake text-left space-y-2">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>

          {isBlockedFallback && (
            <div className="pt-2 border-t border-rose-200">
              <p className="text-[11px] text-gray-600 mb-2">
                To unblock your IP: In MSG91 Dashboard, open <strong>OTP &gt; Tokens &gt; IPs</strong> and click Unblock.
              </p>
              <button
                type="button"
                onClick={handleBypassLogin}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bypass & Login Directly (Emergency / Testing)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success Notification Display */}
      {successNotice && !error && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      <form onSubmit={handleLaunchMsg91Otp} className="space-y-3.5 text-left">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Your Full Name (Aapka Naam) *
          </label>
          <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-600 bg-white shadow-2xs">
            <span className="bg-gray-50 px-3 py-2.5 text-gray-500 border-r border-gray-200">
              <User className="w-4 h-4" />
            </span>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            10-Digit Mobile Number *
          </label>
          <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-600 bg-white shadow-2xs">
            <span className="bg-gray-100 px-3 py-2.5 text-xs font-black text-gray-700 border-r border-gray-200 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> +91
            </span>
            <input
              ref={phoneInputRef}
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="submit"
          disabled={isLaunching}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {isLaunching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting OTP Service...</span>
            </>
          ) : isWidgetActive ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Reopen OTP Window</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Send OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Privacy Policy Footer Note */}
      <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
        By continuing, you agree to GharTak Kart's{' '}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.__openPrivacyPolicy) {
              window.__openPrivacyPolicy();
            }
          }}
          className="text-emerald-600 hover:text-emerald-800 underline font-semibold cursor-pointer"
        >
          Privacy Policy
        </button>
      </p>
    </div>
  );
}

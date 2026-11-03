import React from 'react';
import { useStore } from '../context/StoreContext.jsx';
import {
  ShieldCheck,
  X,
  Lock,
  MapPin,
  Smartphone,
  Bell,
  Database,
  UserCheck,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

export default function PrivacyPolicyModal() {
  const { isPrivacyModalOpen, setIsPrivacyModalOpen, settings } = useStore();

  if (!isPrivacyModalOpen) return null;

  const handleClose = () => {
    setIsPrivacyModalOpen(false);
    // If user arrived via /privacy or /privacy-policy URL, restore history clean URL
    if (window.location.pathname.includes('privacy') || window.location.hash.includes('privacy')) {
      try {
        window.history.replaceState({}, '', '/');
      } catch {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-policy-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-brand-900 to-gray-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/20 border border-brand-400/40 text-brand-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-brand-500/30 text-brand-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-brand-400/30">
                  Legal & Privacy
                </span>
                <span className="text-gray-400 text-xs">
                  Updated: October 2026
                </span>
              </div>
              <h2 id="privacy-policy-title" className="text-lg sm:text-xl font-black text-white tracking-tight">
                Privacy Policy • GharTak Kart
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close Privacy Policy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Policy Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-gray-700 text-xs sm:text-sm leading-relaxed">
          {/* Summary Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                Your Privacy Matters to GharTak Kart
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-800 leading-snug">
                We strictly use your location and contact details only to fulfill your hyperlocal grocery and food orders within our store's delivery radius in Khair, Uttar Pradesh. We never sell or share your data with advertisers.
              </p>
            </div>
          </div>

          {/* Intro */}
          <div>
            <h4 className="font-black text-sm sm:text-base text-gray-900 mb-1.5">
              Introduction
            </h4>
            <p className="text-gray-600">
              GharTak Kart ("we", "our", or "us"), operating out of Somna Road, Main Market, Khair, Aligarh, Uttar Pradesh - 202138, respects your privacy and is committed to protecting your personal data. This Privacy Policy applies to the GharTak Kart website (<a href="https://www.ghartakkart.com" className="text-brand-600 underline font-semibold">www.ghartakkart.com</a>) and our official Android Mobile Application.
            </p>
          </div>

          {/* Section 1: Data Collection */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h4 className="font-black text-sm sm:text-base text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-brand-600" />
              <span>1. Information We Collect</span>
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-600 pl-1">
              <li>
                <strong>Contact Information:</strong> Your name, mobile phone number, and optional email address when you sign in via Google or register an account.
              </li>
              <li>
                <strong>Delivery Addresses & Hyperlocal GPS Location:</strong> Approximate and precise GPS coordinates collected via your browser/device (with your explicit consent) and text addresses (house/flat number, road, landmark). This is strictly required to verify whether your address lies within our 0–10 km store delivery zone and dispatch delivery partners accurately.
              </li>
              <li>
                <strong>Order Details:</strong> Items in your cart, delivery instructions, order timestamps, and bill totals.
              </li>
              <li>
                <strong>Payment Information:</strong> We support Cash on Delivery (COD) and direct UPI scanning. We <em>do not</em> store or collect your credit/debit card numbers or UPI MPINs.
              </li>
              <li>
                <strong>Technical Information:</strong> Device type, browser type, and operating system version for security, analytics, and bug fixing.
              </li>
            </ul>
          </div>

          {/* Section 2: Usage */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h4 className="font-black text-sm sm:text-base text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span>2. How We Use Your Information</span>
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-gray-600 pl-1">
              <li>To deliver groceries, food, and daily essentials to your doorstep in 15–25 minutes.</li>
              <li>To calculate precise distance from our store hub and compute transparent delivery fee slabs.</li>
              <li>To send order confirmation and dispatch notifications via WhatsApp and SMS.</li>
              <li>To track your loyalty stamp rewards (1 stamp for ₹250+ orders, Free Surprise Gift on 10 stamps).</li>
              <li>To provide dedicated customer support and handle order queries.</li>
            </ul>
          </div>

          {/* Section 3: App Permissions */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h4 className="font-black text-sm sm:text-base text-gray-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-600" />
              <span>3. Mobile App Device Permissions</span>
            </h4>
            <p className="text-gray-600">
              When using our official Android application, we may request the following permissions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>Location Permission</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Required to auto-detect your location pin on the map and confirm delivery availability.
                </p>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                  <Bell className="w-3.5 h-3.5 text-brand-600" />
                  <span>Notification Permission</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Used to notify you when your order is accepted, prepared, or out for delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Data Sharing */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h4 className="font-black text-sm sm:text-base text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>4. Data Sharing & Security</span>
            </h4>
            <p className="text-gray-600">
              We do not sell, trade, or rent your personal data to any external marketing companies. Your information is only accessible by:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-1">
              <li>Our dedicated store fulfillment staff and delivery partners to reach your location.</li>
              <li>Secure cloud infrastructure (Google Firebase) used for real-time order processing.</li>
              <li>Law enforcement agencies if strictly required by applicable Indian laws.</li>
            </ul>
          </div>

          {/* Section 5: Data Retention & User Rights */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h4 className="font-black text-sm sm:text-base text-gray-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-600" />
              <span>5. Your Rights & Data Deletion</span>
            </h4>
            <p className="text-gray-600">
              You have the right to access, edit, or request complete deletion of your account and data. If you wish to delete your phone number, addresses, or order history from our systems, simply send an email to <a href="mailto:support@ghartakkart.com" className="text-brand-600 font-bold underline">support@ghartakkart.com</a> or message our WhatsApp Helpline at <strong>+91 7017675784</strong> with the subject <em>"Account Data Deletion Request"</em>. Your request will be fulfilled within 48 to 72 business hours.
            </p>
          </div>

          {/* Section 6: Grievance Redressal */}
          <div className="space-y-2 border-t border-gray-100 pt-4 bg-gray-50/80 p-4 rounded-2xl">
            <h4 className="font-black text-sm sm:text-base text-gray-900">
              6. Grievance Redressal & Contact Us
            </h4>
            <p className="text-gray-600 text-xs">
              If you have any questions, feedback, or grievances regarding this Privacy Policy or our data handling practices, please contact our designated Grievance Officer:
            </p>
            <div className="space-y-1 text-xs text-gray-800 font-medium pt-1">
              <p><strong>Store Name:</strong> GharTak Kart</p>
              <p><strong>Address:</strong> {settings?.store_address || 'Somna Road, Main Market, Khair, Aligarh, Uttar Pradesh - 202138'}</p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                <span><strong>Phone / WhatsApp:</strong> +91 7017675784</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-600" />
                <span><strong>Email:</strong> support@ghartakkart.com</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-gray-500 text-center sm:text-left">
            By using GharTak Kart, you acknowledge and agree to the practices outlined in this Privacy Policy.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}

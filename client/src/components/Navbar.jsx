import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { getStoreOperatingStatus } from '../utils/haversine.js';
import {
  MapPin,
  Search,
  ShoppingCart,
  User,
  Shield,
  Store,
  ChevronDown,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Flame
} from 'lucide-react';

export default function Navbar() {
  const {
    adminMode,
    setAdminMode,
    userLocation,
    isDetectingLocation,
    autoFetchCustomerLocation,
    setIsLocationModalOpen,
    searchQuery,
    setSearchQuery,
    cart,
    cartSubtotal,
    setIsCartOpen,
    customerUser,
    setIsAuthModalOpen,
    settings,
    offers,
    milestoneGifts,
    setIsOfferZoneOpen,
    setOfferZoneInitialFilter,
    customerStampStatus,
    openCustomerStampCard,
    customerWalletBalance,
    setAuthModalInitialTab
  } = useStore();

  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const storeStatus = getStoreOperatingStatus(settings, nowTick);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const activeDealsCount =
    (offers || []).filter(o => o && o.active !== false).length +
    (milestoneGifts || []).filter(m => m && m.active !== false).length;
  const activeStamps = customerStampStatus?.activeStamps || 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all">
      {/* Top Banner for delivery radius & operating status */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-accent-600 text-white text-[11px] sm:text-xs py-1.5 px-4 font-medium flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <button
            type="button"
            onClick={openCustomerStampCard}
            className="bg-yellow-300 hover:bg-yellow-200 text-amber-950 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase shadow-sm flex items-center gap-1 shrink-0 cursor-pointer transition-all"
          >
            <span>🎖️ Stamp Offer: ₹250+ = 1⭐ (10⭐ = Free Gift 🎁)</span>
          </button>
          <span className="truncate hidden sm:inline">
            🚀 Fresh groceries, vegetables, fast food & fruits delivered within 0 to {settings?.max_radius_km || 10} km!
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 shrink-0 text-white/90">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${!storeStatus.isOpen ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>
              {!storeStatus.isOpen
                ? `Closed Now (Timing: ${storeStatus.openFormatted} – ${storeStatus.closeFormatted})`
                : `Open Now: ${storeStatus.openFormatted} – ${storeStatus.closeFormatted}`}
            </span>
          </div>
          <a
            href={`https://wa.me/917017675784?text=${encodeURIComponent('Hello GhartakKart! I need help with my order / products.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 border border-white/30 px-2.5 py-0.5 rounded-full text-white font-bold transition-all"
          >
            <span>💬 WhatsApp: +91 7017675784</span>
          </a>
        </div>
      </div>

      {/* Store Closed / Outside Operating Hours Announcement Banner */}
      {!adminMode && !storeStatus.isOpen && (
        <div className="bg-rose-600 text-white font-bold text-xs py-2 px-4 text-center shadow-inner flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping inline-block shrink-0" />
          <span>{storeStatus.message}</span>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Brand Logo & Tagline / Mobile Location Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink min-w-0 max-w-[42%] sm:max-w-none">
          <img
            src={settings?.store_logo || '/logo.jpg'}
            alt="GhartakKart Logo"
            onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
            className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl object-cover shadow-xs border border-brand-500 shrink-0"
          />
          <div className="min-w-0">
            {/* Desktop Brand Text */}
            <div className="hidden sm:block">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
                Ghartak<span className="text-accent-500">Kart</span>
              </span>
              <p className="text-[10px] sm:text-[11px] font-semibold text-brand-700 tracking-wide -mt-0.5">
                Fresh to Home, Fast to You.
              </p>
            </div>

            {/* Mobile App Style Delivery Pill */}
            <button
              type="button"
              onClick={() => {
                if (!userLocation.isAutoDetected) {
                  autoFetchCustomerLocation({ silent: false });
                } else {
                  setIsLocationModalOpen(true);
                }
              }}
              className="sm:hidden flex items-center gap-0.5 text-left group min-w-0 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black uppercase text-brand-700 tracking-wider whitespace-nowrap">
                    ⚡ 15-25m
                  </span>
                  <span className={`text-[8px] px-1 py-0.2 rounded-full font-bold whitespace-nowrap ${
                    isDetectingLocation
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : !userLocation.isAutoDetected
                      ? 'bg-orange-100 text-orange-800 animate-pulse'
                      : userLocation.deliverable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isDetectingLocation
                      ? 'Locating...'
                      : !userLocation.isAutoDetected
                      ? 'Detect GPS'
                      : userLocation.deliverable
                      ? `${userLocation.distance_km}km`
                      : 'Out'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-[11px] font-black text-gray-900 leading-tight">
                  <span className="truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[130px]">
                    {isDetectingLocation
                      ? 'Detecting...'
                      : !userLocation.isAutoDetected
                      ? '📍 Auto-Detect Location'
                      : (userLocation.label || userLocation.addressText || 'Khair')}
                  </span>
                  <ChevronDown className="w-3 h-3 text-brand-600 shrink-0" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Location Deliverability Trigger (Desktop) */}
        {!adminMode && (
          <button
            type="button"
            onClick={() => {
              if (!userLocation.isAutoDetected) {
                autoFetchCustomerLocation({ silent: false });
              } else {
                setIsLocationModalOpen(true);
              }
            }}
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 hover:border-brand-300 transition-all text-left max-w-xs group cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isDetectingLocation
                ? 'bg-amber-100 text-amber-700 animate-spin'
                : !userLocation.isAutoDetected
                ? 'bg-orange-100 text-orange-700 animate-pulse'
                : userLocation.deliverable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <span className="truncate">
                  {isDetectingLocation
                    ? 'Detecting GPS...'
                    : !userLocation.isAutoDetected
                    ? '📍 Auto-Detect Location'
                    : (userLocation.label || 'Delivery Location')}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isDetectingLocation
                    ? 'bg-amber-100 text-amber-800'
                    : !userLocation.isAutoDetected
                    ? 'bg-orange-100 text-orange-800'
                    : userLocation.deliverable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isDetectingLocation ? '⏳' : !userLocation.isAutoDetected ? 'Tap to Detect' : userLocation.deliverable ? `${userLocation.distance_km} km` : 'Out of Zone'}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700 transition-colors" />
              </div>
              <p className="text-[11px] text-gray-500 truncate max-w-[170px]">
                {isDetectingLocation
                  ? 'Fetching live GPS location...'
                  : !userLocation.isAutoDetected
                  ? 'Click to auto-fetch your live address'
                  : (userLocation.addressText || 'Select your delivery address')}
              </p>
            </div>
          </button>
        )}

        {/* Search Bar (Desktop) */}
        {!adminMode && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search atta, milk, pizza, tomato, shampoo..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100/90 hover:bg-gray-100 focus:bg-white text-xs sm:text-sm rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Actions: Stamp Offer, Offer Zone, Login, Cart */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Stamp Loyalty Offer Button */}
          {!adminMode && (
            <button
              type="button"
              onClick={openCustomerStampCard}
              className="flex items-center gap-1 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-black text-[11px] sm:text-xs shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              title="Stamp Loyalty Offer: Order ₹250+ = 1 Stamp • 10 Stamps = Free Surprise Gift!"
            >
              <span className="text-xs sm:text-sm">🎖️</span>
              <span className="hidden md:inline font-bold">Stamps</span>
              <span className="bg-amber-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none">
                {activeStamps}/10
              </span>
            </button>
          )}

          {/* Offer Zone Button */}
          {!adminMode && (
            <button
              type="button"
              onClick={() => {
                setOfferZoneInitialFilter('all');
                setIsOfferZoneOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[11px] sm:text-xs shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              title="Browse Live Offers, Coupons & Discounts"
            >
              <Flame className="w-3.5 h-3.5 animate-pulse text-amber-200 shrink-0" />
              <span className="hidden xs:inline">Offers</span>
              {activeDealsCount > 0 && (
                <span className="bg-white/25 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none">
                  {activeDealsCount}
                </span>
              )}
            </button>
          )}

          {/* Wallet Balance Pill */}
          {!adminMode && customerWalletBalance > 0 && (
            <button
              type="button"
              onClick={() => {
                if (setAuthModalInitialTab) setAuthModalInitialTab('wallet');
                setIsAuthModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-black text-[11px] sm:text-xs shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              title="GhartakKart Wallet Balance: Redeem on checkout!"
            >
              <span className="text-xs sm:text-sm">👛</span>
              <span className="text-emerald-700 font-black">₹{customerWalletBalance}</span>
            </button>
          )}

          {customerUser?.isLoggedIn ? (
            <>
              {/* User Profile */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors shrink-0"
              >
                <div className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                  {customerUser?.name ? customerUser.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                </div>
                <span className="hidden lg:inline">{customerUser?.name || 'Account'}</span>
              </button>

              {/* Cart Button - Only visible when customer is logged in */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-black text-xs sm:text-sm shadow-md shadow-brand-600/30 transition-all shrink-0 cursor-pointer"
                title="View Shopping Cart"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">My Cart</span>
                {totalItems > 0 && (
                  <span className="bg-accent-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[17px] text-center border border-white leading-tight shadow-xs">
                    {totalItems}
                  </span>
                )}
                {cartSubtotal > 0 && (
                  <span className="hidden md:inline pl-1 border-l border-brand-400 text-xs font-semibold">
                    ₹{cartSubtotal}
                  </span>
                )}
              </button>
            </>
          ) : (
            /* Sign In / Login Button - No Cart Button shown before login */
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-brand-600/30 transition-all shrink-0 cursor-pointer"
              title="Sign In / Register"
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {!adminMode && (
        <div className="px-4 pb-2.5 md:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search atta, milk, pizza, vegetables..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 text-xs rounded-xl border border-gray-200 focus:bg-white focus:border-brand-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}
    </header>
  );
}

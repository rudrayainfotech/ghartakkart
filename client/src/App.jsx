import React, { useState, useEffect } from 'react';
import { useStore } from './context/StoreContext.jsx';
import { getStoreOperatingStatus } from './utils/haversine.js';
import Navbar from './components/Navbar.jsx';
import CategoryBar from './components/CategoryBar.jsx';
import ProductCard from './components/ProductCard.jsx';
import ProductModal from './components/ProductModal.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import LocationModal from './components/LocationModal.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import OrderTrackerModal from './components/OrderTrackerModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import InvoiceModal from './components/InvoiceModal.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import OfferZoneModal from './components/OfferZoneModal.jsx';
import CategoriesModal from './components/CategoriesModal.jsx';
import PrivacyPolicyModal from './components/PrivacyPolicyModal.jsx';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  Clock,
  HeartHandshake,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Package,
  Flame,
  Gift,
  ChevronRight,
  ArrowUpDown,
  Filter
} from 'lucide-react';

export default function App() {
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedWeightFilter,
    setSelectedWeightFilter,
    selectedPriceFilter,
    setSelectedPriceFilter,
    searchQuery,
    setSearchQuery,
    vegOnlyFilter,
    setVegOnlyFilter,
    sortBy,
    userLocation,
    isDetectingLocation,
    autoFetchCustomerLocation,
    setIsLocationModalOpen,
    activeTrackingOrderId,
    setActiveTrackingOrderId,
    settings,
    loading,
    offers,
    milestoneGifts,
    cartSubtotal,
    deliveryFee,
    baseDeliveryFee,
    freeDeliveryMinOrder,
    isZeroDeliveryFee,
    freeDeliveryShortfall,
    grandTotal,
    setIsCartOpen,
    setIsOfferZoneOpen,
    orders,
    customerUser,
    customerStampStatus,
    openCustomerStampCard,
    storeClosedNotice,
    setStoreClosedNotice,
    setIsPrivacyModalOpen,
    setIsAuthModalOpen
  } = useStore();

  // Auto-popup Login modal for first-time visitors
  useEffect(() => {
    try {
      const hasSeenAutoLogin = sessionStorage.getItem('gk_auto_login_popup_seen');
      if (!hasSeenAutoLogin && (!customerUser || !customerUser.isLoggedIn)) {
        sessionStorage.setItem('gk_auto_login_popup_seen', 'true');
        const timer = setTimeout(() => {
          setIsAuthModalOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [customerUser, setIsAuthModalOpen]);

  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  const storeStatus = getStoreOperatingStatus(settings, nowTick);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

  const [dismissedBanners, setDismissedBanners] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_dismissed_order_banners');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleDismissOrderBanner = (order) => {
    if (!order) return;
    const key = `${order.id}-${order.order_status}`;
    const next = { ...dismissedBanners, [key]: true, [order.id]: order.order_status };
    setDismissedBanners(next);
    try {
      localStorage.setItem('gk_dismissed_order_banners', JSON.stringify(next));
      if (['Cancelled', 'Rejected', 'Delivered'].includes(order.order_status)) {
        const lastId = localStorage.getItem('gk_last_customer_order_id');
        if (lastId === order.id) {
          localStorage.removeItem('gk_last_customer_order_id');
        }
      }
    } catch {}
  };

  // Only match orders strictly belonging to THIS customer / device (never show global orders to visitors)
  const customerPhoneClean = (
    customerUser?.phone ||
    (typeof window !== 'undefined' ? localStorage.getItem('gk_last_customer_phone') : '') ||
    ''
  ).replace(/\D/g, '').slice(-10);

  const lastPlacedOrderId = typeof window !== 'undefined' ? localStorage.getItem('gk_last_customer_order_id') : null;

  const latestCustomerOrder = React.useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) return null;

    if (activeTrackingOrderId) {
      const tracked = orders.find(o => o?.id === activeTrackingOrderId);
      if (tracked) return tracked;
    }

    let candidate = null;
    if (lastPlacedOrderId) {
      candidate = orders.find(o => o?.id === lastPlacedOrderId) || null;
    }

    if (!candidate && customerUser?.isLoggedIn && customerPhoneClean) {
      const byPhone = orders.filter(o => {
        const oPhone = (o?.customer_phone || '').replace(/\D/g, '').slice(-10);
        if (!oPhone || oPhone !== customerPhoneClean) return false;
        const ageHours = (Date.now() - new Date(o.created_at || 0).getTime()) / (1000 * 60 * 60);
        return ageHours <= 12;
      });
      if (byPhone.length > 0) candidate = byPhone[0];
    }

    if (!candidate) return null;

    // Do not show old Cancelled/Rejected orders on homepage load unless cancelled within the last 10 mins
    if (candidate.order_status === 'Cancelled' || candidate.order_status === 'Rejected') {
      const updatedTime = new Date(candidate.updated_at || candidate.created_at || 0).getTime();
      const minsSinceUpdate = (Date.now() - updatedTime) / (1000 * 60);
      if (minsSinceUpdate > 10) {
        return null;
      }
    }

    return candidate;
  }, [orders, customerUser?.isLoggedIn, customerPhoneClean, activeTrackingOrderId, lastPlacedOrderId]);

  const showLiveOrderBanner =
    latestCustomerOrder &&
    latestCustomerOrder.order_status !== 'Delivered' &&
    !dismissedBanners[`${latestCustomerOrder.id}-${latestCustomerOrder.order_status}`] &&
    dismissedBanners[latestCustomerOrder.id] !== latestCustomerOrder.order_status;

  // Helper to check if a unit string matches a weight filter category
  const matchesWeightCategory = (unitStr, filterKey) => {
    if (!filterKey || filterKey === 'all') return true;
    const u = (unitStr || '').toLowerCase().trim();
    const numMatch = u.match(/(\d+(\.\d+)?)/);
    const val = numMatch ? parseFloat(numMatch[1]) : 0;

    if (filterKey === 'liquid') {
      return u.includes('ml') || u.includes('ltr') || u.includes('litre') || u.includes('l');
    }
    if (filterKey === 'small') {
      // Up to 250g / small packs
      return (u.includes('g') && !u.includes('kg') && val > 0 && val <= 250) || u.includes('pc') || u.includes('pack');
    }
    if (filterKey === 'medium') {
      // 300g to 750g
      return u.includes('g') && !u.includes('kg') && val >= 300 && val <= 750;
    }
    if (filterKey === 'large') {
      // 1 kg and above (or >= 800g)
      return u.includes('kg') || (u.includes('g') && val >= 800);
    }
    return true;
  };

  // Helper to check if a price matches a price range filter
  const matchesPriceCategory = (priceVal, filterKey) => {
    if (!filterKey || filterKey === 'all') return true;
    const p = Number(priceVal) || 0;
    if (filterKey === 'under-50') return p <= 50;
    if (filterKey === '50-100') return p > 50 && p <= 100;
    if (filterKey === '100-200') return p > 100 && p <= 200;
    if (filterKey === 'above-200') return p > 200;
    return true;
  };

  // Filter products
  let filteredProducts = products.filter((p) => {
    if (p.active === false) return false;

    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
      return false;
    }

    if (selectedSubcategory !== 'all') {
      const prodSub = (p.subcategory || '').trim().toLowerCase();
      const prodName = (p.name || '').trim().toLowerCase();
      const targetSub = selectedSubcategory.trim().toLowerCase();
      const matchSub = prodSub && (prodSub === targetSub || prodSub.includes(targetSub) || targetSub.includes(prodSub));
      const matchName = prodName.includes(targetSub);
      if (!matchSub && !matchName) {
        return false;
      }
    }

    if (selectedWeightFilter !== 'all') {
      const variantsList = Array.isArray(p.variants) && p.variants.length ? p.variants : [{ unit: p.unit }];
      const anyVariantWeightMatch = variantsList.some(v => matchesWeightCategory(v.unit, selectedWeightFilter));
      if (!anyVariantWeightMatch && !matchesWeightCategory(p.unit, selectedWeightFilter)) {
        return false;
      }
    }

    if (selectedPriceFilter !== 'all') {
      const variantsList = Array.isArray(p.variants) && p.variants.length ? p.variants : [{ price: p.price }];
      const anyVariantPriceMatch = variantsList.some(v => matchesPriceCategory(v.price, selectedPriceFilter));
      if (!anyVariantPriceMatch && !matchesPriceCategory(p.price, selectedPriceFilter)) {
        return false;
      }
    }

    if (vegOnlyFilter && !p.veg_flag) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchBrand = p.brand && p.brand.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchSub = p.subcategory && p.subcategory.toLowerCase().includes(q);
      const matchUnit = p.unit && p.unit.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchDesc && !matchSub && !matchUnit) return false;
    }

    return true;
  });

  // Sorting
  if (sortBy === 'price-low') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'discount') {
    filteredProducts.sort((a, b) => {
      const discA = a.mrp ? (a.mrp - a.price) / a.mrp : 0;
      const discB = b.mrp ? (b.mrp - b.price) / b.mrp : 0;
      return discB - discA;
    });
  }

  // Enforce zero duplicate products by id and name
  const seenProductKeys = new Set();
  filteredProducts = filteredProducts.filter(p => {
    if (!p) return false;
    const key = `${p.id || ''}_${String(p.name || '').trim().toLowerCase()}`;
    if (seenProductKeys.has(key)) return false;
    seenProductKeys.add(key);
    return true;
  });

  // Active category info
  const activeCatObj = categories.find(c => c.id === selectedCategory);

  // Dynamic subcategories available for current selection so customer can check particular aisles
  const availableSubcategories = React.useMemo(() => {
    if (selectedCategory === 'all') return [];
    const catProds = products.filter(p => p.category_id === selectedCategory && p.active !== false);
    const subSet = new Set();
    catProds.forEach(p => {
      const sub = (p.subcategory || '').trim();
      if (sub && sub.length > 1 && sub.toLowerCase() !== 'all') {
        subSet.add(sub);
      }
    });
    if (activeCatObj?.subcategories && Array.isArray(activeCatObj.subcategories)) {
      activeCatObj.subcategories.forEach(s => {
        if (s && s.trim().length > 1) subSet.add(s.trim());
      });
    }
    return Array.from(subSet).slice(0, 20);
  }, [selectedCategory, products, activeCatObj]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar />

      <main className="flex-1 pb-28 md:pb-0">
          {/* Location Deliverability Alert Banner */}
          {!userLocation.deliverable ? (
            <div className="bg-rose-50 border-b border-rose-200 py-2.5 px-4 text-center text-xs text-rose-800 font-semibold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {userLocation.reason || `You are outside our ${settings?.max_radius_km || 10} km delivery radius.`}
              </span>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="underline font-bold text-rose-950 ml-1 hover:text-black cursor-pointer"
              >
                Change Pin on Map
              </button>
            </div>
          ) : !userLocation.isAutoDetected ? (
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white py-2 px-3 sm:px-4 text-center text-xs font-semibold flex flex-wrap items-center justify-center gap-2 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
                <span>
                  {isDetectingLocation
                    ? '📍 Auto-detecting your live location via GPS for doorstep delivery...'
                    : '📍 Allow location access to get accurate doorstep delivery & delivery charges!'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => autoFetchCustomerLocation({ silent: false })}
                  disabled={isDetectingLocation}
                  className="bg-white text-orange-950 hover:bg-orange-50 font-black text-[11px] px-3 py-1 rounded-full shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>{isDetectingLocation ? '⏳ Detecting GPS...' : '📍 Auto-Detect My Location'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="bg-orange-900/40 hover:bg-orange-900/60 text-white font-bold text-[11px] px-2.5 py-1 rounded-full border border-white/30 transition-all cursor-pointer"
                >
                  Pick on Map
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border-b border-emerald-200 py-1.5 px-4 text-center text-xs text-emerald-900 font-medium flex flex-wrap items-center justify-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Delivering to <strong>{userLocation.addressText?.slice(0, 38)}...</strong> ({userLocation.distance_km} km • Min Order: <strong>₹{userLocation.min_order || 150}</strong> • Delivery Fee:{' '}
                {isZeroDeliveryFee ? (
                  <strong className="text-emerald-700 font-black">₹0 (FREE!)</strong>
                ) : (
                  <strong>₹{deliveryFee}</strong>
                )})
              </span>
              {freeDeliveryMinOrder > 0 && (
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs transition-all cursor-pointer"
                >
                  {isZeroDeliveryFee
                    ? `🎉 ₹0 Delivery Unlocked (Order ≥ ₹${freeDeliveryMinOrder})`
                    : cartSubtotal > 0
                    ? `🚚 Add ₹${freeDeliveryShortfall} for ₹0 Delivery (Free ≥ ₹${freeDeliveryMinOrder})`
                    : `🚚 ₹0 Delivery Fee on Orders ₹${freeDeliveryMinOrder}+`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="text-[11px] underline font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                Check Fee Slabs / Change
              </button>
            </div>
          )}

          {/* Store Closed / Operating Hours Alert Banner */}
          {!storeStatus.isOpen && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
              <div className="rounded-2xl p-4 bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm sm:text-base text-rose-950">
                        {storeStatus.title}
                      </span>
                      <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                        Orders Paused
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-rose-800 font-semibold mt-0.5 leading-snug">
                      {storeStatus.message}
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-rose-300 px-3.5 py-2 rounded-xl text-xs font-extrabold text-rose-900 shrink-0 self-start sm:self-center">
                  ⏰ Store Hours: {storeStatus.openFormatted} – {storeStatus.closeFormatted}
                </div>
              </div>
            </div>
          )}

          {/* Real-Time Customer Order Status & Cancellation Alert Banner */}
          {showLiveOrderBanner && (() => {
            const isCancelled = latestCustomerOrder.order_status === 'Cancelled' || latestCustomerOrder.order_status === 'Rejected';
            return (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
                <div
                  className={`rounded-2xl p-3 sm:p-4 border-2 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isCancelled
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-white border-brand-300 text-gray-900'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        isCancelled
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-brand-600 text-white'
                      }`}
                    >
                      {isCancelled ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-xs sm:text-sm">
                          Order #{latestCustomerOrder.id}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            isCancelled
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isCancelled ? '❌ Cancelled by Store' : `Live Status: ${latestCustomerOrder.order_status}`}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 font-medium ${isCancelled ? 'text-rose-800 font-bold' : 'text-gray-600'}`}>
                        {isCancelled
                          ? (latestCustomerOrder.admin_remark || latestCustomerOrder.cancel_reason || 'Your order was cancelled by the store.')
                          : (latestCustomerOrder.admin_remark
                              ? `Store Update: ${latestCustomerOrder.admin_remark}`
                              : `Total: ₹${latestCustomerOrder.total} • ${(latestCustomerOrder.items || []).length} items`)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTrackingOrderId(latestCustomerOrder.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer ${
                        isCancelled
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-brand-600 hover:bg-brand-700 text-white'
                      }`}
                    >
                      {isCancelled ? 'View Order Status' : 'Track Live Order'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissOrderBanner(latestCustomerOrder)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-black/5 text-xs font-bold cursor-pointer"
                      title="Dismiss banner"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Sleek, Aesthetic & Compact Loyalty Stamp & Zero Delivery Fee Banner */}
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 mt-2.5">
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-2.5 sm:p-3.5 text-white shadow-md border border-amber-300/40 relative overflow-hidden space-y-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
                {/* Left: Headline & Key Highlights */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-base sm:text-xl shrink-0 shadow-xs border border-white/30">
                    🎖️
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-yellow-300 text-amber-950 text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                        ⭐ Stamp Rewards
                      </span>
                      <span className="bg-white/20 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-white/25">
                        {customerStampStatus?.activeStamps || 0}/10 Collected
                      </span>
                      {(customerStampStatus?.surpriseGifts || 0) > 0 && (
                        <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                          🎁 {customerStampStatus.surpriseGifts} Free Gift Ready!
                        </span>
                      )}
                    </div>
                    <h2 className="text-xs sm:text-sm font-black tracking-tight text-white leading-tight mt-0.5 truncate">
                      Order ₹250+ = 1 Stamp ⭐ • 10 Stamps = Free Surprise Gift 🎁
                    </h2>
                  </div>
                </div>

                {/* Right: 10-Stamp Micro-Slots & Compact CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-black/20 backdrop-blur-xs px-2 py-1 rounded-xl border border-white/20">
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const activeStamps = customerStampStatus?.activeStamps || 0;
                      const isStamped = idx < activeStamps;
                      const isNextInCart = idx === activeStamps && customerStampStatus?.cartEarnsStamp;
                      const is10th = idx === 9;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={openCustomerStampCard}
                          title={is10th ? '10th Stamp = Free Surprise Gift!' : `Stamp #${idx + 1}`}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-black border transition-all cursor-pointer ${
                            isStamped
                              ? 'bg-white text-amber-700 border-yellow-300 shadow-xs scale-105'
                              : isNextInCart
                              ? 'bg-emerald-500 text-white border-emerald-200 animate-bounce shadow-xs'
                              : is10th
                              ? 'bg-yellow-300/30 border-yellow-200 border-dashed text-yellow-100 animate-pulse'
                              : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                          }`}
                        >
                          {isStamped ? '⭐' : isNextInCart ? '+1' : is10th ? '🎁' : idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={openCustomerStampCard}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-white hover:bg-yellow-50 text-amber-950 font-black text-[11px] sm:text-xs rounded-xl shadow-xs flex items-center justify-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Card</span>
                    <ChevronRight className="w-3 h-3 text-amber-700" />
                  </button>
                </div>
              </div>

              {/* Zero Delivery Fee Micro-Strip & 1% Cashback Promo */}
              <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5 font-bold text-white min-w-0">
                  <span className="bg-emerald-600 text-white font-black text-[8px] sm:text-[9px] uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <Truck className="w-3 h-3" />
                    <span>₹0 Delivery</span>
                  </span>
                  <span className="bg-amber-300 text-amber-950 font-black text-[8px] sm:text-[9px] uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-800" />
                    <span>Shop ₹500+ = 1% Instant Cashback Scratch Card</span>
                  </span>
                  <span className="truncate">
                    {isZeroDeliveryFee
                      ? `🎉 ₹0 Free Delivery Unlocked (${userLocation.distance_km} km)!`
                      : `Free Delivery on orders above ₹${freeDeliveryMinOrder || 499} (${userLocation.distance_km} km)`}
                  </span>
                  {!isZeroDeliveryFee && cartSubtotal > 0 && freeDeliveryShortfall > 0 && (
                    <span className="bg-yellow-300 text-amber-950 font-black px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px]">
                      Add ₹{freeDeliveryShortfall} more
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="text-yellow-200 hover:text-white font-extrabold text-[10px] sm:text-[11px] flex items-center gap-0.5 underline transition-colors cursor-pointer shrink-0"
                >
                  <span>Fee Slabs</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <CategoryBar />
          </div>

          <div id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 scroll-mt-24">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <div key={n} className="bg-gray-200 h-64 rounded-2xl" />
                ))}
              </div>
            ) : selectedCategory === 'all' && !searchQuery.trim() ? (
              /* =========================================================================
                 DEFAULT VIEW: SHOW FEATURED PRODUCTS DOWNWARD BY EVERY CATEGORY
                 ========================================================================= */
              <div className="space-y-10 sm:space-y-12">
                {/* Global Filter Bar for Home View */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      Explore Aisles & Categories
                    </h2>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200 hidden sm:inline">
                      {products.length} Products
                    </span>
                  </div>

                  {/* Right Controls: Pure Veg Toggle & Sort By Dropdown */}
                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    {/* Pure Veg Toggle */}
                    <label className="flex items-center gap-1.5 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs">
                      <span className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-sm flex items-center justify-center p-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                      </span>
                      <span>Pure Veg</span>
                      <input
                        type="checkbox"
                        checked={vegOnlyFilter}
                        onChange={(e) => setVegOnlyFilter(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-7 h-4 rounded-full transition-colors relative ${vegOnlyFilter ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${vegOnlyFilter ? 'left-3.5' : 'left-0.5'}`} />
                      </div>
                    </label>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1 text-xs text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent font-bold focus:outline-none cursor-pointer text-gray-800"
                      >
                        <option value="featured">Featured</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="discount">Biggest Savings</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Iterate through each of the store's 9 categories */}
                {categories.map((cat) => {
                  let catProds = products.filter(p => p && p.active !== false && p.category_id === cat.id);
                  if (vegOnlyFilter) {
                    catProds = catProds.filter(p => p.veg_flag);
                  }
                  if (catProds.length === 0) return null;

                  return (
                    <section key={cat.id} className="space-y-4">
                      {/* Category Shelf Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border border-gray-200/80 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-pink-100 text-[#ff3269] flex items-center justify-center font-black text-base shadow-xs shrink-0">
                              {cat.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                                {cat.name}
                              </h3>
                              <span className="text-[11px] font-extrabold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                {catProds.length} items
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              Fresh & curated {cat.name.toLowerCase()} delivered to your doorstep
                            </p>
                          </div>
                        </div>

                        {/* View All Button for this category */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setSelectedSubcategory('all');
                            setTimeout(() => {
                              const el = document.getElementById('products-section');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 50);
                          }}
                          className="shrink-0 text-xs sm:text-sm font-black text-[#ff3269] hover:text-[#d92255] bg-pink-50 hover:bg-pink-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-pink-200 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs group"
                          title={`View all ${catProds.length} products in ${cat.name}`}
                        >
                          <span>View All ({catProds.length})</span>
                          <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>

                      {/* Featured Products Grid (First 6 items) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                        {catProds.slice(0, 6).map(product => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>

                      {/* Explore more button if category has > 6 items */}
                      {catProds.length > 6 && (
                        <div className="pt-1 text-center sm:text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setSelectedSubcategory('all');
                              setTimeout(() => {
                                const el = document.getElementById('products-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }, 50);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-black text-[#ff3269] hover:underline cursor-pointer"
                          >
                            <span>Explore all {catProds.length} items in {cat.name}</span>
                            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              /* =========================================================================
                 CATEGORY SELECTED / SEARCH VIEW: ALL PRODUCTS FOR THIS CATEGORY IN FULL GRID
                 ========================================================================= */
              <div>
                {/* Active Category Header & Subcategory Aisle Pill Filters */}
                <div className="mb-6 space-y-3.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                          <span>
                            {searchQuery.trim()
                              ? `Search: "${searchQuery}"`
                              : activeCatObj
                              ? activeCatObj.name
                              : 'All Products'}
                          </span>
                          {selectedSubcategory !== 'all' && (
                            <span className="text-[#ff3269] text-base sm:text-lg font-bold">
                              › {selectedSubcategory}
                            </span>
                          )}
                        </h2>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                          {filteredProducts.length} items
                        </span>
                        {(selectedCategory !== 'all' || selectedSubcategory !== 'all' || searchQuery.trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory('all');
                              setSelectedSubcategory('all');
                              setSearchQuery('');
                            }}
                            className="text-xs font-black text-[#ff3269] bg-pink-50 hover:bg-pink-100 px-3 py-1 rounded-full border border-pink-200 flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                            title="Reset to All Categories"
                          >
                            <span>✕ Show All Categories</span>
                          </button>
                        )}
                      </div>
                      {activeCatObj?.max_radius_km && (
                        <p className="text-xs text-accent-600 font-semibold mt-1">
                          ⚠️ Note: Items in this category deliver within a {activeCatObj.max_radius_km} km radius to preserve hot/fresh preparation.
                        </p>
                      )}
                    </div>

                    {/* Right Controls: Pure Veg Toggle & Sort By Dropdown */}
                    <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
                      {/* Pure Veg Toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs">
                        <span className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-sm flex items-center justify-center p-0.5">
                          <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                        </span>
                        <span>Pure Veg</span>
                        <input
                          type="checkbox"
                          checked={vegOnlyFilter}
                          onChange={(e) => setVegOnlyFilter(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-7 h-4 rounded-full transition-colors relative ${vegOnlyFilter ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${vegOnlyFilter ? 'left-3.5' : 'left-0.5'}`} />
                        </div>
                      </label>

                      {/* Sort Dropdown */}
                      <div className="flex items-center gap-1 text-xs text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
                        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="bg-transparent font-bold focus:outline-none cursor-pointer text-gray-800"
                        >
                          <option value="featured">Featured</option>
                          <option value="price-low">Price: Low to High</option>
                          <option value="price-high">Price: High to Low</option>
                          <option value="discount">Biggest Savings</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Subcategories / Aisle Pills when a Category is Selected */}
                  {availableSubcategories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedSubcategory('all')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                          selectedSubcategory === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900'
                        }`}
                      >
                        All {activeCatObj?.name || 'Aisles'}
                      </button>
                      {availableSubcategories.map(sub => {
                        const isSubSelected = selectedSubcategory === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSelectedSubcategory(sub)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                              isSubSelected
                                ? 'bg-[#ff3269] text-white shadow-xs shadow-pink-500/20'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-pink-300 hover:text-[#ff3269]'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-8 h-8" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-base sm:text-lg">
                      {products.length === 0 ? "Store Catalog Updating" : "No matching products"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                      {products.length === 0
                        ? "Our store manager is currently updating and listing fresh items. Please check back soon or browse categories."
                        : "Try adjusting your search keywords, weight/price filters, or select another category."}
                    </p>
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setSelectedSubcategory('all');
                          setSelectedWeightFilter('all');
                          setSelectedPriceFilter('all');
                          setSearchQuery('');
                          setVegOnlyFilter(false);
                        }}
                        className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        Show All Products
                      </button>
                    )}
                  </div>
                ) : (
                  /* FULL GRID WITH ALL PRODUCTS IN THE SELECTED CATEGORY */
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                    {filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <section className="bg-white border-y border-gray-200 py-10 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1.5 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">Superfast Delivery</h4>
                <p className="text-xs text-gray-500 max-w-[200px]">Hyperlocal delivery right to your doorstep in minutes</p>
              </div>
              <div className="space-y-1.5 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">100% Quality Checked</h4>
                <p className="text-xs text-gray-500 max-w-[200px]">Handpicked products inspected for maximum freshness</p>
              </div>
              <div className="space-y-1.5 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">Best Local Prices</h4>
                <p className="text-xs text-gray-500 max-w-[200px]">Save more every day on grocery and essentials</p>
              </div>
              <div className="space-y-1.5 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">Easy Doorstep Support</h4>
                <p className="text-xs text-gray-500 max-w-[200px]">Quick resolution and dedicated local service</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-gray-900 text-gray-400 text-xs py-10 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/logo.jpg" alt="GhartakKart" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-lg font-black text-white">Ghartak<span className="text-accent-500">Kart</span></span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Fresh to Home, Fast to You. Hyperlocal quick-commerce delivering fresh groceries, fast food, vegetables, fruits, and daily essentials.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-3">Store Central Hub & Helpline</h5>
            <p className="text-[11px] text-gray-300">{settings?.store_address}</p>
            <p className="text-[11px] text-gray-400 mt-1">Operating Hours: {settings?.delivery_hours?.open} - {settings?.delivery_hours?.close}</p>
            <p className="text-[11px] text-gray-400 mt-1">Customer WhatsApp / Helpline: +91 7017675784</p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <a
                href={`https://wa.me/917017675784?text=${encodeURIComponent('Hello GhartakKart! I need help with my order.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1ebe57] text-white font-extrabold rounded-xl text-xs shadow-md transition-all"
              >
                <span>💬 WhatsApp (7017675784)</span>
              </a>
            </div>
          </div>

          {/* APTAIC Technology Partner Card with Clickable Link */}
          <a
            href="https://aptaic.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-800/80 hover:bg-gray-800 p-4 rounded-2xl border border-gray-700/80 hover:border-brand-500/50 flex items-center gap-4 transition-all group shadow-md"
            title="Visit APTAIC - Technology Partner (https://aptaic.in/)"
          >
            <img
              src="/aptaic-logo.png"
              alt="APTAIC"
              className="w-14 h-14 rounded-full object-contain shrink-0 bg-white p-1 border border-gray-600 shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="text-[10px] uppercase tracking-widest text-brand-400 font-extrabold flex items-center gap-1">
                Technology Partner <span>↗</span>
              </span>
              <h5 className="text-white font-extrabold text-sm group-hover:text-brand-300 transition-colors">
                Developed by APTAIC
              </h5>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Think Digital. Think APTAIC • aptaic.in
              </p>
            </div>
          </a>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px] text-gray-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span>&copy; {new Date().getFullYear()} GhartakKart Technologies. All rights reserved.</span>
            <span className="hidden sm:inline text-gray-700">•</span>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-gray-400 hover:text-white underline cursor-pointer transition-colors"
            >
              Privacy Policy
            </button>
            <span className="hidden sm:inline text-gray-700">•</span>
            <a
              href="https://aptaic.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-400 hover:text-brand-400 font-medium transition-colors"
              title="Visit APTAIC (https://aptaic.in/)"
            >
              Designed & Developed by <strong className="text-white font-bold hover:underline">APTAIC ↗</strong>
            </a>
          </div>
          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-emerald-400 font-semibold cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>🔒 Privacy Policy</span>
            </button>
            <span>•</span>
            <span>⚡ Hyperlocal 15-25 min delivery in your area</span>
          </div>
        </div>
      </footer>

      <LocationModal />
      <ProductModal />
      <CartDrawer />
      <CheckoutModal />
      <AuthModal />
      <OfferZoneModal />
      <CategoriesModal />
      <PrivacyPolicyModal />

      {activeTrackingOrderId && (
        <OrderTrackerModal
          orderId={activeTrackingOrderId}
          onClose={() => setActiveTrackingOrderId(null)}
          onOpenInvoice={(ord) => setSelectedOrderForInvoice(ord)}
        />
      )}

      {selectedOrderForInvoice && (
        <InvoiceModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {/* Store Closed Popup Modal when Customer Tries to Order Outside Store Timing */}
      {storeClosedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border-2 border-rose-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-9 h-9 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-block bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider">
                Store Closed Now
              </span>
              <h3 className="text-lg sm:text-xl font-black text-gray-900">
                {storeClosedNotice.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                {storeClosedNotice.message}
              </p>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-extrabold text-rose-900">
              ⏰ Operating Hours: {storeClosedNotice.openFormatted} to {storeClosedNotice.closeFormatted}
            </div>
            <button
              type="button"
              onClick={() => setStoreClosedNotice(null)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-sm shadow-md transition-all cursor-pointer"
            >
              OK, I Will Order During Store Hours
            </button>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Customer Support & Order Integration Button (Mob: 7017675784) */}
      <a
        href={`https://wa.me/917017675784?text=${encodeURIComponent(
          latestCustomerOrder
            ? `Hello GhartakKart! I need help regarding my Order #${latestCustomerOrder.id} (${latestCustomerOrder.customer_name || 'Customer'}).`
            : 'Hello GhartakKart! I want to inquire / place an order.'
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with GhartakKart on WhatsApp (+91 7017675784)"
        className="fixed right-3 sm:right-5 bottom-20 md:bottom-6 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] active:scale-95 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full shadow-xl shadow-emerald-600/35 border-2 border-white transition-all group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          fill="currentColor"
          className="w-6 h-6 shrink-0"
        >
          <path d="M16.004 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.257.59 4.46 1.71 6.404L3.2 28.8l6.564-1.693a12.74 12.74 0 0 0 6.24 1.63h.005c7.068 0 12.795-5.73 12.795-12.8 0-3.42-1.332-6.635-3.75-9.053A12.716 12.716 0 0 0 16.004 3.2zm0 23.38h-.004a10.6 10.6 0 0 1-5.404-1.48l-.388-.23-3.895 1.005 1.04-3.797-.252-.402a10.575 10.575 0 0 1-1.625-5.676c0-5.855 4.765-10.62 10.628-10.62 2.838 0 5.506 1.106 7.512 3.114a10.556 10.556 0 0 1 3.11 7.51c0 5.856-4.767 10.62-10.622 10.62zm5.83-7.954c-.32-.16-1.89-.933-2.183-1.04-.293-.106-.506-.16-.72.16-.213.32-.826 1.04-1.013 1.253-.186.213-.373.24-.693.08-.32-.16-1.35-.498-2.572-1.587-.95-.848-1.592-1.895-1.778-2.215-.187-.32-.02-.493.14-.653.144-.143.32-.373.48-.56.16-.186.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.733-.986-2.373-.26-.624-.525-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.666s1.146 3.093 1.306 3.306c.16.213 2.256 3.445 5.465 4.83.764.33 1.36.527 1.825.674.767.244 1.465.21 2.017.127.615-.092 1.89-.773 2.157-1.52.266-.746.266-1.386.186-1.52-.08-.133-.293-.213-.613-.373z" />
        </svg>
        <div className="text-left leading-tight">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 block">
            WhatsApp Support
          </span>
          <span className="text-xs sm:text-sm font-black block">
            Chat Now
          </span>
        </div>
      </a>

      <MobileBottomNav />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  Clock
} from 'lucide-react';
import { formatCurrency, getStoreOperatingStatus } from '../utils/haversine.js';

export default function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQty,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTotalMrp,
    cartTotalSavings,
    deliveryFee,
    baseDeliveryFee,
    freeDeliveryMinOrder,
    isZeroDeliveryFee,
    freeDeliveryShortfall,
    couponDiscount,
    grandTotal,
    appliedCoupon,
    setAppliedCoupon,
    coupons,
    offers,
    userLocation,
    isDetectingLocation,
    autoFetchCustomerLocation,
    setIsLocationModalOpen,
    setIsCheckoutOpen,
    milestoneGifts,
    customerStampStatus,
    settings,
    customerUser,
    setIsAuthModalOpen
  } = useStore();

  useEffect(() => {
    if (isCartOpen && !customerUser?.isLoggedIn) {
      setIsCartOpen(false);
      setIsAuthModalOpen(true);
    }
  }, [isCartOpen, customerUser?.isLoggedIn]);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  if (!isCartOpen || !customerUser?.isLoggedIn) return null;

  const storeStatus = getStoreOperatingStatus(settings);

  const handleApplyCoupon = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;

    setCouponError('');
    setCouponSuccess('');
    try { sessionStorage.removeItem('gk_coupon_manually_removed'); } catch {}

    let appliedSuccessfully = false;
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: cartSubtotal })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.valid) {
          setAppliedCoupon(data);
          setCouponSuccess(`Coupon ${data.code} applied! Saved ₹${data.discount || (data.discount_type === 'free_delivery' ? deliveryFee : 0)}`);
          setCouponInput('');
          appliedSuccessfully = true;
          return;
        } else if (data && data.message) {
          setCouponError(data.message);
          return;
        }
      }
    } catch {}

    // Match from live store offers
    if (!appliedSuccessfully) {
      const match = (offers || []).find(o => o && o.code && o.code.toUpperCase() === code);
      if (!match) {
        setCouponError('Invalid coupon code');
        return;
      }
      if (match.active === false) {
        setCouponError('This coupon is currently paused or inactive');
        return;
      }
      try { sessionStorage.removeItem('gk_coupon_manually_removed'); } catch {}
      const minOrder = Number(match.min_order) || 0;
      if (cartSubtotal < minOrder) {
        setCouponError(`Minimum order value for ${match.code} is ₹${minOrder}`);
        return;
      }

      let discount = 0;
      if (match.discount_type === 'flat') {
        discount = Math.min(cartSubtotal, Number(match.discount_val || match.discount_value || match.discount || 0));
      } else if (match.discount_type === 'percent') {
        const pct = Number(match.discount_val || match.discount_value || 0);
        discount = Math.round((cartSubtotal * pct) / 100);
        if (match.max_discount && discount > match.max_discount) discount = match.max_discount;
      } else if (match.discount_type === 'free_delivery') {
        discount = deliveryFee;
      } else {
        discount = Number(match.discount_val || match.discount || 0);
      }

      const payload = {
        code: match.code,
        discount_type: match.discount_type || 'flat',
        discount_val: Number(match.discount_val || match.discount_value || 0),
        discount,
        description: match.discount_tag || match.description || match.title || `${match.code}`,
        min_order: minOrder
      };

      setAppliedCoupon(payload);
      setCouponSuccess(`Coupon ${match.code} applied! Saved ₹${discount}`);
      setCouponInput('');
    }
  };

  const handleRemoveCoupon = () => {
    try { sessionStorage.setItem('gk_coupon_manually_removed', 'true'); } catch {}
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
  };

  // Deliverability validations
  const isOutOfZone = !userLocation.deliverable;
  const minOrderRequired = userLocation.min_order || 0;
  const meetsMinOrder = cartSubtotal >= minOrderRequired;
  const shortfall = Math.max(0, minOrderRequired - cartSubtotal);

  const canCheckout = cart.length > 0 && !isOutOfZone && meetsMinOrder;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 w-full sm:w-auto">
        <div className="w-full sm:w-[420px] bg-white shadow-2xl flex flex-col h-full">
          {/* Cart Header */}
          <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-gray-900">Your Basket</h2>
                <p className="text-xs text-gray-500">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Delivery Location Strip */}
          <div className="px-4 py-2.5 bg-gray-100/80 border-b border-gray-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isDetectingLocation
                  ? 'bg-amber-500 animate-spin'
                  : !userLocation.isAutoDetected
                  ? 'bg-orange-500 animate-pulse'
                  : userLocation.deliverable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
              }`} />
              <span className="text-gray-600 truncate">
                Deliver to: <strong className="text-gray-900">{isDetectingLocation ? 'Detecting your GPS location...' : (!userLocation.isAutoDetected ? 'Location not verified yet' : (userLocation.addressText || 'Select Address'))}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!userLocation.isAutoDetected && (
                <button
                  type="button"
                  onClick={() => autoFetchCustomerLocation({ silent: false })}
                  disabled={isDetectingLocation}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-black px-2 py-0.5 rounded-lg text-[10px] shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>{isDetectingLocation ? '⏳' : '📍 Auto-Detect'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setIsLocationModalOpen(true);
                }}
                className="text-brand-700 font-bold hover:underline text-xs cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          {/* Out of zone warning banner */}
          {isOutOfZone && (
            <div className="bg-rose-50 border-b border-rose-200 p-3 flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cannot deliver to this location</p>
                <p className="text-rose-700 mt-0.5 leading-snug">{userLocation.reason}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsLocationModalOpen(true);
                  }}
                  className="text-brand-700 font-bold underline mt-1 block"
                >
                  Select a location within 10 km
                </button>
              </div>
            </div>
          )}

          {/* Minimum order warning banner */}
          {!isOutOfZone && !meetsMinOrder && cart.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Minimum Order Required: ₹{minOrderRequired}</p>
                <p className="text-amber-800 mt-0.5">
                  Add items worth <span className="font-bold text-amber-950">₹{shortfall}</span> more to deliver to your zone ({userLocation.distance_km} km).
                </p>
              </div>
            </div>
          )}

          {/* Zero Delivery Fee (₹0 Delivery) Progress Banner */}
          {!isOutOfZone && freeDeliveryMinOrder > 0 && (
            <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border-b border-sky-200 px-4 py-2.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-sky-950 flex items-center gap-1.5">
                  <span>🚚</span>
                  {isZeroDeliveryFee ? (
                    <span className="text-emerald-700 font-black">
                      ZERO (₹0) Delivery Fee Unlocked! (Saved ₹{baseDeliveryFee})
                    </span>
                  ) : cart.length > 0 ? (
                    <span>
                      Add <strong>₹{freeDeliveryShortfall}</strong> more for <strong>₹0 FREE Delivery!</strong>
                    </span>
                  ) : (
                    <span>
                      Min Order for <strong>₹0 FREE Delivery</strong>: <strong>₹{freeDeliveryMinOrder}+</strong>
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  isZeroDeliveryFee ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
                }`}>
                  {isZeroDeliveryFee ? '₹0 Fee ✓' : `Free ≥ ₹${freeDeliveryMinOrder}`}
                </span>
              </div>
              {cart.length > 0 && (
                <div className="w-full h-1.5 bg-sky-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isZeroDeliveryFee ? 'bg-emerald-500' : 'bg-sky-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((cartSubtotal / freeDeliveryMinOrder) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Free Milestone Gift Progress Banner (149, 249, 349+) */}
          {cart.length > 0 && (() => {
            const activeMilestones = (milestoneGifts || [])
              .filter(m => m && m.active !== false)
              .sort((a, b) => (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0));
            if (activeMilestones.length === 0) return null;

            const unlockedList = activeMilestones.filter(m => cartSubtotal >= (Number(m.min_amount) || 0));
            const highestUnlocked = unlockedList.length > 0 ? unlockedList[unlockedList.length - 1] : null;
            const nextLocked = activeMilestones.find(m => cartSubtotal < (Number(m.min_amount) || 0));

            return (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <span>🎁</span>
                    {highestUnlocked ? (
                      <span>₹{highestUnlocked.min_amount}+ Free Gift Unlocked!</span>
                    ) : (
                      <span>Add ₹{Math.max(1, (Number(nextLocked?.min_amount) || 149) - cartSubtotal)} for FREE Gift!</span>
                    )}
                  </span>
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    {highestUnlocked ? 'Choose 1 of 3 at Checkout' : `₹${cartSubtotal} / ₹${nextLocked?.min_amount}`}
                  </span>
                </div>
                {highestUnlocked && nextLocked && (
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Add <strong>₹{Math.max(1, (Number(nextLocked.min_amount) || 0) - cartSubtotal)}</strong> more to upgrade to the <strong>₹{nextLocked.min_amount}+ Super Free Gift</strong>!
                  </p>
                )}
              </div>
            );
          })()}

          {/* Loyalty Stamp Offer Progress Banner (Order >= ₹250 = 1 Stamp ⭐, 10 Stamps = Free Gift 🎁) */}
          {cart.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                <span>🎖️</span>
                {grandTotal >= 250 ? (
                  <span>+1 Loyalty Stamp ⭐ Unlocked! ({customerStampStatus?.activeStamps || 0}/10 → {(customerStampStatus?.activeStamps || 0) + 1}/10)</span>
                ) : (
                  <span>Add ₹{Math.max(1, 250 - grandTotal).toFixed(0)} more to get +1 Stamp ⭐ (10⭐ = Free Gift 🎁)</span>
                )}
              </div>
              <span className="text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full shrink-0">
                {customerStampStatus?.activeStamps || 0}/10 ⭐
              </span>
            </div>
          )}

          {/* Cashback Scratch Card Banner (Controlled by Admin settings) */}
          {cart.length > 0 && settings?.cashback_active !== false && (() => {
            const minOrderCb = Number(settings?.cashback_min_order ?? 500);
            const cbPct = Number(settings?.cashback_percentage ?? 1);
            const isUnlocked = grandTotal >= minOrderCb;
            const cbAmt = isUnlocked ? Math.max(1, Math.round(grandTotal * (cbPct / 100))) : 0;
            return (
              <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-emerald-50 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                  <span>🪙</span>
                  {isUnlocked ? (
                    <span className="text-emerald-800">
                      🎉 {cbPct}% Instant Cashback Scratch Card Unlocked (₹{cbAmt} into Wallet)!
                    </span>
                  ) : (
                    <span>
                      Shop ₹{Math.max(1, minOrderCb - grandTotal).toFixed(0)} more for <strong className="text-emerald-700">{cbPct}% Instant Cashback Scratch Card</strong>!
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                  isUnlocked ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {isUnlocked ? 'UNLOCKED' : `₹${grandTotal.toFixed(0)}/₹${minOrderCb}`}
                </span>
              </div>
            );
          })()}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Your basket is empty</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Browse our categories to add fresh staples, fast food, vegetables, and daily essentials.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product_id}
                  className="bg-white p-3 rounded-2xl border border-gray-200 hover:border-gray-300 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80'}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-gray-500">{item.unit}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-xs text-gray-900">
                          ₹{item.price * item.qty}
                        </span>
                        {item.qty > 1 && (
                          <span className="text-[10px] text-gray-400">
                            (₹{item.price} each)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-gray-100 rounded-xl p-0.5 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.product_id, item.qty - 1)}
                      className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-bold text-gray-800 min-w-[20px] text-center">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.product_id, item.qty + 1)}
                      className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Coupon Code Section */}
          {cart.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (e.g. GHARTAK50)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  className="px-3 py-1.5 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black transition-colors"
                >
                  Apply
                </button>
              </div>

              {/* Quick coupons preview - ONLY live promo offers with codes */}
              {!appliedCoupon && (offers || []).filter(o => o && o.code && o.active !== false).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(offers || [])
                    .filter(o => o && o.code && o.active !== false)
                    .map(op => (
                      <button
                        key={op.id || op.code}
                        type="button"
                        onClick={() => handleApplyCoupon(op.code)}
                        className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{op.code}</span>
                        {Number(op.min_order) > 0 && (
                          <span className="font-normal opacity-80">(₹{op.min_order}+)</span>
                        )}
                      </button>
                    ))}
                </div>
              )}

              {appliedCoupon && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2.5 py-1.5 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      <strong>{appliedCoupon.code}</strong> applied ({appliedCoupon.description})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>
              )}
            </div>
          )}

          {/* Bill Summary & Checkout Button */}
          {cart.length > 0 && (
            <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] bg-white border-t border-gray-200 space-y-3">
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Total MRP</span>
                  <span className="font-bold text-gray-900">₹{cartTotalMrp}</span>
                </div>
                {cartTotalSavings > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>MRP Discount</span>
                    <span>-₹{cartTotalSavings}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-gray-700">₹{cartSubtotal}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Coupon Discount {appliedCoupon?.code ? `(${appliedCoupon.code})` : ''}</span>
                    <span>-₹{couponDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>
                    Delivery Partner Fee ({userLocation.distance_km} km)
                    {!isZeroDeliveryFee && freeDeliveryMinOrder > 0 && (
                      <span className="text-[10px] text-emerald-700 font-bold ml-1">
                        (₹0 on ₹{freeDeliveryMinOrder}+)
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {deliveryFee === 0 ? (
                      <span>
                        {baseDeliveryFee > 0 && <s className="text-gray-400 mr-1">₹{baseDeliveryFee}</s>}
                        <span className="text-emerald-600 font-black">₹0 FREE</span>
                      </span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-extrabold text-gray-900">
                  <span className="uppercase text-xs font-black tracking-wide">Need to be Paid</span>
                  <span className="text-base text-brand-700">₹{grandTotal}</span>
                </div>
              </div>

              {!storeStatus.isOpen && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
                  <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-rose-900">{storeStatus.title}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-snug">{storeStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Checkout Trigger */}
              <button
                type="button"
                disabled={!canCheckout || !storeStatus.isOpen}
                onClick={() => {
                  if (!storeStatus.isOpen) return;
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
                className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-between text-xs sm:text-sm"
              >
                {!storeStatus.isOpen ? (
                  <span className="w-full text-center">
                    ⏰ Store Closed — Orders Only {storeStatus.openFormatted} – {storeStatus.closeFormatted}
                  </span>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <div className="flex items-center gap-1.5">
                      <span>₹{grandTotal}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

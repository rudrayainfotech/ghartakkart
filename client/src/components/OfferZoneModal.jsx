import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import {
  X,
  Flame,
  Tag,
  Copy,
  Check,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Percent,
  Clock,
  ArrowRight,
  Gift,
  Award
} from 'lucide-react';

export default function OfferZoneModal() {
  const {
    offers,
    milestoneGifts,
    isOfferZoneOpen,
    setIsOfferZoneOpen,
    offerZoneInitialFilter,
    setOfferZoneInitialFilter,
    appliedCoupon,
    setAppliedCoupon,
    cartSubtotal,
    grandTotal,
    setSelectedCategory,
    categories,
    setIsCartOpen,
    customerStampStatus
  } = useStore();

  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedOfferFilter, setSelectedOfferFilter] = useState('all');

  useEffect(() => {
    if (isOfferZoneOpen && offerZoneInitialFilter) {
      setSelectedOfferFilter(offerZoneInitialFilter);
    }
  }, [isOfferZoneOpen, offerZoneInitialFilter]);

  if (!isOfferZoneOpen) return null;

  const activeStamps = customerStampStatus?.activeStamps || 0;
  const surpriseGifts = customerStampStatus?.surpriseGifts || 0;
  const stampsRemaining = customerStampStatus?.stampsRemaining ?? 10;
  const cartEarnsStamp = customerStampStatus?.cartEarnsStamp || false;
  const cartShortfallForStamp = customerStampStatus?.cartShortfallForStamp ?? 250;

  // Filter only active / live offers
  const activeOffers = (offers || []).filter(o => o.active !== false);
  const activeMilestones = (milestoneGifts || [])
    .filter(m => m && m.active !== false)
    .sort((a, b) => (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0));

  const filteredOffers = activeOffers.filter(o => {
    if (selectedOfferFilter === 'all') return true;
    return o.category_id === selectedOfferFilter;
  });

  const handleCopyAndApply = (offer) => {
    if (!offer.code) return;
    try { sessionStorage.removeItem('gk_coupon_manually_removed'); } catch {}
    if (navigator.clipboard) {
      navigator.clipboard.writeText(offer.code);
    }
    setCopiedCode(offer.code);
    setTimeout(() => setCopiedCode(null), 3000);

    let discountAmt = 0;
    if (offer.discount_type === 'flat') {
      discountAmt = Math.min(cartSubtotal, Number(offer.discount_val || 0));
    } else if (offer.discount_type === 'percent') {
      const pct = Number(offer.discount_val || 0);
      const computed = Math.round((cartSubtotal * pct) / 100);
      const maxD = Number(offer.max_discount) || 999999;
      discountAmt = Math.min(cartSubtotal, Math.min(computed, maxD));
    } else {
      discountAmt = Number(offer.discount_val || 0);
    }

    // Apply coupon in store context
    setAppliedCoupon({
      code: offer.code,
      discount_type: offer.discount_type || 'flat',
      discount_val: offer.discount_val || 50,
      discount: discountAmt,
      description: offer.discount_tag || offer.title || `${offer.code}`,
      min_order: offer.min_order || 0
    });
  };

  const handleShopNow = (offer) => {
    if (offer && offer.category_id && offer.category_id !== 'all') {
      setSelectedCategory(offer.category_id);
    } else {
      setSelectedCategory('all');
    }
    setOfferZoneInitialFilter('all');
    setIsOfferZoneOpen(false);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Flame className="w-6 h-6 animate-pulse text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl tracking-tight">Offer Zone 🔥</h3>
                <span className="bg-white/25 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {activeOffers.length + activeMilestones.length} Live Deals
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                10-Stamp Surprise Gift Offer, Free Milestone Gifts, Coupon Codes & Special Discounts!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOfferZoneInitialFilter('all');
              setIsOfferZoneOpen(false);
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-bold text-gray-500 shrink-0">Filter:</span>
          <button
            type="button"
            onClick={() => setSelectedOfferFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedOfferFilter === 'all'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            All Offers ({activeOffers.length + activeMilestones.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedOfferFilter('stamp_offer')}
            className={`px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedOfferFilter === 'stamp_offer'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            <span>🎖️ Stamp Offer ({activeStamps}/10 ⭐)</span>
          </button>
          {activeMilestones.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedOfferFilter('milestone_gifts')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedOfferFilter === 'milestone_gifts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>🎁 Free Milestone Gifts ({activeMilestones.length})</span>
            </button>
          )}
          {categories.map(cat => {
            const count = activeOffers.filter(o => o.category_id === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedOfferFilter(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedOfferFilter === cat.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Offers Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ============================================================== */}
          {/* HIGHLIGHTED STAMP LOYALTY OFFER CARD (₹250+ = 1 Stamp, 10 = Gift) */}
          {/* ============================================================== */}
          {(selectedOfferFilter === 'all' || selectedOfferFilter === 'stamp_offer') && (
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 p-4 sm:p-5 text-white shadow-xl border-2 border-amber-300 relative overflow-hidden space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/20 pb-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white text-amber-600 flex items-center justify-center shadow-lg shrink-0 font-black text-xl">
                    🎖️
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-yellow-300 text-amber-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                        ⭐ Highlight Loyalty Offer
                      </span>
                      <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                        {stampsRemaining} Stamps to Free Surprise Gift 🎁
                      </span>
                    </div>
                    <h4 className="font-black text-base sm:text-lg text-white mt-1">
                      Order ₹250+ = 1 Stamp ⭐ • Collect 10 Stamps = FREE Surprise Gift 🎁
                    </h4>
                    <p className="text-xs text-amber-100 font-medium mt-0.5">
                      Every order of ₹250 or above automatically earns 1 Loyalty Stamp! Complete 10 stamps to get a special Surprise Gift delivered free to your home.
                    </p>
                  </div>
                </div>
              </div>

              {/* 10-Stamp Visual Slots */}
              <div className="bg-black/15 backdrop-blur-xs rounded-2xl p-3 border border-white/20 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="text-amber-100">Your Live Stamp Card Progress:</span>
                  <span className="bg-white text-amber-800 px-2.5 py-0.5 rounded-full font-black text-xs shadow-xs">
                    {activeStamps} / 10 Stamps {surpriseGifts > 0 ? `• 🎁 ${surpriseGifts} Gift Earned!` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const isStamped = idx < activeStamps;
                    const isNextInCart = idx === activeStamps && cartEarnsStamp;
                    const is10th = idx === 9;
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                          isStamped
                            ? 'bg-white text-amber-700 border-yellow-300 scale-105 shadow-md font-black'
                            : isNextInCart
                            ? 'bg-emerald-500 text-white border-emerald-200 animate-bounce shadow-md font-black'
                            : is10th
                            ? 'bg-amber-900/50 border-yellow-300 border-dashed text-yellow-200 animate-pulse'
                            : 'bg-white/10 border-white/25 text-white/75'
                        }`}
                      >
                        {isStamped ? (
                          <span className="text-sm sm:text-base">⭐</span>
                        ) : isNextInCart ? (
                          <span className="text-[10px] font-black leading-none text-center">+1 ⭐<br/>Cart</span>
                        ) : is10th ? (
                          <span className="text-xs sm:text-sm font-black">🎁</span>
                        ) : (
                          <span className="text-xs font-black">{idx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Status & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  {cartEarnsStamp ? (
                    <span className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black shadow-sm">
                      🎉 Awesome! Your current cart (₹{grandTotal}) unlocks +1 Stamp ⭐!
                    </span>
                  ) : (
                    <span className="bg-white/15 border border-white/25 px-3 py-1.5 rounded-xl text-amber-50">
                      💡 Add <strong>₹{cartShortfallForStamp.toFixed(0)}</strong> more to your cart to unlock <strong>+1 Stamp ⭐</strong> on this order!
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (cartEarnsStamp) {
                      setIsOfferZoneOpen(false);
                      setIsCartOpen(true);
                    } else {
                      handleShopNow(null);
                    }
                  }}
                  className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-900 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <span>{cartEarnsStamp ? 'Checkout & Claim +1 Stamp' : 'Shop ₹250+ to Earn Stamp'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MILESTONE FREE GIFTS SECTION (149, 249, 349+ -> 3 Item Options) */}
          {/* ============================================================== */}
          {(selectedOfferFilter === 'all' || selectedOfferFilter === 'milestone_gifts') && activeMilestones.length > 0 && (
            <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm sm:text-base text-gray-900">
                        🎁 Free Gift on Order Milestones
                      </h4>
                      <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        Choose 1 of 3 Free Items
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Order ₹{activeMilestones.map(m => m.min_amount).join(', ₹')} or more & choose your favorite FREE Grocery, Vegetable, or Fast Food gift on the Checkout page!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {activeMilestones.map((tier) => {
                  const isUnlocked = cartSubtotal >= (Number(tier.min_amount) || 0);
                  const diff = Math.max(0, (Number(tier.min_amount) || 0) - cartSubtotal);
                  return (
                    <div
                      key={tier.id}
                      className={`rounded-2xl border p-3.5 transition-all space-y-3 ${
                        isUnlocked
                          ? 'bg-white border-emerald-400 shadow-sm ring-2 ring-emerald-500/15'
                          : 'bg-white/90 border-gray-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs">
                            Orders ₹{tier.min_amount}+
                          </span>
                          <div>
                            <h5 className="font-extrabold text-xs sm:text-sm text-gray-900">{tier.title}</h5>
                            {tier.subtitle && (
                              <p className="text-[11px] text-gray-500">{tier.subtitle}</p>
                            )}
                          </div>
                        </div>

                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsOfferZoneOpen(false);
                              setIsCartOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1"
                          >
                            <span>🎉 Unlocked! Pick at Checkout</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                            Add ₹{diff} more to unlock
                          </span>
                        )}
                      </div>

                      {/* 3 Item Options Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {(tier.items || []).slice(0, 3).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="flex sm:flex-col items-center sm:items-stretch gap-2.5 p-2 rounded-xl border border-gray-100 bg-gray-50/70"
                          >
                            <div className="relative w-14 h-14 sm:w-full sm:h-24 rounded-lg overflow-hidden bg-white shrink-0">
                              <img
                                src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                                }}
                              />
                              <span className="absolute top-1 left-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {item.category || 'Gift'}
                              </span>
                              <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                                Option {idx + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-gray-900 line-clamp-1">{item.name}</p>
                              <div className="flex items-center justify-between text-[10px] mt-0.5">
                                <span className="text-gray-500 font-medium">{item.unit}</span>
                                <span className="font-black text-emerald-700">
                                  {Number(item.worth) > 0 ? <><s className="text-gray-400 mr-1">₹{item.worth}</s>FREE</> : 'FREE'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedOfferFilter !== 'milestone_gifts' && selectedOfferFilter !== 'stamp_offer' && (
            filteredOffers.length === 0 ? (
              (selectedOfferFilter !== 'all' || activeMilestones.length === 0) ? (
                <div className="p-12 text-center">
                  <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="font-extrabold text-base text-gray-800">No active offers right now</h4>
                  <p className="text-xs text-gray-500 mt-1">Check back soon for new flash sales and discounts!</p>
                </div>
              ) : null
            ) : (
            filteredOffers.map(offer => {
              const isApplied = appliedCoupon?.code === offer.code;
              const isCopied = copiedCode === offer.code;

              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row group"
                >
                  {/* Offer Image */}
                  <div className="sm:w-2/5 h-44 sm:h-auto relative overflow-hidden bg-gray-100 shrink-0">
                    <img
                      src={offer.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
                    {offer.discount_tag && (
                      <div className="absolute top-3 left-3 bg-red-600 text-white font-black text-xs uppercase px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-300" />
                        <span>{offer.discount_tag}</span>
                      </div>
                    )}
                  </div>

                  {/* Offer Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-black text-base text-gray-900 group-hover:text-amber-600 transition-colors">
                            {offer.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {offer.subtitle}
                          </p>
                        </div>
                      </div>

                      {offer.min_order > 0 && (
                        <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                          <span>• Applicable on orders above ₹{offer.min_order}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Strip: Code Card & Shop Button */}
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      {offer.code ? (
                        <div className="flex items-center gap-2">
                          <div className="border border-dashed border-amber-400 bg-amber-50/70 rounded-xl px-3 py-1.5 flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-amber-700" />
                            <span className="font-mono font-black text-xs text-amber-900 tracking-wider">
                              {offer.code}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyAndApply(offer)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                              isCopied || isApplied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-900 hover:bg-black text-white'
                            }`}
                          >
                            {isCopied || isApplied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{isApplied ? 'Applied ✓' : 'Copied & Applied!'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy & Apply</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          Auto-Applied Deal
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleShopNow(offer)}
                        className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-black rounded-xl flex items-center gap-1 transition-all"
                      >
                        <span>Shop Items</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ))}
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center text-[11px] text-gray-500 shrink-0 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Offers update in real-time by GhartakKart Store Manager. Happy Shopping!</span>
        </div>
      </div>
    </div>
  );
}

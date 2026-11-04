import React from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { Home, Grid, ShoppingBag, User, Flame } from 'lucide-react';

export default function MobileBottomNav() {
  const {
    adminMode,
    cart,
    cartSubtotal,
    freeDeliveryMinOrder,
    isZeroDeliveryFee,
    freeDeliveryShortfall,
    setIsCartOpen,
    setIsAuthModalOpen,
    selectedCategory,
    setSelectedCategory,
    setSelectedSubcategory,
    isCategoriesModalOpen,
    setIsCategoriesModalOpen,
    isOfferZoneOpen,
    setIsOfferZoneOpen,
    offers,
    milestoneGifts,
    customerUser
  } = useStore();

  if (adminMode) return null;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const activeOffersCount =
    (offers || []).filter(o => o && o.active !== false).length +
    (milestoneGifts || []).filter(m => m && m.active !== false).length;

  const isHomeActive = selectedCategory === 'all' && !isCategoriesModalOpen && !isOfferZoneOpen;
  const isCategoriesActive = isCategoriesModalOpen || (selectedCategory !== 'all' && !isOfferZoneOpen);
  const isOffersActive = isOfferZoneOpen;

  const handleHomeClick = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setIsCategoriesModalOpen(false);
    setIsOfferZoneOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoriesClick = () => {
    setIsCategoriesModalOpen(true);
  };

  return (
    <>
      {/* Floating Quick Cart Bar (App-like 1-tap Order Banner) - ONLY WHEN LOGGED IN */}
      {customerUser?.isLoggedIn && cart.length > 0 && (
        <div className="block md:hidden fixed bottom-[calc(3.9rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-3 pb-1 pointer-events-none">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-brand-600 via-brand-700 to-emerald-700 text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between pointer-events-auto border border-emerald-400/40 active:scale-[0.98] transition-transform animate-in fade-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xs shadow-inner">
                🛍️
              </div>
              <div className="text-left">
                <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                  <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                  <span className="text-emerald-300">•</span>
                  <span className="text-white font-extrabold text-sm">₹{cartSubtotal}</span>
                </div>
                <div className="text-[10px] text-emerald-100 font-bold leading-tight">
                  {freeDeliveryMinOrder > 0
                    ? (isZeroDeliveryFee
                        ? `🎉 ₹0 FREE Delivery Unlocked!`
                        : `🚚 Add ₹${freeDeliveryShortfall} for ₹0 Free Delivery`)
                    : 'Tap to view cart & checkout'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white text-brand-700 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md">
              <span>View Cart</span>
              <span className="text-xs">➔</span>
            </div>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className={`grid ${customerUser?.isLoggedIn ? 'grid-cols-5' : 'grid-cols-4'} h-15 items-center px-1 py-1`}>
        {/* Home */}
        <button
          type="button"
          onClick={handleHomeClick}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            isHomeActive ? 'text-brand-600 font-black' : 'text-gray-500 hover:text-brand-600'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'text-brand-600 stroke-[2.5]' : 'text-gray-600'}`} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Categories */}
        <button
          type="button"
          onClick={handleCategoriesClick}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            isCategoriesActive ? 'text-brand-600 font-black' : 'text-gray-500 hover:text-brand-600'
          }`}
        >
          <Grid className={`w-5 h-5 ${isCategoriesActive ? 'text-brand-600 stroke-[2.5]' : 'text-gray-600'}`} />
          <span className="text-[10px] mt-0.5">Categories</span>
        </button>

        {/* Offer Zone */}
        <button
          type="button"
          onClick={() => setIsOfferZoneOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
            isOffersActive ? 'text-orange-600 font-black scale-105' : 'text-amber-600 hover:text-orange-600'
          }`}
        >
          <div className="relative">
            <Flame className="w-5 h-5 text-orange-500 animate-bounce" />
            {activeOffersCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white font-black text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm">
                {activeOffersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black text-orange-600 mt-0.5">Offers 🔥</span>
        </button>

        {/* Cart - ONLY WHEN CUSTOMER IS LOGGED IN */}
        {customerUser?.isLoggedIn && (
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex flex-col items-center justify-center py-1 text-gray-600 hover:text-brand-600 active:scale-95 transition-all"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-accent-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold mt-0.5">Cart</span>
          </button>
        )}

        {/* Account / Sign In */}
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 text-gray-600 hover:text-brand-600 active:scale-95 transition-all"
        >
          <User className="w-5 h-5 text-gray-700" />
          <span className="text-[10px] font-bold mt-0.5">
            {customerUser?.isLoggedIn ? 'Account' : 'Sign In'}
          </span>
        </button>
      </div>
    </nav>
    </>
  );
}

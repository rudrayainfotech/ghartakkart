import React, { useState, useEffect } from 'react';
import { useStore, getCartItemKey } from '../context/StoreContext.jsx';
import { Plus, Minus, Clock, Eye } from 'lucide-react';

export default function ProductCard({ product }) {
  const {
    cart,
    addToCart,
    updateCartQty,
    setSelectedProductForModal,
    selectedWeightFilter,
    selectedPriceFilter,
    customerUser,
    setIsAuthModalOpen
  } = useStore();

  const variants = React.useMemo(() => {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants;
    }
    return [
      {
        id: 'default',
        unit: product.unit || '1 unit',
        price: Number(product.price) || 0,
        mrp: Number(product.mrp) || Number(product.price) || 0,
        purchase_price: Number(product.purchase_price) || 0,
        stock: product.stock !== undefined ? Number(product.stock) : 50
      }
    ];
  }, [product]);

  // Default to the variant matching product.unit, or first variant
  const defaultIdx = React.useMemo(() => {
    const matchIdx = variants.findIndex(
      v => (v.unit || '').trim().toLowerCase() === (product.unit || '').trim().toLowerCase()
    );
    return matchIdx >= 0 ? matchIdx : 0;
  }, [variants, product.unit]);

  const [selectedVarIdx, setSelectedVarIdx] = useState(defaultIdx);

  // Sync selected variant if product or weight/price filter changes
  useEffect(() => {
    if (selectedWeightFilter && selectedWeightFilter !== 'all') {
      const idx = variants.findIndex(v => {
        const u = (v.unit || '').toLowerCase();
        const num = parseFloat((u.match(/(\d+(\.\d+)?)/) || [])[1] || '0');
        if (selectedWeightFilter === 'liquid') return u.includes('ml') || u.includes('ltr');
        if (selectedWeightFilter === 'small') return (u.includes('g') && !u.includes('kg') && num <= 250) || u.includes('pc') || u.includes('pack');
        if (selectedWeightFilter === 'medium') return u.includes('g') && !u.includes('kg') && num >= 300 && num <= 750;
        if (selectedWeightFilter === 'large') return u.includes('kg') || (u.includes('g') && num >= 800);
        return false;
      });
      if (idx >= 0) {
        setSelectedVarIdx(idx);
        return;
      }
    }
    if (selectedPriceFilter && selectedPriceFilter !== 'all') {
      const idx = variants.findIndex(v => {
        const p = Number(v.price) || 0;
        if (selectedPriceFilter === 'under-50') return p <= 50;
        if (selectedPriceFilter === '50-100') return p > 50 && p <= 100;
        if (selectedPriceFilter === '100-200') return p > 100 && p <= 200;
        if (selectedPriceFilter === 'above-200') return p > 200;
        return false;
      });
      if (idx >= 0) {
        setSelectedVarIdx(idx);
        return;
      }
    }
    setSelectedVarIdx(defaultIdx);
  }, [defaultIdx, selectedWeightFilter, selectedPriceFilter, variants]);

  const activeVariant = variants[selectedVarIdx] || variants[0];
  const currentUnit = activeVariant?.unit || product.unit || '1 unit';
  const currentPrice = Number(activeVariant?.price ?? product.price) || 0;
  const currentMrp = Number(activeVariant?.mrp ?? product.mrp ?? currentPrice) || currentPrice;
  const currentStock = Number(activeVariant?.stock ?? product.stock ?? 50);

  const cartKey = getCartItemKey(product.id, currentUnit);
  const cartItem = cart.find(
    item => item.product_id === cartKey || (item.product_id === product.id && item.unit === currentUnit)
  );
  const qtyInCart = cartItem ? cartItem.qty : 0;
  const isOutOfStock = currentStock <= 0;

  const discountPercent = currentMrp > currentPrice
    ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-brand-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      {/* Top Image Container */}
      <div
        className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer"
        onClick={() => setSelectedProductForModal({ ...product, selectedVariantIndex: selectedVarIdx })}
      >
        <img
          src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80';
          }}
        />

        {/* Veg Flag / Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center p-0.5 bg-white shadow-sm ${
            product.veg_flag ? 'border-emerald-600' : 'border-rose-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              product.veg_flag ? 'bg-emerald-600' : 'bg-rose-600'
            }`} />
          </span>

          {discountPercent > 0 && (
            <span className="bg-accent-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Fast food prep time tag */}
        {product.prep_time_mins && (
          <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{product.prep_time_mins} mins</span>
          </div>
        )}

        {/* Multi-Weight Options Badge on Image */}
        {variants.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-brand-700/90 backdrop-blur-md text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
            ⚖️ {variants.length} Weights
          </div>
        )}

        {/* Quick View Button on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedProductForModal({ ...product, selectedVariantIndex: selectedVarIdx });
          }}
          className="absolute top-2 right-2 bg-white/90 backdrop-blur-md hover:bg-white text-gray-700 p-1.5 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Quick View"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Out of Stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-rose-100 text-rose-800 font-extrabold text-xs px-3 py-1 rounded-full border border-rose-300 shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium mb-1 gap-1">
            <span className="truncate">{product.subcategory || product.brand || 'Fresh Produce'}</span>
            <span className="font-extrabold text-brand-800 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded text-[10px] shrink-0">
              {currentUnit}
            </span>
          </div>

          <h3
            onClick={() => setSelectedProductForModal({ ...product, selectedVariantIndex: selectedVarIdx })}
            className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 hover:text-brand-600 transition-colors cursor-pointer min-h-[34px]"
          >
            {product.name}
          </h3>

          {/* Interactive Multi-Weight & Price Selector Pills */}
          {variants.length > 1 && (
            <div className="mt-2 space-y-1">
              <div className="flex flex-wrap gap-1">
                {variants.map((v, idx) => {
                  const isActive = idx === selectedVarIdx;
                  const shortUnit = (v.unit || '')
                    .replace(/Gram/gi, 'g')
                    .replace(/Ltr/gi, 'L')
                    .replace(/\s+/g, '');
                  return (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVarIdx(idx);
                      }}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                      }`}
                    >
                      <span>{shortUnit}</span>
                      <span className={isActive ? 'text-amber-200' : 'text-brand-700'}>₹{v.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Low stock warning */}
          {!isOutOfStock && currentStock <= 5 && (
            <p className="text-[10px] font-semibold text-amber-600 mt-1">
              🔥 Only {currentStock} left in stock
            </p>
          )}
        </div>

        {/* Price & Add to Cart button */}
        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-gray-900">
                ₹{currentPrice}
              </span>
              {currentMrp > currentPrice && (
                <span className="text-[11px] text-gray-400 line-through">
                  ₹{currentMrp}
                </span>
              )}
            </div>
            <span className="text-[9px] text-emerald-600 font-semibold block truncate max-w-[95px]">
              {currentUnit}
            </span>
          </div>

          {/* Cart Stepper / Add Button */}
          {isOutOfStock ? (
            <button
              disabled
              className="text-xs px-2.5 sm:px-3 py-1.5 bg-gray-100 text-gray-400 font-bold rounded-xl cursor-not-allowed"
            >
              Sold Out
            </button>
          ) : !customerUser?.isLoggedIn ? (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center justify-center gap-1 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-300 hover:border-brand-600 px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 min-h-[32px] sm:min-h-[34px] cursor-pointer"
              title="Sign in to add to cart"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD</span>
            </button>
          ) : qtyInCart > 0 ? (
            <div className="flex items-center bg-brand-600 text-white rounded-xl shadow-md overflow-hidden min-h-[32px] sm:min-h-[34px]">
              <button
                type="button"
                onClick={() => updateCartQty(cartItem.product_id, qtyInCart - 1)}
                className="w-7 sm:w-8 h-8 flex items-center justify-center hover:bg-brand-700 active:scale-90 transition-all cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-xs font-black min-w-[18px] sm:min-w-[22px] text-center">
                {qtyInCart}
              </span>
              <button
                type="button"
                onClick={() => updateCartQty(cartItem.product_id, qtyInCart + 1)}
                disabled={qtyInCart >= currentStock}
                className="w-7 sm:w-8 h-8 flex items-center justify-center hover:bg-brand-700 active:scale-90 transition-all disabled:opacity-50 cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToCart(product, 1, activeVariant)}
              className="flex items-center justify-center gap-1 bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-300 hover:border-brand-600 px-3 sm:px-4 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 min-h-[32px] sm:min-h-[34px] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

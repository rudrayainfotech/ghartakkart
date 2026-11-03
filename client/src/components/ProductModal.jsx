import React, { useState, useEffect } from 'react';
import { useStore, getCartItemKey } from '../context/StoreContext.jsx';
import { X, Clock, Plus, Minus, Truck, ChevronLeft, ChevronRight, Scale } from 'lucide-react';

export default function ProductModal() {
  const {
    selectedProductForModal: product,
    setSelectedProductForModal,
    cart,
    addToCart,
    updateCartQty,
    customerUser,
    setIsAuthModalOpen
  } = useStore();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [selectedVarIdx, setSelectedVarIdx] = useState(0);

  const variants = React.useMemo(() => {
    if (!product) return [];
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

  useEffect(() => {
    setActiveImgIndex(0);
    if (product?.selectedVariantIndex !== undefined) {
      setSelectedVarIdx(product.selectedVariantIndex);
    } else if (product) {
      const idx = variants.findIndex(
        v => (v.unit || '').trim().toLowerCase() === (product.unit || '').trim().toLowerCase()
      );
      setSelectedVarIdx(idx >= 0 ? idx : 0);
    }
  }, [product?.id, product?.selectedVariantIndex, variants]);

  if (!product) return null;

  const imagesList = Array.isArray(product.images) && product.images.length
    ? product.images
    : [product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'];

  const currentImg = imagesList[activeImgIndex] || imagesList[0];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {product.subcategory || 'General'}
          </span>
          <button
            onClick={() => setSelectedProductForModal(null)}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Product Image & Thumbnail Gallery */}
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 aspect-square flex items-center justify-center group">
              <img
                src={currentImg || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80';
                }}
              />

              {/* Multi-image Arrows */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex(prev => (prev === 0 ? imagesList.length - 1 : prev - 1));
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md transition-all opacity-80 hover:opacity-100"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex(prev => (prev === imagesList.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md transition-all opacity-80 hover:opacity-100"
                    title="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Veg Badge */}
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1.5 border border-gray-100">
                <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center p-0.5 ${
                  product.veg_flag ? 'border-emerald-600' : 'border-rose-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    product.veg_flag ? 'bg-emerald-600' : 'bg-rose-600'
                  }`} />
                </span>
                <span className="text-[11px] font-bold text-gray-800">
                  {product.veg_flag ? 'Pure Veg' : 'Non-Veg'}
                </span>
              </div>

              {discountPercent > 0 && (
                <span className="absolute top-3 right-3 bg-accent-500 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-md">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Thumbnail Row (when at least 2 images exist) */}
            {imagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      activeImgIndex === idx
                        ? 'border-brand-600 ring-2 ring-brand-500/20 scale-105'
                        : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`thumbnail-${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-brand-600 tracking-wide uppercase">
                {product.brand || 'GhartakKart'}
              </span>
              <h2 className="text-xl font-black text-gray-900 mt-1 leading-snug">
                {product.name}
              </h2>
              <div className="inline-block mt-2 bg-brand-50 border border-brand-200 text-brand-800 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                Selected Weight / Pack: {currentUnit}
              </div>

              {/* Price Row */}
              <div className="mt-3 flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-gray-900">
                  ₹{currentPrice}
                </span>
                {currentMrp > currentPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    ₹{currentMrp}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="text-xs font-bold text-emerald-600">
                    Save ₹{currentMrp - currentPrice}
                  </span>
                )}
              </div>

              {/* Multi-Weight & Price Options Selector */}
              {variants.length > 1 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Scale className="w-3.5 h-3.5 text-brand-600" />
                    <span>Select Weight / Size & Price:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {variants.map((v, idx) => {
                      const isSelected = idx === selectedVarIdx;
                      return (
                        <button
                          key={v.id || idx}
                          type="button"
                          onClick={() => setSelectedVarIdx(idx)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20'
                              : 'border-gray-200 hover:border-brand-300 bg-white'
                          }`}
                        >
                          <div>
                            <span className={`block text-xs font-extrabold ${isSelected ? 'text-brand-900' : 'text-gray-800'}`}>
                              {v.unit}
                            </span>
                            {v.mrp > v.price && (
                              <span className="text-[10px] text-gray-400 line-through">
                                MRP ₹{v.mrp}
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-black ${isSelected ? 'text-brand-700' : 'text-gray-900'}`}>
                            ₹{v.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                {product.description || 'Freshly picked and hygienically handled for top quality delivery.'}
              </p>

              {/* Badges / Compliance */}
              <div className="mt-4 space-y-2 pt-3 border-t border-gray-100 text-xs text-gray-600">
                {product.prep_time_mins && (
                  <div className="flex items-center gap-2 text-amber-700 font-medium">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Kitchen Prep Time: {product.prep_time_mins} mins</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-emerald-700">
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Delivered fresh in clean hygienic packing</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              {isOutOfStock ? (
                <div className="w-full py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-center text-sm">
                  Currently Out of Stock
                </div>
              ) : !customerUser?.isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sign In to Add to Cart</span>
                </button>
              ) : qtyInCart > 0 ? (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-200">
                  <span className="text-xs font-semibold text-gray-700 pl-2">
                    In Cart ({currentUnit}):
                  </span>
                  <div className="flex items-center bg-brand-600 text-white rounded-xl shadow-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateCartQty(cartItem.product_id, qtyInCart - 1)}
                      className="px-3 py-2 hover:bg-brand-700 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-black min-w-[32px] text-center">
                      {qtyInCart}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(cartItem.product_id, qtyInCart + 1)}
                      disabled={qtyInCart >= currentStock}
                      className="px-3 py-2 hover:bg-brand-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(product, 1, activeVariant)}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add {currentUnit} to Cart (₹{currentPrice})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import {
  X,
  Grid,
  Sparkles,
  ChevronRight,
  Search,
  Check,
  Package
} from 'lucide-react';

export default function CategoriesModal() {
  const {
    categories,
    products,
    selectedCategory,
    setSelectedCategory,
    setSelectedSubcategory,
    isCategoriesModalOpen,
    setIsCategoriesModalOpen
  } = useStore();

  const [categorySearch, setCategorySearch] = useState('');

  if (!isCategoriesModalOpen) return null;

  const totalProductsCount = (products || []).length;

  const filteredCategories = (categories || []).filter(cat => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase().trim();
    const matchName = (cat.name || '').toLowerCase().includes(q);
    const matchSub = cat.subcategories && cat.subcategories.some(s => s.toLowerCase().includes(q));
    return matchName || matchSub;
  });

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setIsCategoriesModalOpen(false);

    // Smooth scroll to product feed
    setTimeout(() => {
      const el = document.getElementById('products-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 480, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom duration-200">
        
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#ff3269] flex items-center justify-center shadow-xs shrink-0">
              <Grid className="w-5 h-5 text-[#ff3269]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-gray-900 tracking-tight">
                  Shop by Category
                </h3>
                <span className="bg-pink-50 text-[#ff3269] text-[10px] font-black px-2 py-0.5 rounded-full border border-pink-200">
                  {categories.length} Categories
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Tap any category to explore fresh groceries, veggies & essentials
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCategoriesModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Search Input */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search category (e.g. Vegetables, Grocery, Dairy, Snacks)..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#ff3269] font-medium"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {categorySearch && (
              <button
                type="button"
                onClick={() => setCategorySearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {/* Quick "All Products" Card */}
          <button
            type="button"
            onClick={() => handleSelectCategory('all')}
            className={`w-full p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-pink-50/70 border-[#ff3269] shadow-sm ring-2 ring-pink-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff3269] to-orange-500 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-gray-900">All Categories & Aisles</h4>
                  {selectedCategory === 'all' && (
                    <span className="bg-[#ff3269] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Browse complete catalogue of {totalProductsCount} items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 font-black text-xs shrink-0">
              <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                {totalProductsCount} Items
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>

          {/* Grid of ONLY USER'S Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const catProductCount = (products || []).filter(
                p => p && p.active !== false && p.category_id === cat.id
              ).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`group relative p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'bg-pink-50/70 border-[#ff3269] shadow-sm ring-2 ring-pink-500/20'
                      : 'bg-white border-gray-200 hover:border-pink-300 hover:bg-gray-50/80 shadow-2xs'
                  }`}
                >
                  {/* Category Image Box */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#f4f6fb] p-2 flex items-center justify-center mb-2">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-2xs rounded-xl"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#ff3269] text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Category Details */}
                  <div>
                    <h5 className={`font-black text-xs sm:text-sm leading-tight line-clamp-1 ${
                      isSelected ? 'text-[#ff3269]' : 'text-gray-900 group-hover:text-[#ff3269]'
                    }`}>
                      {cat.name}
                    </h5>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                      <span className="font-semibold text-gray-600">
                        {catProductCount > 0 ? `${catProductCount} items` : 'Explore items'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#ff3269] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-gray-500 space-y-2">
              <Package className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-xs font-bold">No categories match "{categorySearch}"</p>
              <button
                type="button"
                onClick={() => setCategorySearch('')}
                className="text-xs text-[#ff3269] font-bold underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span>⚡ Delivered in 15–25 mins right to your doorstep</span>
          <button
            type="button"
            onClick={() => setIsCategoriesModalOpen(false)}
            className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

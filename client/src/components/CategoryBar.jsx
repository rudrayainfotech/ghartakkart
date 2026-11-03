import React from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { ChevronRight, Sparkles, Layers } from 'lucide-react';

export default function CategoryBar() {
  const {
    categories,
    products,
    selectedCategory,
    setSelectedCategory,
    setSelectedSubcategory,
    setIsCategoriesModalOpen,
    setSearchQuery
  } = useStore();

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
    setSearchQuery('');

    // Smooth scroll down to products section
    setTimeout(() => {
      const el = document.getElementById('products-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 480, behavior: 'smooth' });
      }
    }, 80);
  };

  return (
    <section id="categories-section" className="bg-white py-6 sm:py-8 border-b border-gray-100 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header: Title & Action */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              Shop by Category
            </h2>
            {selectedCategory !== 'all' ? (
              <button
                type="button"
                onClick={() => handleCategorySelect('all')}
                className="text-xs font-black text-[#ff3269] bg-pink-50 hover:bg-pink-100 px-3 py-1 rounded-full border border-pink-200 cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
                title="Reset to All Categories"
              >
                <span>✕ Show All Categories</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full hidden sm:inline">
                {categories.length} Categories
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCategoriesModalOpen(true)}
            className="text-[#ff3269] hover:text-[#e0265b] font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95 group"
            title="View All Categories Grid"
          >
            <span>See All ({categories.length})</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
          </button>
        </div>

        {/* LARGER Category Grid - Responsive Multi-Column / Smooth Touch Carousel */}
        <div className="relative">
          <div className="grid grid-flow-col auto-cols-[124px] sm:auto-cols-[144px] md:auto-cols-[164px] lg:auto-cols-[176px] gap-3.5 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x">
            
            {/* 1. All Categories Large Card */}
            <button
              type="button"
              onClick={() => handleCategorySelect('all')}
              className="flex flex-col items-center group cursor-pointer select-none text-center focus:outline-none snap-start"
            >
              <div
                className={`w-[118px] h-[118px] sm:w-[136px] sm:h-[136px] md:w-[154px] md:h-[154px] lg:w-[166px] lg:h-[166px] rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-center relative transition-all duration-300 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 ring-4 ring-pink-500/20 scale-105'
                    : 'bg-[#f4f6fb] hover:bg-white border-2 border-slate-100/90 hover:border-pink-300 text-slate-800 hover:shadow-md group-hover:scale-105'
                }`}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110 ${
                  selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-pink-100 text-[#ff3269]'
                }`}>
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <span className={`text-[11px] sm:text-xs font-black uppercase tracking-wider mt-2 ${
                  selectedCategory === 'all' ? 'text-white' : 'text-gray-900'
                }`}>
                  All Aisles
                </span>
                <span className={`text-[10px] font-bold ${
                  selectedCategory === 'all' ? 'text-pink-100' : 'text-gray-500'
                }`}>
                  {(products || []).length} items
                </span>
              </div>
              <span className={`text-xs sm:text-sm text-center leading-tight mt-2 line-clamp-1 max-w-[120px] transition-colors ${
                selectedCategory === 'all'
                  ? 'font-black text-[#ff3269]'
                  : 'font-bold text-gray-800 group-hover:text-[#ff3269]'
              }`}>
                All Products
              </span>
            </button>

            {/* 2. ONLY USER'S CATEGORIES (Exact 9 from database & Admin Panel) */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const catProductCount = (products || []).filter(
                p => p && p.active !== false && p.category_id === cat.id
              ).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className="flex flex-col items-center group cursor-pointer select-none text-center focus:outline-none snap-start"
                >
                  {/* Large Square Category Tile */}
                  <div
                    className={`w-[118px] h-[118px] sm:w-[136px] sm:h-[136px] md:w-[154px] md:h-[154px] lg:w-[166px] lg:h-[166px] rounded-3xl p-2.5 sm:p-3.5 flex flex-col items-center justify-between relative transition-all duration-300 ${
                      isSelected
                        ? 'bg-pink-50 border-2 border-[#ff3269] shadow-lg shadow-pink-500/20 ring-4 ring-pink-500/20 scale-105'
                        : 'bg-[#f4f6fb] hover:bg-white border-2 border-slate-100/90 hover:border-pink-300 hover:shadow-md group-hover:scale-105'
                    }`}
                  >
                    {/* Category Image */}
                    <div className="w-full flex-1 flex items-center justify-center p-1 overflow-hidden">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        className="w-full h-full max-h-[85px] sm:max-h-[105px] md:max-h-[118px] object-contain drop-shadow-sm group-hover:scale-108 transition-transform duration-300 rounded-2xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </div>

                    {/* Item Count Pill at Bottom of Card */}
                    <div className="w-full pt-1 flex items-center justify-center">
                      <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-[#ff3269] text-white shadow-2xs'
                          : 'bg-white/90 text-gray-600 border border-slate-200/60 group-hover:bg-pink-50 group-hover:text-pink-600'
                      }`}>
                        {catProductCount > 0 ? `${catProductCount} items` : 'Explore'}
                      </span>
                    </div>
                  </div>

                  {/* Category Name Underneath Tile */}
                  <span
                    className={`text-xs sm:text-sm text-center leading-tight mt-2 line-clamp-2 max-w-[115px] sm:max-w-[135px] transition-colors ${
                      isSelected
                        ? 'font-black text-[#ff3269]'
                        : 'font-bold text-gray-800 group-hover:text-[#ff3269]'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}

          </div>
        </div>

      </div>
    </section>
  );
}

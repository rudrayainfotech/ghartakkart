import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { calculateHaversineDistance, getStoreOperatingStatus } from '../utils/haversine.js';
import { playChime } from '../utils/sound.js';
import { sendOrderNotification } from '../utils/notifications.js';
import { UNIFIED_DEFAULT_PRODUCTS } from '../data/unifiedProducts.js';
import { supabase, isSupabaseConfigured, syncNodeToSupabase, fetchNodeFromSupabase, subscribeStoreKv } from '../supabase.js';

const StoreContext = createContext();

export const FIREBASE_DB_URL = "";

const DEFAULT_SETTINGS = {
  store_name: 'GhartakKart Khair Store',
  store_tagline: 'Fresh to Home, Fast to You.',
  store_address: 'Somna Road, Main Market, Khair, Aligarh, Uttar Pradesh - 202138',
  store_logo: '/logo.jpg',
  support_phone: '+91 7017675784',
  whatsapp_phone: '917017675784',
  support_email: 'support@ghartakkart.com',
  receipt_footer_msg: '*** THANK YOU FOR SHOPPING LOCAL ***',
  upi_id: '9058564391@ptsbi',
  upi_merchant_name: 'GhartakKart Khair Store',
  razorpay_key_id: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_To2EZDjW6D4GZW',
  store_lat: 27.941887,
  store_lng: 77.843715,
  max_radius_km: 10,
  cashback_active: true,
  cashback_percentage: 1,
  cashback_min_order: 500,
  cashback_max_per_order: 50,
  wallet_redemption_active: true,
  wallet_max_use_percent: 100,
  wallet_max_use_amount: 0,
  wallet_min_order_for_use: 0,
  delivery_hours: {
    open: '07:00',
    close: '23:00',
    is_open: true,
    closed_message: 'Store is currently closed for deliveries. Operating hours are 07:00 AM to 11:00 PM.',
    days_open: 'All 7 Days (Mon - Sun)'
  },
  fee_slabs: [
    { min_km: 0, max_km: 2, fee: 20, min_order: 150, free_above: 499 },
    { min_km: 2, max_km: 5, fee: 35, min_order: 250, free_above: 699 },
    { min_km: 5, max_km: 10, fee: 50, min_order: 400, free_above: 999 }
  ],
  vendor_google_sheet_url: 'https://docs.google.com/spreadsheets/d/1UWjAKy9lqLOD_mhzD2KULs_P133WWWZZN8jLlKq8o14/edit?usp=sharing',
  vendor_google_sheet_id: '1UWjAKy9lqLOD_mhzD2KULs_P133WWWZZN8jLlKq8o14',
  vendor_google_sheet_webhook: '',
  msg91_auth_key: '587557TQWDRAWc6aec439fP1',
  msg91_template_id: '6adcb8421850695632091de3',
  msg91_widget_id: '366b65685947363636393032',
  msg91_token_auth: '587557TQWDRAWc6aec439fP1'
};

const DEFAULT_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Groceries',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Atta & Flours', 'Dal & Pulses', 'Rice', 'Oil & Ghee', 'Spices']
  },
  {
    id: 'cat-2',
    name: 'Fresh Vegetables & Fruits',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Daily Vegetables', 'Seasonal Fruits', 'Leafy Greens']
  },
  {
    id: 'cat-3',
    name: 'Dairy Products',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Milk & Curd', 'Paneer & Butter', 'Bread & Buns']
  },
  {
    id: 'cat-4',
    name: 'Snacks & Beverages',
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Cold Drinks', 'Chips & Namkeen', 'Biscuits', 'Chocolates']
  },
  {
    id: 'cat-5',
    name: 'Hot Fast Food',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Burgers', 'Pizza', 'Momos & Rolls', 'Chowmein']
  },
  {
    id: 'cat-1791812444703',
    name: 'Baby Products',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Diapers', 'Baby Care', 'Baby Food']
  },
  {
    id: 'cat-1791812490271',
    name: 'Household Products',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Detergents', 'Cleaners', 'Kitchen & Utensils']
  },
  {
    id: 'cat-1791812816888',
    name: 'Personal Care',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['Soaps & Body Wash', 'Hair Care', 'Oral Care', 'Skin Care']
  },
  {
    id: 'cat-1791983927406',
    name: 'BIKANER SPECIAL',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=500&q=80',
    max_radius_km: 10,
    subcategories: ['SWEATS AND NAMKEEN', 'Desi Ghee Sweets', 'Gift Boxes']
  }
];

export const DEFAULT_OFFERS = [
  {
    id: 'offer-1',
    title: 'Grand Welcome Discount',
    subtitle: 'Flat ₹50 OFF on fresh groceries, flour & daily essentials.',
    code: 'GHARTAK50',
    discount_tag: 'FLAT ₹50 OFF',
    discount_type: 'flat',
    discount_val: 50,
    min_order: 299,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    category_id: 'all',
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'offer-2',
    title: 'Fresh Veggies & Fruits Carnival',
    subtitle: 'Save extra 15% on daily vegetables, leafy greens & seasonal fruits.',
    code: 'FRESH15',
    discount_tag: '15% OFF',
    discount_type: 'percent',
    discount_val: 15,
    min_order: 199,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
    category_id: 'cat-2',
    active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'offer-3',
    title: 'Hot Fast Food Craving Hour',
    subtitle: 'Sizzling burgers, pizzas & rolls delivered piping hot in 25 mins.',
    code: 'HOTBITES',
    discount_tag: 'FLAT ₹30 OFF',
    discount_type: 'flat',
    discount_val: 30,
    min_order: 249,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    category_id: 'cat-5',
    active: true,
    created_at: new Date().toISOString()
  }
];

export const DEFAULT_MILESTONE_GIFTS = [
  {
    id: 'milestone-149',
    min_amount: 149,
    title: '₹149+ Order Free Gift',
    subtitle: 'Pick any 1 FREE gift item on orders of ₹149 or above!',
    active: true,
    items: [
      {
        id: 'm149-opt-1',
        name: 'Fresh Coriander & Green Chilli Pack',
        category: 'Vegetable',
        unit: '200g Fresh Pack',
        worth: 20,
        image: 'https://images.unsplash.com/photo-1588879460618-9249e7d947d1?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'm149-opt-2',
        name: 'Maggi 2-Minute Masala Noodles',
        category: 'Grocery',
        unit: '1 Pack (70g)',
        worth: 15,
        image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'm149-opt-3',
        name: 'Hot Crispy Samosa (2 Pcs)',
        category: 'Fast Food',
        unit: '2 Pcs + Chutney',
        worth: 25,
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'milestone-249',
    min_amount: 249,
    title: '₹249+ Order Free Gift',
    subtitle: 'Pick any 1 FREE special gift item on orders of ₹249 or above!',
    active: true,
    items: [
      {
        id: 'm249-opt-1',
        name: 'Fresh Farm Potato & Onion Combo',
        category: 'Vegetable',
        unit: '1 kg Combo',
        worth: 40,
        image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'm249-opt-2',
        name: 'Tata Iodized Salt / Grocery Pack',
        category: 'Grocery',
        unit: '1 kg Pack',
        worth: 30,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'm249-opt-3',
        name: 'Freshly Prepared Crispy Veg Burger',
        category: 'Fast Food',
        unit: '1 Pc Hot',
        worth: 45,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 'milestone-349',
    min_amount: 349,
    title: '₹349+ Super Order Free Gift',
    subtitle: 'Pick any 1 FREE bumper gift item on orders of ₹349 or above!',
    active: true,
    items: [
      {
        id: 'm349-opt-1',
        name: 'Mustard / Soyabean Cooking Oil Pouch',
        category: 'Grocery',
        unit: '500 ml Pouch',
        worth: 75,
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'm349-opt-2',
        name: 'Seasonal Fresh Veggie & Fruit Basket',
        category: 'Vegetable',
        unit: '1.5 kg Assorted',
        worth: 80,
        image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80'
      },
      {
        id: 'm349-opt-3',
        name: 'Veg Hakka Chowmein + Cold Drink',
        category: 'Fast Food',
        unit: '1 Plate + 250ml',
        worth: 90,
        image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80'
      }
    ]
  }
];

export const DEFAULT_STAFF_USERS = [
  {
    id: 'staff-user-1',
    user_id: 'staff01',
    name: 'Order Processing Staff',
    phone: '+91 98765 00001',
    password: 'staff123',
    role: 'staff',
    status: 'active',
    created_at: new Date().toISOString()
  }
];

export const DEFAULT_VENDORS = [
  {
    id: 'ven-mandi-khair',
    name: 'Khair Sabzi & Fal Mandi Wholesaler',
    company_name: 'Khair Agricultural Produce Market',
    phone: '+91 98971 23456',
    email: 'khairmandi@supply.in',
    category: 'Fresh Fruits & Vegetables',
    address: 'Near Old Bus Stand, Mandi Road, Khair, Aligarh - 202138',
    gst: '09AAKFK1234F1Z1',
    pan: 'AAKFK1234F',
    opening_balance: 0,
    notes: 'Daily supply of fresh vegetables, potatoes, onions, tomatoes and fruits.',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'ven-dairy-farm',
    name: 'Shree Krishna Milk & Dairy Farm',
    company_name: 'Shree Krishna Dairy Products',
    phone: '+91 98379 87654',
    email: 'krishnadairy@khair.in',
    category: 'Dairy, Milk & Paneer',
    address: 'Somna Road, Khair, Aligarh',
    gst: '09AABCK5678G1Z2',
    pan: 'AABCK5678G',
    opening_balance: 0,
    notes: 'Twice daily fresh milk, paneer, curd, butter and ghee supplier.',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'ven-fmcg-kirana',
    name: 'Balaji Grocery & FMCG Distribution',
    company_name: 'Balaji Traders & Wholesale Hub',
    phone: '+91 94123 45678',
    email: 'balajitraders@khair.in',
    category: 'Packaged Grocery & FMCG',
    address: 'Main Bazaar, Khair, Aligarh',
    gst: '09AACBT9012H1Z3',
    pan: 'AACBT9012H',
    opening_balance: 0,
    notes: 'Bulk supplier for branded Atta, Pulses, Spices, Edible Oils, Soaps & Dry Groceries.',
    status: 'active',
    created_at: '2026-10-01T00:00:00.000Z'
  }
];

export const DEFAULT_EXPENSES = [
  {
    id: 'exp-init-1',
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    category: 'delivery_fuel',
    category_label: 'Delivery Boy Fuel & Payouts',
    amount: 350,
    paid_to: 'Ramesh Delivery Boy',
    payment_mode: 'Cash',
    reference_no: 'PETROL-01',
    notes: 'Fuel reimbursement and order delivery allowance',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'exp-init-2',
    date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    category: 'packaging',
    category_label: 'Packaging Materials & Bags',
    amount: 850,
    paid_to: 'Khair Paper & Bags Mart',
    payment_mode: 'UPI',
    reference_no: 'UPI-9876543210@paytm',
    notes: 'Grocery carry bags, delivery tape and corrugated boxes',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'exp-init-3',
    date: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
    category: 'electricity_bills',
    category_label: 'Electricity & Utilities',
    amount: 1450,
    paid_to: 'UPPCL Electricity Dept',
    payment_mode: 'Bank Transfer',
    reference_no: 'BILL-OCT-2026',
    notes: 'Shop electricity and deep freezer power bill',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString()
  }
];

export const DEFAULT_OTHER_INCOMES = [
  {
    id: 'inc-init-1',
    date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    category: 'scrap_sale',
    category_label: 'Empty Box & Scrap Sale',
    amount: 420,
    source: 'Local Scrap Dealer',
    payment_mode: 'Cash',
    notes: 'Sale of empty packaging cartons and plastic boxes',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'inc-init-2',
    date: new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10),
    category: 'vendor_rebate',
    category_label: 'Supplier Cashback / Rebate',
    amount: 550,
    source: 'Balaji Grocery Wholesale',
    payment_mode: 'UPI',
    notes: 'Volume purchase discount received on monthly pulses order',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString()
  }
];

export const DEFAULT_PRODUCTS = UNIFIED_DEFAULT_PRODUCTS;

function normalizeFirebaseList(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data.filter(Boolean);
  if (typeof data === 'object') return Object.values(data).filter(Boolean);
  return null;
}

export function normalizeProductsList(raw) {
  const list = normalizeFirebaseList(raw);
  if (!list) return null;
  const seenIds = new Set();
  const seenNames = new Set();
  const uniqueList = [];
  for (const item of list) {
    if (!item) continue;
    const idKey = String(item.id || '').trim();
    const nameKey = String(item.name || '').trim().toLowerCase();
    if (idKey && seenIds.has(idKey)) continue;
    if (nameKey && seenNames.has(nameKey)) continue;
    if (idKey) seenIds.add(idKey);
    if (nameKey) seenNames.add(nameKey);
    uniqueList.push(item);
  }
  return uniqueList.map(p => {
    const rawImgs = Array.isArray(p.images) && p.images.length
      ? p.images.filter(Boolean)
      : (p.image ? [p.image] : []);
    const imgs = rawImgs.map(img => {
      if (typeof img === 'string') {
        if (img.includes('vertexpsbyri.web.app/product-images/')) {
          return img.replace('https://vertexpsbyri.web.app/product-images/', '/product-images/');
        }
        return img;
      }
      return img;
    });
    let mainImg = imgs[0] || p.image || '';
    if (typeof mainImg === 'string' && mainImg.includes('vertexpsbyri.web.app/product-images/')) {
      mainImg = mainImg.replace('https://vertexpsbyri.web.app/product-images/', '/product-images/');
    }
    const rawUnit = String(p.unit ?? '').trim();
    const baseUnit = (rawUnit && rawUnit !== '0') ? rawUnit : '1 unit';
    const basePrice = Number(p.price) || 0;
    const baseMrp = Number(p.mrp) || basePrice;
    const baseCost = Number(p.purchase_price) || 0;
    const baseStock = p.stock !== undefined ? Number(p.stock) : 50;

    const variants = Array.isArray(p.variants) && p.variants.length > 0
      ? p.variants.map((rawV, idx) => {
          let v = rawV;
          if (typeof v === 'string' && v.startsWith('@{') && v.endsWith('}')) {
            const inner = v.slice(2, -1);
            const obj = {};
            inner.split(';').forEach(part => {
              const eq = part.indexOf('=');
              if (eq !== -1) {
                const k = part.substring(0, eq).trim();
                obj[k] = part.substring(eq + 1).trim();
              }
            });
            v = obj;
          }
          if (typeof v !== 'object' || !v) return null;
          return {
            id: v.id || `var-${idx}`,
            unit: (v.unit && String(v.unit).trim() !== '0') ? String(v.unit).trim() : baseUnit,
            price: Number(v.price) || basePrice,
            mrp: Number(v.mrp) || Number(v.price) || baseMrp,
            purchase_price: Number(v.purchase_price) || baseCost,
            stock: v.stock !== undefined ? Number(v.stock) : baseStock
          };
        }).filter(Boolean)
      : [
          {
            id: 'var-0',
            unit: baseUnit,
            price: basePrice,
            mrp: baseMrp,
            purchase_price: baseCost,
            stock: baseStock
          }
        ];

    const firstVar = variants[0] || {};
    const finalUnit = (rawUnit && rawUnit !== '0' && basePrice > 0) ? rawUnit : (firstVar.unit || baseUnit);
    const finalPrice = basePrice > 0 ? basePrice : (Number(firstVar.price) || 0);
    const finalMrp = (baseMrp > 0 && basePrice > 0) ? baseMrp : (Number(firstVar.mrp) || finalPrice);
    const finalCost = baseCost > 0 ? baseCost : (Number(firstVar.purchase_price) || 0);

    return {
      ...p,
      unit: finalUnit,
      price: finalPrice,
      mrp: finalMrp,
      purchase_price: finalCost,
      image: mainImg,
      images: imgs.length ? imgs : (mainImg ? [mainImg] : []),
      variants
    };
  });
}

export function getCartItemKey(productId, unit) {
  return unit ? `${productId}__${String(unit).trim()}` : String(productId);
}

export async function syncToFirebase(nodePath, data) {
  try {
    let payloadToSync = data;
    if (nodePath === 'offers') {
      window.__gkLastOfferWrite = Date.now();
    }
    if (nodePath === 'milestone_gifts') {
      window.__gkLastMilestoneWrite = Date.now();
    }
    if (nodePath === 'products' && Array.isArray(data)) {
      if (data.length < 20) {
        console.warn(`[SAFETY GUARD] Blocked attempt to overwrite entire products catalog with truncated array of length ${data.length}`);
        return;
      }
      window.__gkLastProductWrite = Date.now();
      payloadToSync = data.map(p => {
        const copy = { ...p };
        if (Array.isArray(copy.images) && copy.images.length > 0) {
          delete copy.image;
        }
        return copy;
      });
    }

    // Direct Supabase storage
    await syncNodeToSupabase(nodePath, payloadToSync);
  } catch (err) {
    console.warn(`Database sync error (${nodePath}):`, err);
  }
}

export const syncToSupabase = syncToFirebase;
export const syncToDatabase = syncToFirebase;

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [products, setProducts] = useState(() => {
    try {
      const version = localStorage.getItem('gk_catalog_version');
      if (version !== '2026_10_30_v1') {
        localStorage.setItem('gk_catalog_version', '2026_10_30_v1');
        try { localStorage.setItem('gk_products', JSON.stringify(DEFAULT_PRODUCTS)); } catch {}
        return DEFAULT_PRODUCTS;
      }
      const saved = localStorage.getItem('gk_products');
      const parsed = saved ? JSON.parse(saved) : [];
      const normalized = normalizeProductsList(parsed);
      if (normalized && normalized.length > 0) return normalized;
      try { localStorage.setItem('gk_products', JSON.stringify(DEFAULT_PRODUCTS)); } catch {}
      return DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_orders');
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) {
        const FAKE_NAMES = new Set([
          'Mayank Agrawal', 'Rahul Sharma', 'Amit Kumar', 'Pooja Verma', 'Rohit Singh',
          'Deepak Gupta', 'Suresh Chandra', 'Priya Bansal', 'Vikram Singh', 'Neha Sharma',
          'Manoj Kumar', 'Sunita Devi', 'Dharmendra Singh', 'Ankit Sharma', 'Rajeev Kumar',
          'Sanjay Agrawal', 'Vipin Kumar', 'Gaurav Chaudhary', 'Kavita Rani', 'Sachin Kumar',
          'Rahul Verma', 'Pooja Malhotra'
        ]);
        return parsed.filter(o => o && o.id && !FAKE_NAMES.has(o.customer_name));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [staff, setStaff] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_staff');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [coupons, setCoupons] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_coupons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [offers, setOffers] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_offers');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [milestoneGifts, setMilestoneGifts] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_milestone_gifts');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge stale mock milestone tiers if they were cached previously
          const isLegacyMock = parsed.some(p => p && typeof p.id === 'string' && p.id.startsWith('milestone-'));
          if (isLegacyMock) {
            try { localStorage.setItem('gk_milestone_gifts', '[]'); } catch {}
            return [];
          }
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [staffUsers, setStaffUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_staff_users');
      return saved ? JSON.parse(saved) : DEFAULT_STAFF_USERS;
    } catch {
      return DEFAULT_STAFF_USERS;
    }
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wallets, setWallets] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_customer_wallets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [blockedCustomers, setBlockedCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_blocked_customers');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [vendors, setVendors] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_vendors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_VENDORS;
    } catch {
      return DEFAULT_VENDORS;
    }
  });

  const [vendorLedger, setVendorLedger] = useState(() => {
    try {
      // Force clean if it was polluted with historic auto-orders
      const clearedFlag = localStorage.getItem('gk_vendor_ledger_v2_reset');
      if (!clearedFlag) {
        localStorage.setItem('gk_vendor_ledger_v2_reset', 'true');
        localStorage.setItem('gk_vendor_ledger', JSON.stringify([]));
        return [];
      }
      const saved = localStorage.getItem('gk_vendor_ledger');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isVendorLedgerLoaded = useRef(false);

  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_expenses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_EXPENSES;
    } catch {
      return DEFAULT_EXPENSES;
    }
  });

  const [otherIncomes, setOtherIncomes] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_other_incomes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_OTHER_INCOMES;
    } catch {
      return DEFAULT_OTHER_INCOMES;
    }
  });

  const [isOfferZoneOpen, setIsOfferZoneOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const knownOrderIdsRef = useRef(new Set());

  const [adminMode, setAdminMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedWeightFilter, setSelectedWeightFilter] = useState('all');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnlyFilter, setVegOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  const defaultLocationState = {
    lat: 27.941887,
    lng: 77.843715,
    addressText: 'Khair (Auto-detecting your location...)',
    landmark: '',
    label: 'Detecting...',
    deliverable: true,
    distance_km: 0.1,
    fee: 20,
    min_order: 150,
    free_above: 499,
    reason: '',
    isAutoDetected: false
  };

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lat && parsed.lng) {
          // If stored location was just the default un-detected warehouse location, ensure isAutoDetected is false
          const isWarehouse = Math.abs(Number(parsed.lat) - 27.941887) < 0.0001 && Math.abs(Number(parsed.lng) - 77.843715) < 0.0001;
          return {
            ...defaultLocationState,
            ...parsed,
            isAutoDetected: isWarehouse ? false : Boolean(parsed.isAutoDetected)
          };
        }
      }
    } catch {}
    return defaultLocationState;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gk_user_location', JSON.stringify(userLocation));
    } catch {}
  }, [userLocation]);

  const defaultCustomerState = {
    isLoggedIn: false,
    name: '',
    phone: '',
    email: '',
    addresses: [],
    stamps: 0,
    surpriseGifts: 0,
    wallet_balance: 0
  };

  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_customer_user');
      return saved ? JSON.parse(saved) : defaultCustomerState;
    } catch {
      return defaultCustomerState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gk_customer_user', JSON.stringify(customerUser));
    } catch {}
  }, [customerUser]);

  const [adminAuth, setAdminAuth] = useState(() => {
    try {
      const s = sessionStorage.getItem('gk_admin_auth') || localStorage.getItem('gk_admin_auth');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const [cart, setCart] = useState(() => {
    try {
      const savedUser = localStorage.getItem('gk_customer_user');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      if (!parsedUser || !parsedUser.isLoggedIn) {
        return [];
      }
      const savedCart = localStorage.getItem('gk_customer_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => item && item.product_id && Number(item.qty) > 0);
        }
      }
    } catch {}
    return [];
  });

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartTotalMrp = cart.reduce((sum, item) => sum + (item.mrp || item.price) * item.qty, 0);
  const cartTotalSavings = Math.max(0, cartTotalMrp - cartSubtotal);

  useEffect(() => {
    try {
      localStorage.setItem('gk_customer_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const savedCoupon = localStorage.getItem('gk_applied_coupon');
      return savedCoupon ? JSON.parse(savedCoupon) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem('gk_applied_coupon', JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem('gk_applied_coupon');
      }
    } catch {}
  }, [appliedCoupon]);

  // Restore cart if page is restored from browser Back-Forward Cache (bfcache) or cross-tab storage
  useEffect(() => {
    const syncCartFromStorage = () => {
      try {
        const savedCart = localStorage.getItem('gk_customer_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) {
            setCart(prev => (prev.length === 0 && parsed.length > 0 ? parsed : prev));
          }
        }
      } catch {}
    };
    window.addEventListener('pageshow', syncCartFromStorage);
    window.addEventListener('storage', syncCartFromStorage);
    return () => {
      window.removeEventListener('pageshow', syncCartFromStorage);
      window.removeEventListener('storage', syncCartFromStorage);
    };
  }, []);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState('orders');
  const [offerZoneInitialFilter, setOfferZoneInitialFilter] = useState('all');
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState(null);
  const [adminSoundEnabled, setAdminSoundEnabled] = useState(true);
  const [storeClosedNotice, setStoreClosedNotice] = useState(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    window.__openPrivacyPolicy = () => setIsPrivacyModalOpen(true);
    return () => {
      delete window.__openPrivacyPolicy;
    };
  }, []);

  // Auto-open Privacy Policy if accessed via /privacy-policy, /privacy, or #privacy
  useEffect(() => {
    try {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();
      if (path.includes('privacy') || hash.includes('privacy') || search.includes('privacy')) {
        setIsPrivacyModalOpen(true);
      }
    } catch {}
  }, []);

  // Intercept mobile/browser Back button when any modal or drawer is open so Back closes the modal instead of leaving/reloading the site
  const anyOverlayOpen = Boolean(
    isCheckoutOpen ||
    isCartOpen ||
    selectedProductForModal ||
    isOfferZoneOpen ||
    isCategoriesModalOpen ||
    isLocationModalOpen ||
    isAuthModalOpen ||
    activeTrackingOrderId ||
    storeClosedNotice ||
    isPrivacyModalOpen
  );
  const hadOverlayHistoryRef = useRef(false);

  useEffect(() => {
    if (anyOverlayOpen && !hadOverlayHistoryRef.current) {
      try {
        window.history.pushState({ gkOverlay: true }, '');
        hadOverlayHistoryRef.current = true;
      } catch {}
    } else if (!anyOverlayOpen) {
      hadOverlayHistoryRef.current = false;
    }
  }, [anyOverlayOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isPrivacyModalOpen) {
        setIsPrivacyModalOpen(false);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (isCheckoutOpen) {
        setIsCheckoutOpen(false);
        setIsCartOpen(true);
        try {
          window.history.pushState({ gkOverlay: true }, '');
          hadOverlayHistoryRef.current = true;
        } catch {}
        return;
      }
      if (isCartOpen) {
        setIsCartOpen(false);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (selectedProductForModal) {
        setSelectedProductForModal(null);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (isOfferZoneOpen) {
        setIsOfferZoneOpen(false);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (isCategoriesModalOpen) {
        setIsCategoriesModalOpen(false);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (isLocationModalOpen) {
        setIsLocationModalOpen(false);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (activeTrackingOrderId) {
        setActiveTrackingOrderId(null);
        hadOverlayHistoryRef.current = false;
        return;
      }
      if (storeClosedNotice) {
        setStoreClosedNotice(null);
        hadOverlayHistoryRef.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isCheckoutOpen,
    isCartOpen,
    selectedProductForModal,
    isOfferZoneOpen,
    isCategoriesModalOpen,
    isLocationModalOpen,
    isAuthModalOpen,
    activeTrackingOrderId,
    storeClosedNotice
  ]);

  const isPollingOrdersRef = useRef(false);
  const isFetchingCatalogRef = useRef(false);

  const applyRemoteOffers = (rawOffers) => {
    const isRecentOfferWrite = window.__gkLastOfferWrite && (Date.now() - window.__gkLastOfferWrite < 2500);
    if (isRecentOfferWrite) return;
    // If fetch failed or network returned null/undefined, keep current state (never wipe on error)
    if (rawOffers === null || rawOffers === undefined) return;

    const remoteList = normalizeFirebaseList(rawOffers);
    if (!Array.isArray(remoteList)) return;

    // Supabase is single source of truth - set remote offers directly
    setOffers(remoteList);
    try { localStorage.setItem('gk_offers', JSON.stringify(remoteList)); } catch {}
  };

  const applyRemoteMilestones = (rawMilestones) => {
    const isRecentMilestoneWrite = window.__gkLastMilestoneWrite && (Date.now() - window.__gkLastMilestoneWrite < 2500);
    if (isRecentMilestoneWrite) return;
    // If fetch failed or network returned null/undefined, keep current state (never wipe on error)
    if (rawMilestones === null || rawMilestones === undefined) return;

    const remoteList = normalizeFirebaseList(rawMilestones);
    if (!Array.isArray(remoteList)) return;

    const cleanedList = remoteList.filter(m => m && typeof m === 'object');
    cleanedList.sort((a, b) => (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0));
    setMilestoneGifts(cleanedList);
    try { localStorage.setItem('gk_milestone_gifts', JSON.stringify(cleanedList)); } catch {}
  };

  useEffect(() => {
    if (!appliedCoupon || !appliedCoupon.code) return;
    const matchingOffer = (offers || []).find(
      o => o && o.code && o.code.toUpperCase() === appliedCoupon.code.toUpperCase()
    );
    if (!matchingOffer || matchingOffer.active === false) {
      setAppliedCoupon(null);
      return;
    }
    const minOrder = Number(matchingOffer.min_order ?? appliedCoupon.min_order) || 0;
    if (minOrder > 0 && cartSubtotal < minOrder) {
      setAppliedCoupon(null);
    }
  }, [offers, appliedCoupon, cartSubtotal]);

  // Smart Order Merger: merges Supabase orders with local gk_orders by updated_at
  // and automatically heals Supabase store_kv if local orders were missing remotely
  const mergeAndSyncOrders = async (remoteOrdersRaw, isBackgroundPoll = false) => {
    const isRecentLocalWrite = window.__gkLastOrderWrite && (Date.now() - window.__gkLastOrderWrite < 2500);
    if (isRecentLocalWrite) return;

    // Filter out dummy/synthetic orders so store only reflects real orders
    const FAKE_NAMES = new Set([
      'Mayank Agrawal', 'Rahul Sharma', 'Amit Kumar', 'Pooja Verma', 'Rohit Singh',
      'Deepak Gupta', 'Suresh Chandra', 'Priya Bansal', 'Vikram Singh', 'Neha Sharma',
      'Manoj Kumar', 'Sunita Devi', 'Dharmendra Singh', 'Ankit Sharma', 'Rajeev Kumar',
      'Sanjay Agrawal', 'Vipin Kumar', 'Gaurav Chaudhary', 'Kavita Rani', 'Sachin Kumar',
      'Rahul Verma', 'Pooja Malhotra'
    ]);
    const isGenuineOrder = (o) => {
      if (!o || !o.id) return false;
      if (FAKE_NAMES.has(o.customer_name) && o.order_status === 'Delivered') {
        return false;
      }
      return true;
    };

    const rawRemote = normalizeFirebaseList(remoteOrdersRaw) || [];
    const remoteList = rawRemote.filter(isGenuineOrder);
    let localList = [];
    try {
      const saved = localStorage.getItem('gk_orders');
      const parsed = saved ? JSON.parse(saved) : [];
      localList = Array.isArray(parsed) ? parsed.filter(isGenuineOrder) : [];
    } catch {
      localList = [];
    }

    const orderMap = new Map();
    let needsRemoteHeal = false;

    // 1. Put all remote orders in map first
    for (const rOrder of remoteList) {
      if (rOrder && rOrder.id) {
        orderMap.set(rOrder.id, rOrder);
      }
    }

    // 2. Merge local orders: if a local order is missing on Supabase
    // or has a strictly newer updated_at timestamp, keep the newer one and heal
    const statusRank = { 'Placed': 1, 'Accepted': 2, 'Packing': 3, 'Out for Delivery': 4, 'Delivered': 5, 'Cancelled': 6, 'Rejected': 6 };
    for (const lOrder of localList) {
      if (!lOrder || !lOrder.id) continue;
      const existingRemote = orderMap.get(lOrder.id);
      if (!existingRemote) {
        orderMap.set(lOrder.id, lOrder);
        needsRemoteHeal = true;
      } else {
        const rTime = new Date(existingRemote.updated_at || existingRemote.created_at || 0).getTime();
        const lTime = new Date(lOrder.updated_at || lOrder.created_at || 0).getTime();
        const rRank = statusRank[existingRemote.order_status] || 0;
        const lRank = statusRank[lOrder.order_status] || 0;

        if (lTime > rTime + 1000 || (lRank > rRank && lTime >= rTime)) {
          orderMap.set(lOrder.id, lOrder);
          needsRemoteHeal = true;
        }
      }
    }

    // Also check if remote had fake orders that need to be cleared from remote
    if (rawRemote.length !== remoteList.length) {
      needsRemoteHeal = true;
    }

    const mergedOrders = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    // Play incoming order sound and fire mobile system notification in Admin terminal when a new order ID appears
    const isAdminTerminal = typeof window !== 'undefined' && (
      window.location.pathname.includes('admin') ||
      window.location.href.includes('admin') ||
      Boolean(adminAuth)
    );

    if (isAdminTerminal && knownOrderIdsRef.current.size > 0) {
      const newOrders = mergedOrders.filter(o => o?.id && !knownOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0) {
        if (adminSoundEnabled) {
          playChime('new_order');
        }
        // Send mobile system notification with custom order alert tone
        newOrders.forEach(order => {
          sendOrderNotification(order, true);
        });
      }
    }
    knownOrderIdsRef.current = new Set(mergedOrders.map(o => o?.id).filter(Boolean));

    setOrders(mergedOrders);
    try {
      localStorage.setItem('gk_orders', JSON.stringify(mergedOrders));
    } catch {}

    if (needsRemoteHeal && mergedOrders.length > 0) {
      await syncToFirebase('orders', mergedOrders);
    }
  };

  // Fast (~80ms) lightweight poll from Supabase store_kv
  const pollOrdersFast = async () => {
    if (isPollingOrdersRef.current) return;
    isPollingOrdersRef.current = true;
    try {
      const [sbOrders, sbInbox, sbSettings] = await Promise.all([
        fetchNodeFromSupabase('orders'),
        fetchNodeFromSupabase('orders_inbox'),
        fetchNodeFromSupabase('settings')
      ]);
      const isRecentOrderWrite = window.__gkLastOrderWrite && (Date.now() - window.__gkLastOrderWrite < 2000);
      if (!isRecentOrderWrite) {
        let combinedOrders = [];
        if (Array.isArray(sbOrders)) combinedOrders = [...sbOrders];
        if (Array.isArray(sbInbox)) {
          const combinedMap = new Map();
          combinedOrders.forEach(o => { if (o && o.id) combinedMap.set(o.id, o); });
          sbInbox.forEach(o => { if (o && o.id) combinedMap.set(o.id, o); });
          combinedOrders = Array.from(combinedMap.values());
        }
        await mergeAndSyncOrders(combinedOrders, true);
      }
      if (sbSettings && typeof sbSettings === 'object') {
        setSettings(prev => ({ ...prev, ...sbSettings }));
      }
    } catch {} finally {
      isPollingOrdersRef.current = false;
    }
  };

  const fetchData = async (isBackgroundPoll = false) => {
    if (isFetchingCatalogRef.current) return;
    isFetchingCatalogRef.current = true;
    try {
      if (!isBackgroundPoll && products.length === 0) setLoading(true);

      // Pure Supabase Data Fetch
      if (isSupabaseConfigured) {
        try {
          const [sbOrders, sbInbox, sbSettings, sbProducts, sbCategories, sbOffers, sbMilestones, sbBlocked, sbWallets] = await Promise.all([
            fetchNodeFromSupabase('orders'),
            fetchNodeFromSupabase('orders_inbox'),
            fetchNodeFromSupabase('settings'),
            fetchNodeFromSupabase('products'),
            fetchNodeFromSupabase('categories'),
            fetchNodeFromSupabase('offers'),
            fetchNodeFromSupabase('milestone_gifts'),
            fetchNodeFromSupabase('blocked_customers'),
            fetchNodeFromSupabase('wallets')
          ]);

          let combinedOrders = [];
          if (Array.isArray(sbOrders)) combinedOrders = [...sbOrders];
          if (Array.isArray(sbInbox)) {
            const orderMap = new Map();
            combinedOrders.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
            sbInbox.forEach(o => { if (o && o.id) orderMap.set(o.id, o); });
            combinedOrders = Array.from(orderMap.values());
          }
          if (Array.isArray(sbOrders) || combinedOrders.length > 0) {
            await mergeAndSyncOrders(combinedOrders, isBackgroundPoll);
          }

          if (sbSettings && typeof sbSettings === 'object') {
            const mergedSettings = { ...DEFAULT_SETTINGS, ...sbSettings };
            setSettings(mergedSettings);
            try { localStorage.setItem('gk_settings', JSON.stringify(mergedSettings)); } catch {}
          }
          if (sbProducts && Array.isArray(sbProducts) && sbProducts.length > 0) {
            setProducts(sbProducts);
            try { localStorage.setItem('gk_products', JSON.stringify(sbProducts)); } catch {}
          }
          if (sbCategories && Array.isArray(sbCategories) && sbCategories.length > 0) {
            setCategories(sbCategories);
            try { localStorage.setItem('gk_categories', JSON.stringify(sbCategories)); } catch {}
          }
          if (sbOffers !== undefined && sbOffers !== null) applyRemoteOffers(sbOffers);
          if (sbMilestones !== undefined && sbMilestones !== null) applyRemoteMilestones(sbMilestones);
          if (sbBlocked && typeof sbBlocked === 'object') setBlockedCustomers(sbBlocked);
          if (sbWallets && typeof sbWallets === 'object') setWallets(sbWallets);
        } catch (sbErr) {
          console.warn('[Supabase Core Loader] error:', sbErr);
        }
      }

      if (!isBackgroundPoll) setLoading(false);

      // Fast check if current session is an admin or visiting the admin terminal
      const hasAdminAuth = typeof window !== 'undefined' && (
        Boolean(localStorage.getItem('gk_admin_auth')) ||
        Boolean(sessionStorage.getItem('gk_admin_auth')) ||
        window.location.pathname.includes('admin')
      );

      // Step 2: Fetch admin and staff nodes
      if (hasAdminAuth && isSupabaseConfigured) {
        try {
          const [sbStaff, sbStaffUsers, sbAudit, sbVendors, sbLedger, sbExpenses, sbIncomes] = await Promise.all([
            fetchNodeFromSupabase('staff'),
            fetchNodeFromSupabase('staff_users'),
            fetchNodeFromSupabase('audit_logs'),
            fetchNodeFromSupabase('vendors'),
            fetchNodeFromSupabase('vendor_ledgers'),
            fetchNodeFromSupabase('expenses'),
            fetchNodeFromSupabase('other_incomes')
          ]);
          if (sbStaff && Array.isArray(sbStaff) && sbStaff.length) {
            setStaff(sbStaff);
            try { localStorage.setItem('gk_staff', JSON.stringify(sbStaff)); } catch {}
          }
          if (sbStaffUsers && Array.isArray(sbStaffUsers) && sbStaffUsers.length) {
            setStaffUsers(sbStaffUsers);
            try { localStorage.setItem('gk_staff_users', JSON.stringify(sbStaffUsers)); } catch {}
          }
          if (sbAudit && Array.isArray(sbAudit) && sbAudit.length) {
            setAuditLogs(sbAudit);
            try { localStorage.setItem('gk_audit_logs', JSON.stringify(sbAudit)); } catch {}
          }
          if (sbVendors && Array.isArray(sbVendors) && sbVendors.length) {
            setVendors(sbVendors);
            try { localStorage.setItem('gk_vendors', JSON.stringify(sbVendors)); } catch {}
          }
          if (sbLedger && Array.isArray(sbLedger) && sbLedger.length) {
            setVendorLedger(sbLedger);
            isVendorLedgerLoaded.current = true;
            try { localStorage.setItem('gk_vendor_ledger', JSON.stringify(sbLedger)); } catch {}
          }
          if (sbExpenses && Array.isArray(sbExpenses) && sbExpenses.length) {
            setExpenses(sbExpenses);
            try { localStorage.setItem('gk_expenses', JSON.stringify(sbExpenses)); } catch {}
          }
          if (sbIncomes && Array.isArray(sbIncomes) && sbIncomes.length) {
            setOtherIncomes(sbIncomes);
            try { localStorage.setItem('gk_other_incomes', JSON.stringify(sbIncomes)); } catch {}
          }
        } catch (sbAdminErr) {
          console.warn('[Supabase Admin Loader] warning:', sbAdminErr);
        }
      }
    } catch (err) {
      console.warn('Data fetch warning:', err);
    } finally {
      if (!isBackgroundPoll) setLoading(false);
      isFetchingCatalogRef.current = false;
    }
  };

  useEffect(() => {
    fetchData(false);

    // Supabase Realtime Subscription for zero-delay order status, offers and catalog updates
    let unsubSupabase = null;
    if (isSupabaseConfigured) {
      unsubSupabase = subscribeStoreKv((key, data) => {
        if (key === 'orders' && Array.isArray(data)) {
          mergeAndSyncOrders(data, true);
        } else if (key === 'settings' && data) {
          setSettings(prev => ({ ...prev, ...data }));
        } else if (key === 'products' && Array.isArray(data)) {
          setProducts(data);
        } else if (key === 'categories' && Array.isArray(data)) {
          setCategories(data);
        } else if (key === 'offers') {
          applyRemoteOffers(data);
        } else if (key === 'milestone_gifts') {
          applyRemoteMilestones(data);
        } else if (key === 'staff' && Array.isArray(data)) {
          setStaff(data);
        } else if (key === 'staff_users' && Array.isArray(data)) {
          setStaffUsers(data);
        } else if (key === 'wallets' && data) {
          setWallets(data);
        } else if (key === 'blocked_customers' && data) {
          setBlockedCustomers(data);
        }
      });
    }

    // 2. Cross-tab storage listener (0ms instant sync when Admin & Customer are on the same browser)
    const handleStorageChange = (e) => {
      if (e.key === 'gk_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          }
        } catch {}
      }
      if (e.key === 'gk_products' && e.newValue) {
        try {
          const parsed = normalizeProductsList(JSON.parse(e.newValue));
          if (parsed && parsed.length >= 20) {
            setProducts(parsed);
          }
        } catch {}
      }
      if (e.key === 'gk_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) {
            setSettings(parsed);
          }
        } catch {}
      }
      if (e.key === 'gk_offers' && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOffers(parsed);
          }
        } catch {}
      }
      if (e.key === 'gk_milestone_gifts' && e.newValue !== null) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMilestoneGifts(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Instant catch-up when returning to tab, unlocking phone, or regaining focus
    const handleVisibilitySync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pollOrdersFast();
        fetchData(true);
      }
    };
    const handleFocusSync = () => {
      pollOrdersFast();
    };
    window.addEventListener('visibilitychange', handleVisibilitySync);
    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('pageshow', handleVisibilitySync);

    // 3. Fast 2-second poll of orders, inbox & settings
    const fastOrdersInterval = setInterval(() => {
      pollOrdersFast();
    }, 2000);

    // 4. Slow 25-second poll for full catalog
    const catalogInterval = setInterval(() => {
      fetchData(true);
    }, 25000);

    return () => {
      clearInterval(fastOrdersInterval);
      clearInterval(catalogInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('visibilitychange', handleVisibilitySync);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('pageshow', handleVisibilitySync);
      if (unsubSupabase) unsubSupabase();
    };
  }, [adminSoundEnabled]);

  const checkServiceability = (lat, lng, currentSubtotal = cartSubtotal) => {
    if (!settings) return;
    const storeLat = settings.store_lat;
    const storeLng = settings.store_lng;
    const dist = calculateHaversineDistance(storeLat, storeLng, lat, lng);
    const maxRadius = Number(settings.max_radius_km) || 10;

    let restrictedCategory = null;
    for (const item of cart) {
      const baseId = item.base_product_id || String(item.product_id || '').split('__')[0];
      const prod = products.find(p => p.id === baseId || p.id === item.product_id);
      if (prod) {
        const cat = categories.find(c => c.id === prod.category_id);
        if (cat && cat.max_radius_km && dist > cat.max_radius_km) {
          restrictedCategory = cat;
          break;
        }
      }
    }

    if (dist > maxRadius) {
      setUserLocation(prev => ({
        ...prev,
        lat,
        lng,
        distance_km: dist,
        deliverable: false,
        fee: null,
        min_order: null,
        reason: `Sorry, we don't deliver to your location yet. You are ${dist} km away (Maximum radius is ${maxRadius} km).`
      }));
      return;
    }

    if (restrictedCategory) {
      setUserLocation(prev => ({
        ...prev,
        lat,
        lng,
        distance_km: dist,
        deliverable: false,
        fee: null,
        min_order: null,
        reason: `Your cart contains items from "${restrictedCategory.name}" which can only be delivered within ${restrictedCategory.max_radius_km} km for guaranteed hot freshness. You are ${dist} km away.`
      }));
      return;
    }

    const slabs = settings.fee_slabs || [];
    let slab = slabs.find(s => dist >= s.min_km && dist <= s.max_km);
    if (!slab && slabs.length) slab = slabs[slabs.length - 1];
    if (!slab) slab = { fee: 30, min_order: 150, free_above: 500 };

    const isFree = slab.free_above && currentSubtotal >= slab.free_above;
    const fee = isFree ? 0 : slab.fee;

    setUserLocation(prev => ({
      ...prev,
      lat,
      lng,
      distance_km: dist,
      deliverable: true,
      fee,
      base_fee: slab.fee,
      is_free_delivery: isFree,
      min_order: slab.min_order,
      free_above: slab.free_above,
      reason: ''
    }));
  };

  const autoFetchCustomerLocation = (options = { silent: false }) => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (!options.silent) {
          alert('Geolocation is not supported by your device browser.');
        }
        resolve(null);
        return;
      }

      setIsDetectingLocation(true);

      // Safety timeout: ensure detecting state is never stuck for more than 3.5s
      const safetyTimer = setTimeout(() => {
        setIsDetectingLocation(false);
      }, 3500);

      let resolved = false;

      const finishSuccess = (lat, lng, accuracy, address) => {
        clearTimeout(safetyTimer);
        setIsDetectingLocation(false);
        if (resolved) return;
        resolved = true;
        resolve({ lat, lng, addressText: address });
      };

      const handleSuccess = (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
        const initialAddr = `Live Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        // 1. INSTANTLY update state & calculate serviceability (sub-50ms)
        setUserLocation(prev => ({
          ...prev,
          lat,
          lng,
          addressText: (prev.isAutoDetected && prev.addressText && !prev.addressText.includes('Auto-detecting') && !prev.addressText.includes('Main Market'))
            ? prev.addressText
            : initialAddr,
          label: 'Current Location',
          isAutoDetected: true,
          gpsAccuracy: accuracy
        }));

        checkServiceability(lat, lng);

        // Immediate release of detecting status and promise resolve so UI unblocks instantly!
        finishSuccess(lat, lng, accuracy, initialAddr);

        // 2. Asynchronously enrich human readable address in the background WITHOUT BLOCKING UI
        (async () => {
          let detectedAddress = initialAddr;
          try {
            // Fast BigDataCloud with 2.5s AbortController timeout
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 2500);
            const bdcRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
              { signal: controller.signal }
            );
            clearTimeout(fetchTimeout);
            if (bdcRes.ok) {
              const bdcData = await bdcRes.json();
              const parts = [];
              if (bdcData.locality && bdcData.locality !== bdcData.city) parts.push(bdcData.locality);
              if (bdcData.city) parts.push(bdcData.city);
              else if (bdcData.principalSubdivision) parts.push(bdcData.principalSubdivision);
              if (parts.length > 0) {
                detectedAddress = `${parts.join(', ')} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
              }
            }
          } catch {}

          setUserLocation(prev => ({
            ...prev,
            lat,
            lng,
            addressText: detectedAddress,
            label: 'Current Location',
            isAutoDetected: true,
            gpsAccuracy: accuracy
          }));

          setCustomerUser(prev => {
            if (!prev) return prev;
            const existing = Array.isArray(prev.addresses) ? prev.addresses : [];
            const newAddrObj = {
              id: 'addr-live-gps',
              label: 'Live GPS Location',
              line1: detectedAddress,
              address: detectedAddress,
              landmark: '',
              city: 'Khair',
              pincode: '202138',
              lat,
              lng,
              isDefault: true
            };
            const filtered = existing.filter(a => a && a.id !== 'addr-live-gps' && a.line1 !== detectedAddress);
            return {
              ...prev,
              addresses: [newAddrObj, ...filtered]
            };
          });
        })();

        // 3. Silently refine with high-accuracy GPS in the background if accuracy was rough
        if (accuracy && accuracy > 100) {
          navigator.geolocation.getCurrentPosition(
            (highPos) => {
              const hLat = Number(highPos.coords.latitude.toFixed(6));
              const hLng = Number(highPos.coords.longitude.toFixed(6));
              const hAcc = Math.round(highPos.coords.accuracy);
              setUserLocation(prev => ({
                ...prev,
                lat: hLat,
                lng: hLng,
                gpsAccuracy: hAcc
              }));
              checkServiceability(hLat, hLng);
            },
            () => {},
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
          );
        }
      };

      const handleError = (err) => {
        // Fast fallback to high accuracy if low accuracy failed
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (fallbackErr) => {
            clearTimeout(safetyTimer);
            setIsDetectingLocation(false);
            if (!resolved) {
              resolved = true;
              console.warn('Geolocation fetch error:', fallbackErr?.message || fallbackErr);
              if (!options.silent) {
                if (fallbackErr.code === 1) {
                  alert('Location permission was denied. Please allow location access in your browser or device settings.');
                } else {
                  alert('Could not fetch live GPS location: ' + (fallbackErr.message || 'Please enable GPS on your device.'));
                }
              }
              resolve(null);
            }
          },
          { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
        );
      };

      // FAST-FIRST: Low latency network/cached position (returns in 10-250ms)
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 }
      );
    });
  };

  // 1. Automatically fetch live customer GPS location whenever ANY customer opens the website
  useEffect(() => {
    autoFetchCustomerLocation({ silent: true });
  }, []);

  // 2. Re-fetch when customer logs in or phone changes
  useEffect(() => {
    if (customerUser?.isLoggedIn) {
      autoFetchCustomerLocation({ silent: true });
    }
  }, [customerUser?.isLoggedIn, customerUser?.phone]);

  // 3. Re-check location when window gains focus or document becomes visible if not yet auto-detected
  useEffect(() => {
    const handleRecheck = () => {
      if (!userLocation.isAutoDetected) {
        autoFetchCustomerLocation({ silent: true });
      }
    };
    window.addEventListener('focus', handleRecheck);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !userLocation.isAutoDetected) {
        autoFetchCustomerLocation({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleRecheck);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userLocation.isAutoDetected]);

  // 4. Listen to browser permission state changes
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        status.onchange = () => {
          if (status.state === 'granted') {
            autoFetchCustomerLocation({ silent: true });
          }
        };
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (settings && userLocation.lat && userLocation.lng) {
      checkServiceability(userLocation.lat, userLocation.lng, cartSubtotal);
    }
  }, [settings, userLocation.lat, userLocation.lng, cart.length, cartSubtotal]);

  const addToCart = (product, qty = 1, selectedVariant = null) => {
    if (!customerUser?.isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }

    const storeStatus = getStoreOperatingStatus(settings, new Date());
    if (!storeStatus.isOpen) {
      setStoreClosedNotice(storeStatus);
      playChime('alert');
      return;
    }

    const chosenUnit = (selectedVariant?.unit || product.unit || '1 unit').trim();
    const chosenPrice = Number(selectedVariant?.price ?? product.price) || 0;
    const chosenMrp = Number(selectedVariant?.mrp ?? product.mrp ?? chosenPrice) || chosenPrice;
    const chosenCost = Number(selectedVariant?.purchase_price ?? product.purchase_price) || 0;
    const chosenStock = Number(selectedVariant?.stock ?? product.stock ?? 50);
    const cartKey = getCartItemKey(product.id, chosenUnit);

    setCart(prev => {
      const existing = prev.find(
        item => item.product_id === cartKey || (item.product_id === product.id && item.unit === chosenUnit)
      );
      if (existing) {
        return prev.map(item =>
          (item.product_id === cartKey || (item.product_id === product.id && item.unit === chosenUnit))
            ? { ...item, product_id: cartKey, qty: Math.min(chosenStock, item.qty + qty) }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: cartKey,
          base_product_id: product.id,
          name: product.name,
          price: chosenPrice,
          mrp: chosenMrp,
          purchase_price: chosenCost,
          unit: chosenUnit,
          stock: chosenStock,
          qty: Math.min(chosenStock, qty),
          category_id: product.category_id,
          veg_flag: product.veg_flag,
          image: product.images?.[0] || product.image || ''
        }
      ];
    });
  };

  const updateCartQty = (productId, newQty) => {
    if (!customerUser?.isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.product_id === productId) {
          const baseId = item.base_product_id || String(productId).split('__')[0];
          const prod = products.find(p => p.id === baseId || p.id === productId);
          const maxStock = item.stock ?? (prod ? prod.stock : 999);
          return { ...item, qty: Math.min(maxStock, newQty) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    try {
      localStorage.removeItem('gk_customer_cart');
      localStorage.removeItem('gk_applied_coupon');
    } catch {}
  };

  const addOrderLocally = (newOrder) => {
    setOrders(prev => {
      const updated = [newOrder, ...prev.filter(o => o?.id !== newOrder.id)];
      try { localStorage.setItem('gk_orders', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const freeDeliveryMinOrder = Number(userLocation.free_above) || 0;
  const baseDeliveryFee = Number(userLocation.base_fee ?? userLocation.fee ?? 30);
  const isFreeDeliveryByThreshold = freeDeliveryMinOrder > 0 && cartSubtotal >= freeDeliveryMinOrder;
  const isFreeDeliveryByCoupon = Boolean(appliedCoupon && appliedCoupon.discount_type === 'free_delivery');
  const isZeroDeliveryFee = isFreeDeliveryByThreshold || isFreeDeliveryByCoupon || userLocation.fee === 0;
  const freeDeliveryShortfall = freeDeliveryMinOrder > 0 ? Math.max(0, freeDeliveryMinOrder - cartSubtotal) : 0;

  let deliveryFee = !userLocation.deliverable ? 0 : (isZeroDeliveryFee ? 0 : baseDeliveryFee);

  const findBestCoupon = (subtotal = cartSubtotal, fee = deliveryFee) => {
    if (subtotal <= 0) return null;
    // ONLY offers that are explicitly LIVE (active !== false) in the offers list
    const liveCoupons = (offers || []).filter(
      o => o && o.code && o.active !== false
    );

    const eligible = liveCoupons.filter(o => subtotal >= (Number(o.min_order) || 0));
    if (eligible.length === 0) return null;

    let bestOffer = null;
    let bestDiscount = -1;

    for (const offer of eligible) {
      let discountAmt = 0;
      if (offer.discount_type === 'flat') {
        discountAmt = Math.min(subtotal, Number(offer.discount_val || offer.discount || 0));
      } else if (offer.discount_type === 'percent') {
        const pct = Number(offer.discount_val || 0);
        const computed = Math.round((subtotal * pct) / 100);
        const maxD = Number(offer.max_discount) || 999999;
        discountAmt = Math.min(subtotal, Math.min(computed, maxD));
      } else if (offer.discount_type === 'free_delivery') {
        discountAmt = Number(fee) || 0;
      } else {
        discountAmt = Number(offer.discount_val || offer.discount || 0);
      }

      if (discountAmt > bestDiscount && discountAmt > 0) {
        bestDiscount = discountAmt;
        bestOffer = {
          code: offer.code,
          discount_type: offer.discount_type || 'flat',
          discount_val: offer.discount_val || 0,
          discount: discountAmt,
          description: offer.discount_tag || offer.title || `${offer.code}`,
          min_order: Number(offer.min_order) || 0,
          isAutoApplied: true
        };
      }
    }

    return bestOffer;
  };

  // Automatically evaluate and apply best LIVE coupon whenever cart or offers update
  useEffect(() => {
    if (!cart || cart.length === 0 || cartSubtotal <= 0) {
      if (appliedCoupon) setAppliedCoupon(null);
      return;
    }

    const hasRemoved = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gk_coupon_manually_removed');
    if (hasRemoved) return;

    // Only consider live offers
    const liveCoupons = (offers || []).filter(o => o && o.code && o.active !== false);
    const currentOffer = appliedCoupon ? liveCoupons.find(o => o.code.toUpperCase() === appliedCoupon.code.toUpperCase()) : null;

    if (!appliedCoupon || !currentOffer || cartSubtotal < (Number(currentOffer.min_order) || 0)) {
      const best = findBestCoupon(cartSubtotal, deliveryFee);
      if (best) {
        setAppliedCoupon(best);
      } else if (appliedCoupon) {
        setAppliedCoupon(null);
      }
    } else {
      // Check if order subtotal increased and unlocked an even better live coupon
      const best = findBestCoupon(cartSubtotal, deliveryFee);
      if (best && best.code !== appliedCoupon.code && (Number(best.discount) > Number(appliedCoupon.discount || 0))) {
        setAppliedCoupon(best);
      }
    }
  }, [cartSubtotal, offers, deliveryFee]);

  let couponDiscount = 0;
  if (appliedCoupon && (!appliedCoupon.min_order || cartSubtotal >= Number(appliedCoupon.min_order))) {
    if (appliedCoupon.discount_type === 'flat') {
      couponDiscount = Math.min(cartSubtotal, Number(appliedCoupon.discount_val ?? appliedCoupon.discount ?? 0));
    } else if (appliedCoupon.discount_type === 'percent') {
      const pct = Number(appliedCoupon.discount_val || 0);
      const computed = pct > 0 ? Math.round((cartSubtotal * pct) / 100) : Number(appliedCoupon.discount || 0);
      const maxD = Number(appliedCoupon.max_discount) || 999999;
      couponDiscount = Math.min(cartSubtotal, Math.min(computed, maxD));
    } else if (appliedCoupon.discount_type === 'free_delivery') {
      couponDiscount = 0;
    } else {
      couponDiscount = Math.min(cartSubtotal, Number(appliedCoupon.discount || appliedCoupon.discount_val || 0));
    }
  }

  const grandTotal = Math.max(0, cartSubtotal + deliveryFee - couponDiscount);

  const addAuditLog = async ({ action, details, orderId = null, userId = null, userName = null, role = null }) => {
    const actorUserId = userId || adminAuth?.user?.username || adminAuth?.username || 'system';
    const actorName = userName || adminAuth?.user?.name || adminAuth?.user?.username || 'User';
    const actorRole = role || adminAuth?.user?.role || adminAuth?.role || 'staff';

    const newLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      user_id: actorUserId,
      user_name: actorName,
      role: actorRole,
      action: action || 'General Action',
      details: details || '',
      order_id: orderId || null
    };

    setAuditLogs(prev => {
      const updated = [newLog, ...(prev || [])];
      try { localStorage.setItem('gk_audit_logs', JSON.stringify(updated.slice(0, 500))); } catch {}
      syncNodeToSupabase('audit_logs', updated.slice(0, 500)).catch(() => {});
      return updated;
    });
  };

  const adjustCustomerWallet = async (phone, amount, { type = 'credit', reason = '', orderId = '', by = 'Admin' } = {}) => {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) return null;

    const currentWallet = wallets[cleanPhone] || { balance: 0, history: [] };
    const numAmt = Math.abs(Number(amount) || 0);
    let newBalance = 0;
    if (type === 'credit') {
      newBalance = Math.round(((Number(currentWallet.balance) || 0) + numAmt) * 100) / 100;
    } else if (type === 'debit') {
      newBalance = Math.max(0, Math.round(((Number(currentWallet.balance) || 0) - numAmt) * 100) / 100);
    } else if (type === 'set') {
      // Directly change balance to specified amount
      newBalance = Math.max(0, Math.round(numAmt * 100) / 100);
    } else if (type === 'clear') {
      // 1-Click delete / reset entire wallet balance to 0
      newBalance = 0;
    }

    const txItem = {
      id: `wtx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: type, // 'credit' | 'debit' | 'set' | 'clear'
      amount: type === 'clear' ? (Number(currentWallet.balance) || 0) : numAmt,
      balanceAfter: newBalance,
      reason: reason || (
        type === 'credit' ? 'Wallet recharge' :
        type === 'debit' ? 'Order payment' :
        type === 'set' ? 'Balance updated by Admin' :
        'Wallet balance deleted/reset to ₹0 by Admin'
      ),
      order_id: orderId || null,
      by: by,
      created_at: new Date().toISOString()
    };

    const updatedWallet = {
      balance: newBalance,
      history: [txItem, ...(Array.isArray(currentWallet.history) ? currentWallet.history : [])].slice(0, 50),
      updated_at: new Date().toISOString()
    };

    const nextWallets = {
      ...wallets,
      [cleanPhone]: updatedWallet
    };

    setWallets(nextWallets);
    try { localStorage.setItem('gk_customer_wallets', JSON.stringify(nextWallets)); } catch {}
    syncNodeToSupabase('wallets', nextWallets).catch(() => {});

    // Sync to customerUser state if current session matches phone
    const currCustPhone = String(customerUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (currCustPhone === cleanPhone) {
      setCustomerUser(prev => ({
        ...(prev || {}),
        wallet_balance: newBalance
      }));
    }

    return { newBalance, txItem };
  };

  const customerWalletBalance = React.useMemo(() => {
    const cleanPhone = String(customerUser?.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone && wallets[cleanPhone] && typeof wallets[cleanPhone].balance === 'number') {
      return Number(wallets[cleanPhone].balance);
    }
    return Number(customerUser?.wallet_balance || 0);
  }, [customerUser, wallets]);

  // Claim & Scratch 1% Order Cashback Card -> Credits customer wallet instantly
  const claimOrderScratchCard = async (orderId, phone = '') => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder || !targetOrder.scratch_card || targetOrder.scratch_card.isScratched) {
      return null;
    }

    const card = targetOrder.scratch_card;
    const amount = Number(card.amount) || 0;
    const cleanPhone = String(phone || targetOrder.customer_phone || customerUser?.phone || '').replace(/\D/g, '').slice(-10);

    // 1. Credit wallet immediately
    if (amount > 0 && cleanPhone) {
      await adjustCustomerWallet(cleanPhone, amount, {
        type: 'credit',
        reason: `1% Instant Cashback for Order #${targetOrder.id}`,
        orderId: targetOrder.id,
        by: 'Scratch Card'
      });
    }

    // 2. Mark card as scratched
    const updatedCard = {
      ...card,
      isScratched: true,
      status: 'scratched',
      scratched_at: new Date().toISOString()
    };

    const updatedOrder = {
      ...targetOrder,
      scratch_card: updatedCard
    };

    const nextOrders = orders.map(o => o.id === orderId ? updatedOrder : o);
    setOrders(nextOrders);
    try { localStorage.setItem('gk_orders', JSON.stringify(nextOrders)); } catch {}
    syncNodeToSupabase('orders', nextOrders).catch(() => {});

    return updatedCard;
  };

  // Revoke & Automatically Remove Cashback when an order is cancelled
  const revokeOrderCashback = async (targetOrder, { by = 'Admin' } = {}) => {
    if (!targetOrder || !targetOrder.id) return { revoked: false, amount: 0 };
    const orderPhone = String(targetOrder.customer_phone || targetOrder.address?.phone || '').replace(/\D/g, '').slice(-10);
    if (!orderPhone) return { revoked: false, amount: 0 };

    const card = targetOrder.scratch_card;
    let cashbackAmount = Number(card?.amount || targetOrder.cashback_amount || targetOrder.cashback_earned || 0);

    // Also inspect customer's wallet history for any credit linked to this order
    const currWallet = wallets[orderPhone];
    const creditedTx = currWallet?.history?.find(tx => String(tx.order_id || '') === String(targetOrder.id) && (tx.type === 'credit' || (tx.reason || '').toLowerCase().includes('cashback')));
    if (creditedTx && Number(creditedTx.amount) > 0) {
      cashbackAmount = Math.max(cashbackAmount, Number(creditedTx.amount));
    }

    const wasCredited = Boolean(card?.isScratched || creditedTx);

    // 1. Debit wallet if customer already got the cashback
    if (wasCredited && cashbackAmount > 0) {
      await adjustCustomerWallet(orderPhone, cashbackAmount, {
        type: 'debit',
        reason: `Cashback reversed for Cancelled Order #${targetOrder.id}`,
        orderId: targetOrder.id,
        by: by
      });

      addAuditLog({
        action: 'Cashback Reversal',
        details: `Auto-removed ₹${cashbackAmount} cashback from customer wallet (${orderPhone}) for cancelled Order #${targetOrder.id}`,
        orderId: targetOrder.id
      });
    }

    // 2. Mark scratch card as cancelled so customer cannot claim it later
    if (card) {
      const cancelledCard = {
        ...card,
        isScratched: true, // prevents customer scratching
        status: 'cancelled',
        amount: 0,
        cancelled_at: new Date().toISOString(),
        note: 'Order was cancelled; cashback revoked'
      };

      const updatedOrders = orders.map(o => o.id === targetOrder.id ? { ...o, scratch_card: cancelledCard } : o);
      setOrders(updatedOrders);
      try { localStorage.setItem('gk_orders', JSON.stringify(updatedOrders)); } catch {}
      syncNodeToSupabase('orders', updatedOrders).catch(() => {});
    }

    return { revoked: wasCredited, amount: cashbackAmount };
  };

  // Block Customer (Prevents Fake / Abusive Orders from specified number)
  const blockCustomer = async (phone, { reason = 'Fake / suspicious orders', name = '', by = 'Admin' } = {}) => {
    if (!phone) return false;
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) return false;

    const blockEntry = {
      phone: cleanPhone,
      name: name || '',
      reason: reason || 'Fake orders / spam',
      blocked_at: new Date().toISOString(),
      blocked_by: by || 'Admin'
    };

    const nextBlocked = {
      ...blockedCustomers,
      [cleanPhone]: blockEntry
    };

    setBlockedCustomers(nextBlocked);
    try { localStorage.setItem('gk_blocked_customers', JSON.stringify(nextBlocked)); } catch {}
    syncNodeToSupabase('blocked_customers', nextBlocked).catch(() => {});

    addAuditLog({
      action: 'Block Customer',
      details: `${by} blocked customer mobile ${cleanPhone}${name ? ` (${name})` : ''}. Reason: ${reason}`
    });

    return true;
  };

  // Unblock Customer
  const unblockCustomer = async (phone, by = 'Admin') => {
    if (!phone) return false;
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return false;

    const nextBlocked = { ...blockedCustomers };
    delete nextBlocked[cleanPhone];

    setBlockedCustomers(nextBlocked);
    try { localStorage.setItem('gk_blocked_customers', JSON.stringify(nextBlocked)); } catch {}
    syncNodeToSupabase('blocked_customers', nextBlocked).catch(() => {});

    addAuditLog({
      action: 'Unblock Customer',
      details: `${by} unblocked customer mobile ${cleanPhone}`
    });

    return true;
  };

  // Check if phone number is blocked
  const isCustomerBlocked = (phone) => {
    if (!phone) return false;
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return false;
    return Boolean(blockedCustomers && blockedCustomers[cleanPhone]);
  };

  const loginAdmin = async (username, password) => {
    const cleanUser = (username || '').trim();

    // Check Super Admin
    if (
      (cleanUser.toLowerCase() === 'ghartakkartkhair' || cleanUser.toLowerCase() === 'admin') &&
      password &&
      password.length >= 4
    ) {
      const authData = {
        token: 'gk-firebase-admin-token',
        user: { username: cleanUser, name: 'Super Admin', role: 'super_admin' },
        username: cleanUser,
        role: 'super_admin',
        loginTime: new Date().toISOString()
      };
      setAdminAuth(authData);
      sessionStorage.setItem('gk_admin_auth', JSON.stringify(authData));
      localStorage.setItem('gk_admin_auth', JSON.stringify(authData));

      addAuditLog({
        userId: cleanUser,
        userName: 'Super Admin',
        role: 'super_admin',
        action: 'Super Admin Login',
        details: 'Super Admin logged in with full system access'
      });
      return authData;
    }

    // Check Staff Users
    const foundStaff = (staffUsers || []).find(
      s => s.status !== 'disabled' &&
           ((s.user_id && s.user_id.toLowerCase() === cleanUser.toLowerCase()) ||
            (s.username && s.username.toLowerCase() === cleanUser.toLowerCase())) &&
           s.password === password
    );

    if (foundStaff) {
      const authData = {
        token: `gk-staff-token-${foundStaff.id}`,
        user: {
          id: foundStaff.id,
          username: foundStaff.user_id || foundStaff.username,
          name: foundStaff.name,
          role: 'staff',
          phone: foundStaff.phone
        },
        username: foundStaff.user_id || foundStaff.username,
        role: 'staff',
        loginTime: new Date().toISOString()
      };
      setAdminAuth(authData);
      sessionStorage.setItem('gk_admin_auth', JSON.stringify(authData));
      localStorage.setItem('gk_admin_auth', JSON.stringify(authData));

      addAuditLog({
        userId: foundStaff.user_id || foundStaff.username,
        userName: foundStaff.name,
        role: 'staff',
        action: 'Staff Member Login',
        details: `Staff member ${foundStaff.name} (User ID: ${foundStaff.user_id || foundStaff.username}) logged into Order Processing Terminal`
      });
      return authData;
    }

    throw new Error('Access Denied: Invalid User ID or Password');
  };

  const logoutAdmin = () => {
    if (adminAuth) {
      addAuditLog({
        action: 'User Logout',
        details: `${adminAuth?.user?.name || adminAuth?.username || 'User'} (${adminAuth?.user?.role || 'staff'}) logged out`
      });
    }
    setAdminAuth(null);
    sessionStorage.removeItem('gk_admin_auth');
    localStorage.removeItem('gk_admin_auth');
    setAdminMode(false);
  };

  // Compute live customer stamp progress from valid (non-cancelled) qualifying orders (>= Rs 250)
  const customerStampStatus = React.useMemo(() => {
    const savedPhone = typeof window !== 'undefined' ? (localStorage.getItem('gk_last_customer_phone') || '') : '';
    const lastOrderId = typeof window !== 'undefined' ? localStorage.getItem('gk_last_customer_order_id') : null;
    const cleanPhone = (customerUser?.phone || savedPhone || '').replace(/\D/g, '').slice(-10);

    // Find all orders associated with this customer
    const customerOrders = (orders || []).filter(o => {
      if (!o) return false;
      if (lastOrderId && o.id === lastOrderId) return true;
      const oPhone = (o.customer_phone || o.address?.phone || '').replace(/\D/g, '').slice(-10);
      return cleanPhone && oPhone && cleanPhone === oPhone;
    });

    // Valid qualifying orders must NOT be Cancelled or Rejected
    const matchingQualifyingOrders = customerOrders.filter(o => {
      if (o.order_status === 'Cancelled' || o.order_status === 'Rejected') return false;
      return (Number(o.total) || 0) >= 250 || o.earned_stamp;
    });

    // If customer has orders in history, their earned stamps strictly equal valid qualifying orders.
    // Otherwise fallback to profile stamps if profile exists without order records.
    const totalStampsEarned = customerOrders.length > 0
      ? matchingQualifyingOrders.length
      : Math.max(0, (Number(customerUser?.surpriseGifts) || 0) * 10 + (Number(customerUser?.stamps) || 0));

    const activeStamps = totalStampsEarned % 10;
    const surpriseGifts = Math.floor(totalStampsEarned / 10);
    const stampsRemaining = 10 - activeStamps;
    const cartEarnsStamp = grandTotal >= 250;
    const cartShortfallForStamp = Math.max(0, 250 - grandTotal);

    return {
      totalStampsEarned,
      activeStamps,
      surpriseGifts,
      stampsRemaining,
      cartEarnsStamp,
      cartShortfallForStamp
    };
  }, [orders, customerUser, grandTotal]);

  // Auto-sync customerUser.stamps when orders change (e.g. order cancelled or deleted)
  useEffect(() => {
    const savedPhone = typeof window !== 'undefined' ? (localStorage.getItem('gk_last_customer_phone') || '') : '';
    const cleanPhone = (customerUser?.phone || savedPhone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return;

    const customerOrders = (orders || []).filter(o => {
      if (!o) return false;
      const oPhone = (o.customer_phone || o.address?.phone || '').replace(/\D/g, '').slice(-10);
      return oPhone === cleanPhone;
    });

    if (customerOrders.length > 0) {
      const validQualifying = customerOrders.filter(o => {
        if (o.order_status === 'Cancelled' || o.order_status === 'Rejected') return false;
        return (Number(o.total) || 0) >= 250 || o.earned_stamp;
      });
      const validTotal = validQualifying.length;
      const validActive = validTotal % 10;
      const validGifts = Math.floor(validTotal / 10);

      if (customerUser && (customerUser.stamps !== validActive || customerUser.surpriseGifts !== validGifts)) {
        setCustomerUser(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            stamps: validActive,
            surpriseGifts: validGifts
          };
          try { localStorage.setItem('gk_customer_user', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    }
  }, [orders, customerUser?.phone]);

  const openCustomerStampCard = () => {
    if (customerUser?.isLoggedIn) {
      setAuthModalInitialTab('stamps');
      setIsAuthModalOpen(true);
    } else {
      setOfferZoneInitialFilter('stamp_offer');
      setIsOfferZoneOpen(true);
    }
  };

  // Automated Order Process: whenever newly received orders arrive, auto-generate or update Vendor Ledger entries
  useEffect(() => {
    const isAdminTerminal = typeof window !== 'undefined' && (
      window.location.pathname.includes('admin') ||
      Boolean(adminAuth) ||
      adminMode
    );
    // Never auto-process vendor ledgers on customer storefront or before ledger has finished loading from Firebase!
    if (!isAdminTerminal) return;
    if (!isVendorLedgerLoaded.current) return;
    if (!orders || orders.length === 0 || !products || products.length === 0) return;

    // Cutoff time: Do NOT retroactively bill past historical orders that were placed before vendor feature setup!
    // Historical orders have already been settled and nothing is due from them.
    const ledgerCutoff = 1792476000000; // October 20, 2026 11:30 AM IST (only newly placed orders from here on)

    setVendorLedger(prevLedger => {
      let hasChanges = false;
      const currentLedger = Array.isArray(prevLedger) ? [...prevLedger] : [];
      const entryMap = new Map();
      currentLedger.forEach(entry => {
        if (entry && entry.order_id && entry.vendor_id) {
          entryMap.set(`${entry.order_id}__${entry.vendor_id}`, entry);
        }
      });

      orders.forEach(order => {
        if (!order || !order.id) return;

        const items = Array.isArray(order.items) ? order.items : [];
        if (items.length === 0) return;

        const isCancelled = order.order_status === 'Cancelled' || order.order_status === 'Rejected';
        const orderTime = new Date(order.created_at || 0).getTime();
        const hasExplicitVendor = Boolean(
          order.vendor_id ||
          order.vendor_name ||
          items.some(it => it && (it.vendor_id || it.vendor_name))
        );
        if (orderTime < ledgerCutoff && !hasExplicitVendor) return;

        // Group items by assigned vendor:
        // Priority:
        // 1. it.vendor_id (assigned directly on item)
        // 2. order.vendor_id (assigned directly on order)
        // 3. it.vendor_name or order.vendor_name matched to vendor list
        // 4. prod.vendor_id (catalog product vendor)
        const vendorGroups = {};
        items.forEach(it => {
          if (!it) return;
          const rawId = String(it.product_id || it.id || '').split('__')[0];
          const prod = products.find(p => p && (String(p.id) === rawId || p.name === it.name));

          let vId = it.vendor_id || order.vendor_id;
          if (!vId) {
            const vName = it.vendor_name || order.vendor_name;
            if (vName) {
              const match = (vendors || []).find(v =>
                v && (
                  v.name?.trim().toLowerCase() === vName.trim().toLowerCase() ||
                  v.company_name?.trim().toLowerCase() === vName.trim().toLowerCase()
                )
              );
              if (match) vId = match.id;
            }
          }
          if (!vId) {
            vId = prod?.vendor_id;
          }
          if (!vId) return; // Do not auto-bill unassigned products

          const vendorExists = (vendors || []).some(v => v && v.id === vId);
          if (!vendorExists) return;

          if (!vendorGroups[vId]) vendorGroups[vId] = [];

          let unitCost = Number(it.purchase_price);
          if (!unitCost || unitCost <= 0) unitCost = Number(prod?.purchase_price);
          if (!unitCost || unitCost <= 0) unitCost = Math.round((Number(it.price) || 0) * 0.75);

          vendorGroups[vId].push({
            name: it.name || 'Product',
            qty: Number(it.qty) || 1,
            unit: it.unit || '1 unit',
            unit_cost: unitCost,
            total_cost: unitCost * (Number(it.qty) || 1)
          });
        });

        Object.keys(vendorGroups).forEach(vId => {
          const vItems = vendorGroups[vId];
          const totalCost = vItems.reduce((sum, vi) => sum + vi.total_cost, 0);
          const key = `${order.id}__${vId}`;
          const existing = entryMap.get(key);

          if (existing) {
            const idx = currentLedger.findIndex(e => e.id === existing.id);
            if (idx !== -1) {
              if (isCancelled && existing.status !== 'cancelled') {
                currentLedger[idx] = {
                  ...currentLedger[idx],
                  status: 'cancelled',
                  particulars: `[CANCELLED ORDER] Customer Order #${order.id}`
                };
                hasChanges = true;
              } else if (!isCancelled) {
                const needsUpdate =
                  existing.status === 'cancelled' ||
                  !Array.isArray(existing.items) ||
                  existing.items.length === 0 ||
                  Number(existing.amount) !== totalCost;

                if (needsUpdate) {
                  currentLedger[idx] = {
                    ...currentLedger[idx],
                    status: 'active',
                    amount: totalCost,
                    items: vItems,
                    particulars: `Auto-Billed for Order #${order.id} (${vItems.map(i => `${i.qty}x ${i.name}`).join(', ')})`
                  };
                  hasChanges = true;
                }
              }
            }
          } else if (!isCancelled && totalCost > 0) {
            const newEntry = {
              id: `vled-${order.id}-${vId}`,
              vendor_id: vId,
              order_id: order.id,
              type: 'purchase',
              date: order.created_at || new Date().toISOString(),
              particulars: `Auto-Billed for Order #${order.id} (${vItems.map(i => `${i.qty}x ${i.name}`).join(', ')})`,
              amount: totalCost,
              items: vItems,
              reference_no: `ORD-${order.id}`,
              status: 'active',
              created_at: order.created_at || new Date().toISOString()
            };
            currentLedger.unshift(newEntry);
            entryMap.set(key, newEntry);
            hasChanges = true;
          }
        });
      });

      if (hasChanges) {
        try { localStorage.setItem('gk_vendor_ledger', JSON.stringify(currentLedger)); } catch {}
        syncToFirebase('vendor_ledgers', currentLedger);
        return currentLedger;
      }
      return prevLedger;
    });
  }, [orders, products, vendors, adminMode, adminAuth]);

  // Vendor Management Actions
  const addVendor = async (vendorData) => {
    const newVendor = {
      id: `ven-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'active',
      opening_balance: 0,
      ...vendorData
    };
    const updated = [newVendor, ...(vendors || [])];
    setVendors(updated);
    try { localStorage.setItem('gk_vendors', JSON.stringify(updated)); } catch {}
    await syncToFirebase('vendors', updated);
    return newVendor;
  };

  const updateVendor = async (vendorId, vendorData) => {
    const updated = (vendors || []).map(v => v.id === vendorId ? { ...v, ...vendorData } : v);
    setVendors(updated);
    try { localStorage.setItem('gk_vendors', JSON.stringify(updated)); } catch {}
    await syncToFirebase('vendors', updated);
  };

  const deleteVendor = async (vendorId) => {
    const updated = (vendors || []).filter(v => v.id !== vendorId);
    setVendors(updated);
    try { localStorage.setItem('gk_vendors', JSON.stringify(updated)); } catch {}
    await syncToFirebase('vendors', updated);
  };

  // Vendor Ledger Actions
  const addVendorLedgerEntry = async (entryData) => {
    const newEntry = {
      id: `vled-entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      status: 'active',
      ...entryData
    };
    let updatedList = [];
    setVendorLedger(prev => {
      const existing = Array.isArray(prev) ? prev : [];
      updatedList = [newEntry, ...existing];
      try { localStorage.setItem('gk_vendor_ledger', JSON.stringify(updatedList)); } catch {}
      return updatedList;
    });

    // Save full updated ledger array to Supabase
    await syncToFirebase('vendor_ledgers', updatedList);
    return newEntry;
  };

  const deleteVendorLedgerEntry = async (entryId) => {
    let updatedList = [];
    setVendorLedger(prev => {
      const existing = Array.isArray(prev) ? prev : [];
      updatedList = existing.filter(e => e.id !== entryId);
      try { localStorage.setItem('gk_vendor_ledger', JSON.stringify(updatedList)); } catch {}
      return updatedList;
    });
    await syncToFirebase('vendor_ledgers', updatedList);
  };

  const resetAllVendorLedgers = async () => {
    setVendorLedger([]);
    try {
      localStorage.setItem('gk_vendor_ledger', JSON.stringify([]));
      localStorage.setItem('gk_vendor_ledger_v2_reset', 'true');
    } catch {}
    await syncToFirebase('vendor_ledgers', []);
    if (vendors && vendors.length > 0) {
      const zeroedVendors = vendors.map(v => ({ ...v, opening_balance: 0 }));
      setVendors(zeroedVendors);
      try { localStorage.setItem('gk_vendors', JSON.stringify(zeroedVendors)); } catch {}
      await syncToFirebase('vendors', zeroedVendors);
    }
  };

  const settleVendorBalance = async (vendorId, settleAmount, notes = 'Balance Cleared - Nothing Due') => {
    const amt = Number(settleAmount);
    if (!amt) return;
    const isPayingOwed = amt > 0;
    const entry = {
      vendor_id: vendorId,
      type: isPayingOwed ? 'payment' : 'bill',
      date: new Date().toISOString(),
      particulars: `Settlement: ${notes}`,
      amount: Math.abs(amt),
      payment_mode: 'Cash / Settle',
      reference_no: `SETTLE-${Date.now().toString().slice(-4)}`,
      notes: notes,
      status: 'active'
    };
    return await addVendorLedgerEntry(entry);
  };

  // Expense Management Actions
  const addExpense = async (expenseData) => {
    const newExp = {
      id: `exp-${Date.now()}`,
      created_at: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      ...expenseData
    };
    const updated = [newExp, ...(expenses || [])];
    setExpenses(updated);
    try { localStorage.setItem('gk_expenses', JSON.stringify(updated)); } catch {}
    await syncToFirebase('expenses', updated);
    return newExp;
  };

  const updateExpense = async (expenseId, expenseData) => {
    const updated = (expenses || []).map(e => e.id === expenseId ? { ...e, ...expenseData } : e);
    setExpenses(updated);
    try { localStorage.setItem('gk_expenses', JSON.stringify(updated)); } catch {}
    await syncToFirebase('expenses', updated);
  };

  const deleteExpense = async (expenseId) => {
    const updated = (expenses || []).filter(e => e.id !== expenseId);
    setExpenses(updated);
    try { localStorage.setItem('gk_expenses', JSON.stringify(updated)); } catch {}
    await syncToFirebase('expenses', updated);
  };

  // Other Incomes Actions
  const addOtherIncome = async (incomeData) => {
    const newInc = {
      id: `inc-${Date.now()}`,
      created_at: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      ...incomeData
    };
    const updated = [newInc, ...(otherIncomes || [])];
    setOtherIncomes(updated);
    try { localStorage.setItem('gk_other_incomes', JSON.stringify(updated)); } catch {}
    await syncToFirebase('other_incomes', updated);
    return newInc;
  };

  const updateOtherIncome = async (incomeId, incomeData) => {
    const updated = (otherIncomes || []).map(i => i.id === incomeId ? { ...i, ...incomeData } : i);
    setOtherIncomes(updated);
    try { localStorage.setItem('gk_other_incomes', JSON.stringify(updated)); } catch {}
    await syncToFirebase('other_incomes', updated);
  };

  const deleteOtherIncome = async (incomeId) => {
    const updated = (otherIncomes || []).filter(i => i.id !== incomeId);
    setOtherIncomes(updated);
    try { localStorage.setItem('gk_other_incomes', JSON.stringify(updated)); } catch {}
    await syncToFirebase('other_incomes', updated);
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        setSettings,
        categories,
        setCategories,
        products,
        setProducts,
        orders,
        setOrders,
        addOrderLocally,
        staff,
        setStaff,
        coupons,
        loading,
        fetchData,
        syncToFirebase,

        adminMode,
        setAdminMode,
        adminAuth,
        loginAdmin,
        logoutAdmin,
        selectedCategory,
        setSelectedCategory,
        selectedSubcategory,
        setSelectedSubcategory,
        selectedWeightFilter,
        setSelectedWeightFilter,
        selectedPriceFilter,
        setSelectedPriceFilter,
        getCartItemKey,
        searchQuery,
        setSearchQuery,
        vegOnlyFilter,
        setVegOnlyFilter,
        sortBy,
        setSortBy,

        userLocation,
        setUserLocation,
        isDetectingLocation,
        checkServiceability,
        autoFetchCustomerLocation,

        customerUser,
        setCustomerUser,
        customerStampStatus,
        openCustomerStampCard,

        cart,
        addToCart,
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
        findBestCoupon,

        isCartOpen,
        setIsCartOpen,
        isLocationModalOpen,
        setIsLocationModalOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalInitialTab,
        setAuthModalInitialTab,
        selectedProductForModal,
        setSelectedProductForModal,
        activeTrackingOrderId,
        setActiveTrackingOrderId,
        adminSoundEnabled,
        setAdminSoundEnabled,
        storeClosedNotice,
        setStoreClosedNotice,
        isPrivacyModalOpen,
        setIsPrivacyModalOpen,

        offers,
        setOffers,
        milestoneGifts,
        setMilestoneGifts,
        isOfferZoneOpen,
        setIsOfferZoneOpen,
        isCategoriesModalOpen,
        setIsCategoriesModalOpen,
        offerZoneInitialFilter,
        setOfferZoneInitialFilter,

        staffUsers,
        setStaffUsers,
        auditLogs,
        setAuditLogs,
        addAuditLog,

        // Customer Cash Wallets & Scratch Card Cashbacks
        wallets,
        setWallets,
        adjustCustomerWallet,
        customerWalletBalance,
        claimOrderScratchCard,
        revokeOrderCashback,

        // Blocked Customers Protection
        blockedCustomers,
        setBlockedCustomers,
        blockCustomer,
        unblockCustomer,
        isCustomerBlocked,

        // Vendors & Ledger Module
        vendors,
        setVendors,
        vendorLedger,
        setVendorLedger,
        addVendor,
        updateVendor,
        deleteVendor,
        addVendorLedgerEntry,
        deleteVendorLedgerEntry,
        resetAllVendorLedgers,
        settleVendorBalance,

        // Expenses & Incomes (Accounting)
        expenses,
        setExpenses,
        otherIncomes,
        setOtherIncomes,
        addExpense,
        updateExpense,
        deleteExpense,
        addOtherIncome,
        updateOtherIncome,
        deleteOtherIncome
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
export const initialData = {
  settings: {
    store_name: "GhartakKart Khair Store",
    store_tagline: "Fresh to Home, Fast to You.",
    store_lat: 27.9463,
    store_lng: 77.8398,
    store_address: "Somna Road, Main Market, Khair, Aligarh, Uttar Pradesh - 202138",
    max_radius_km: 10.0,
    fee_slabs: [
      { min_km: 0, max_km: 3, fee: 20, min_order: 150, free_above: 499 },
      { min_km: 3, max_km: 6, fee: 40, min_order: 250, free_above: 799 },
      { min_km: 6, max_km: 10, fee: 60, min_order: 350, free_above: 1199 }
    ],
    delivery_hours: {
      open: "07:00",
      close: "23:00",
      is_open: true
    },
    fssai_license: "10824005000123",
    gstin: "07AABCG1234F1Z9",
    support_phone: "+91 98765 43210",
    support_email: "support@ghartakkart.com",
    receipt_footer_msg: "*** THANK YOU FOR SHOPPING LOCAL ***",
    upi_id: "ghartakkart@icici",
    upi_merchant_name: "GhartakKart Khair Store"
  },

  categories: [
    {
      id: "grocery",
      name: "Grocery & Staples",
      slug: "grocery",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80",
      subcategories: ["Staples & Atta", "Dairy & Eggs", "Snacks & Munchies", "Beverages", "Packaged Foods"],
      sort_order: 1,
      active: true,
      max_radius_km: null, // default store max
      available_hours: null
    },
    {
      id: "fast-food",
      name: "Fast Food & Hot Bites",
      slug: "fast-food",
      image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=500&q=80",
      subcategories: ["Burgers", "Pizza", "Rolls & Wraps", "Noodles & Rice", "Sides & Drinks"],
      sort_order: 2,
      active: true,
      max_radius_km: 5.0, // Per PRD requirement: Fast food smaller max radius for fresh arrival
      available_hours: { open: "11:00", close: "23:00" } // availability schedule
    },
    {
      id: "vegetables",
      name: "Fresh Vegetables",
      slug: "vegetables",
      image: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=500&q=80",
      subcategories: ["Leafy Greens", "Root Vegetables", "Daily Cooking", "Exotic & Organic"],
      sort_order: 3,
      active: true,
      max_radius_km: null,
      available_hours: null
    },
    {
      id: "fruits",
      name: "Fresh Fruits",
      slug: "fruits",
      image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=500&q=80",
      subcategories: ["Seasonal Favorites", "Daily Fresh", "Exotic & Berries", "Dry Fruits"],
      sort_order: 4,
      active: true,
      max_radius_km: null,
      available_hours: null
    },
    {
      id: "personal-care",
      name: "Personal Care & Hygiene",
      slug: "personal-care",
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80",
      subcategories: ["Hair Care", "Skin Care", "Oral Hygiene", "Bath & Body"],
      sort_order: 5,
      active: true,
      max_radius_km: null,
      available_hours: null
    }
  ],

  products: [],

  delivery_staff: [
    { id: "staff-1", name: "Ramesh Sharma", phone: "+91 98111 22334", vehicle: "Honda Activa (DL-4S-8921)", active: true, assigned_count: 2 },
    { id: "staff-2", name: "Amit Verma", phone: "+91 98222 33445", vehicle: "Bajaj Pulsar (DL-3S-4512)", active: true, assigned_count: 1 },
    { id: "staff-3", name: "Vikram Negi", phone: "+91 98333 44556", vehicle: "Hero Electric (DL-1E-1092)", active: true, assigned_count: 0 }
  ],

  coupons: [
    { code: "GHARTAK50", discount_type: "flat", discount_value: 50, min_order: 299, description: "Flat ₹50 OFF on orders above ₹299" },
    { code: "FREEDEL", discount_type: "free_delivery", discount_value: 0, min_order: 199, description: "Free Delivery on orders above ₹199" },
    { code: "FESTIVE20", discount_type: "percent", discount_value: 20, max_discount: 100, min_order: 499, description: "20% OFF up to ₹100 on orders above ₹499" }
  ],

  orders: []
};

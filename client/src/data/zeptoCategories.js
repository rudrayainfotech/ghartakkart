// Zepto-style Category Catalog Definition
// Matches the visual layout, composite packshots, and aisle organization of Zepto / Blinkit

export const ZEPTO_CATEGORIES = [
  // ROW 1
  {
    id: 'zcat-fruits-veg',
    name: 'Fruits & Vegetables',
    categoryId: 'cat-2',
    subFilter: 'all',
    keywords: ['vegetable', 'fruit', 'potato', 'tomato', 'onion', 'gajar', 'palak', 'methi', 'apple', 'banana'],
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-dairy-bread',
    name: 'Dairy, Bread & Eggs',
    categoryId: 'cat-3',
    subFilter: 'all',
    keywords: ['milk', 'bread', 'butter', 'dahi', 'curd', 'paneer', 'egg', 'cream'],
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-atta-rice',
    name: 'Atta, Rice, Oil & Dals',
    categoryId: 'cat-1',
    subFilter: 'all',
    keywords: ['atta', 'flour', 'rice', 'dal', 'chana', 'besan', 'oil', 'refined', 'ghee'],
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-meats-eggs',
    name: 'Meats, Fish & Eggs',
    categoryId: 'cat-3',
    subFilter: 'egg',
    keywords: ['egg', 'eggs', 'protein', 'soya', 'paneer'],
    image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-masala-dryfruits',
    name: 'Masala, Dry Fruits & More',
    categoryId: 'cat-1',
    subFilter: 'spices',
    keywords: ['almond', 'cashew', 'dry fruit', 'masale', 'spice', 'mirchi', 'jeera', 'spices', 'chia'],
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-breakfast-sauces',
    name: 'Breakfast & Sauces',
    categoryId: 'cat-1',
    subFilter: 'ketchup',
    keywords: ['ketchup', 'sauce', 'jam', 'pickle', 'corn', 'chutney', 'poha'],
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-packaged-food',
    name: 'Packaged Food',
    categoryId: 'cat-1',
    subFilter: 'maggi',
    keywords: ['maggi', 'pasta', 'macroni', 'poha', 'noodles', 'sabudana'],
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-zepto-cafe',
    name: 'Zepto Cafe',
    categoryId: 'cat-5',
    subFilter: 'all',
    keywords: ['pizza', 'burger', 'momos', 'shake', 'patty', 'patties', 'fries', 'kulcha', 'pav', 'roll', 'sandwich'],
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-tea-coffee',
    name: 'Tea, Coffee & More',
    categoryId: 'cat-1',
    subFilter: 'tea',
    keywords: ['tea', 'coffee', 'chai', 'rusk'],
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-ice-creams',
    name: 'Ice Creams & More',
    categoryId: 'cat-5',
    subFilter: 'shake',
    keywords: ['shake', 'ice cream', 'cream', 'sweet'],
    image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=300&q=80',
    badge: null
  },

  // ROW 2
  {
    id: 'zcat-frozen-food',
    name: 'Frozen Food',
    categoryId: 'cat-5',
    subFilter: 'fries',
    keywords: ['fries', 'patty', 'patties', 'nuggets', 'peas'],
    image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-sweet-cravings',
    name: 'Sweet Cravings',
    categoryId: 'cat-1791983927406',
    subFilter: 'all',
    keywords: ['sweat', 'sweet', 'mithai', 'chocolate', 'cake', 'rasgulla', 'gulab jamun', 'haldiram'],
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-cold-drinks',
    name: 'Cold Drinks & Juices',
    categoryId: 'cat-4',
    subFilter: 'colddrink',
    keywords: ['colddrink', 'drink', 'beverage', 'juice', 'soda', 'coke', 'limca', 'sprite'],
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-munchies',
    name: 'Munchies',
    categoryId: 'cat-4',
    subFilter: 'chips',
    keywords: ['chips', 'kurkure', 'namkeen', 'haldiram', 'bhujia', 'snack'],
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-biscuits',
    name: 'Biscuits',
    categoryId: 'cat-4',
    subFilter: 'biscuit',
    keywords: ['biscuit', 'parle', 'rusk', 'cookie', 'cookies', 'bread', 'bun', 'cake'],
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-apparel-lifestyle',
    name: 'Apparel & Lifestyle',
    categoryId: 'cat-1791812490271',
    subFilter: 'all',
    keywords: ['household', 'cleaner', 'lifestyle', 'essentials'],
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-jewellery',
    name: 'Jewellery',
    categoryId: 'cat-1791983927406',
    subFilter: 'all',
    keywords: ['special', 'bikaner', 'gift', 'mithai', 'festive'],
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&q=80',
    badge: 'NEW'
  },
  {
    id: 'zcat-beauty-personal-care',
    name: 'Beauty & Personal Care',
    categoryId: 'cat-1791812816888',
    subFilter: 'all',
    keywords: ['soap', 'shampoo', 'hair', 'oral', 'brush', 'paste', 'hand'],
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-skincare',
    name: 'Skincare',
    categoryId: 'cat-1791812816888',
    subFilter: 'skin',
    keywords: ['skin', 'cream', 'moisturizer', 'lotion', 'face', 'mehndi'],
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80',
    badge: null
  },
  {
    id: 'zcat-makeup-beauty',
    name: 'Makeup & Beauty',
    categoryId: 'cat-1791812816888',
    subFilter: 'all',
    keywords: ['personal care', 'beauty', 'cream', 'soap'],
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80',
    badge: null
  }
];

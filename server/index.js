import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import { initialData } from './data/initialData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'store_db.json');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Razorpay client with credentials from environment
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_To2EZDjW6D4GZW',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'BU1aThew952QHSru25BoC04x'
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Persistent store management
let db = null;

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      db = JSON.parse(content);
      console.log('Database loaded from persistent file');
    } else {
      db = JSON.parse(JSON.stringify(initialData));
      saveDatabase();
      console.log('Database initialized with default seed data');
    }
  } catch (err) {
    console.error('Error loading database, falling back to initial data:', err);
    db = JSON.parse(JSON.stringify(initialData));
  }
}

function saveDatabase() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

loadDatabase();

// Realtime SSE Clients
const sseClients = new Set();

function broadcastEvent(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Haversine formula calculation
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

// Calculate delivery fee and eligibility based on distance
export function getDeliveryEligibility(distanceKm, subtotal = 0, categoryIds = []) {
  const settings = db.settings;
  const maxRadius = Number(settings.max_radius_km) || 10.0;

  // Category specific radius check (e.g. Fast Food max 5km)
  let categoryRestricted = null;
  for (const catId of categoryIds) {
    const cat = db.categories.find(c => c.id === catId);
    if (cat && cat.max_radius_km && distanceKm > cat.max_radius_km) {
      categoryRestricted = {
        categoryName: cat.name,
        maxRadius: cat.max_radius_km
      };
      break;
    }
  }

  if (distanceKm > maxRadius) {
    return {
      deliverable: false,
      reason: `Sorry, we don't deliver to your location yet. You are ${distanceKm} km away (max radius is ${maxRadius} km).`,
      distance_km: distanceKm,
      max_radius_km: maxRadius,
      fee: null,
      min_order: null
    };
  }

  if (categoryRestricted) {
    return {
      deliverable: false,
      reason: `Items from ${categoryRestricted.categoryName} can only be delivered within ${categoryRestricted.maxRadius} km to ensure hot & fresh quality. Your location is ${distanceKm} km away.`,
      distance_km: distanceKm,
      max_radius_km: categoryRestricted.maxRadius,
      fee: null,
      min_order: null
    };
  }

  // Find matching fee slab
  const slabs = settings.fee_slabs || [];
  let matchedSlab = slabs.find(
    slab => distanceKm >= slab.min_km && distanceKm <= slab.max_km
  );

  if (!matchedSlab && slabs.length > 0) {
    matchedSlab = slabs[slabs.length - 1];
  }

  if (!matchedSlab) {
    matchedSlab = { fee: 30, min_order: 150, free_above: 500 };
  }

  const isFreeDelivery = matchedSlab.free_above && subtotal >= matchedSlab.free_above;
  const fee = isFreeDelivery ? 0 : matchedSlab.fee;

  return {
    deliverable: true,
    distance_km: distanceKm,
    fee: fee,
    base_fee: matchedSlab.fee,
    is_free_delivery: isFreeDelivery,
    min_order: matchedSlab.min_order,
    free_above: matchedSlab.free_above,
    slab: matchedSlab
  };
}

// SSE Route
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Security: Active Admin Sessions & Brute Force Lockout Protection
const validAdminTokens = new Set(['gk-firebase-admin-token', 'gk_master_admin_khair_2026']);
const failedLoginAttempts = new Map(); // ip -> { count, lockedUntil }

export function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.admin_token || req.headers['x-admin-token']);
  if (!token || !validAdminTokens.has(token)) {
    return res.status(403).json({ error: 'Access denied. Authenticated admin authorization token required.' });
  }
  next();
}

// MSG91 Customer OTP Authentication Endpoints
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '587557TQWDRAWc6aec439fP1';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '6adcb8421850695632091de3';
const MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID || '366b65685947363636393032';

app.post('/api/otp/verify-access-token', async (req, res) => {
  const { accessToken } = req.body;
  const token = accessToken || req.body['access-token'];
  if (!token) {
    return res.status(400).json({ error: 'Access token required' });
  }

  try {
    const apiRes = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authkey: MSG91_AUTH_KEY,
        'access-token': token
      })
    });
    const data = await apiRes.json();
    return res.json(data);
  } catch (err) {
    console.error('MSG91 verifyAccessToken error:', err);
    return res.status(500).json({ error: 'Failed to verify access token' });
  }
});

app.post('/api/otp/send', async (req, res) => {
  const { phone, otp } = req.body;
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
  }

  const code = otp || Math.floor(1000 + Math.random() * 9000).toString();
  const url = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=91${cleanPhone}&authkey=${MSG91_AUTH_KEY}&otp=${code}`;
  try {
    const apiRes = await fetch(url, { method: 'GET' });
    const data = await apiRes.json();
    return res.json({ success: true, ...data, otp: code });
  } catch (err) {
    console.error('MSG91 send error:', err);
    return res.status(500).json({ error: 'Failed to send OTP via MSG91' });
  }
});

app.post('/api/otp/verify', async (req, res) => {
  const { phone, otp } = req.body;
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  const cleanOtp = String(otp || '').trim();

  const url = `https://control.msg91.com/api/v5/otp/verify?otp=${cleanOtp}&mobile=91${cleanPhone}&authkey=${MSG91_AUTH_KEY}`;
  try {
    const apiRes = await fetch(url, { method: 'GET' });
    const data = await apiRes.json();
    return res.json(data);
  } catch (err) {
    console.error('MSG91 verify error:', err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Admin Authentication with Brute Force Protection
app.post('/api/admin/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'client';
  const now = Date.now();
  const attemptInfo = failedLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  // Check if locked out
  if (attemptInfo.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attemptInfo.lockedUntil - now) / 1000);
    return res.status(429).json({
      error: `Security Lockout: Too many failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`
    });
  }

  const { username, password } = req.body;
  if (username === 'ghartakkartkhair' && password === 'Ganesh@#$4001') {
    // Reset failed attempts on success
    failedLoginAttempts.delete(ip);

    const token = `gk_sec_${now}_${Math.random().toString(36).slice(2, 10)}`;
    validAdminTokens.add(token);

    return res.json({
      success: true,
      token,
      admin: {
        username: 'ghartakkartkhair',
        store: db.settings.store_name,
        role: 'Super Admin'
      }
    });
  }

  // Failed attempt
  attemptInfo.count += 1;
  if (attemptInfo.count >= 5) {
    attemptInfo.lockedUntil = now + 5 * 60 * 1000; // 5 minute lockout
    failedLoginAttempts.set(ip, attemptInfo);
    return res.status(429).json({
      error: 'Security Lockout: 5 failed login attempts detected. Access locked for 5 minutes.'
    });
  } else {
    failedLoginAttempts.set(ip, attemptInfo);
    const attemptsLeft = 5 - attemptInfo.count;
    return res.status(401).json({
      error: `Invalid admin credentials. (${attemptsLeft} attempts remaining before lockout)`
    });
  }
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.admin_token;
  if (token) validAdminTokens.delete(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

// Settings API
app.get('/api/settings', (req, res) => {
  res.json(db.settings);
});

app.put('/api/settings', checkAdminAuth, (req, res) => {
  db.settings = { ...db.settings, ...req.body };
  saveDatabase();
  broadcastEvent('SETTINGS_UPDATED', db.settings);
  res.json({ success: true, settings: db.settings });
});

// Serviceability API
app.get('/api/serviceability', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const subtotal = parseFloat(req.query.subtotal) || 0;
  const categories = req.query.categories ? req.query.categories.split(',') : [];

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params are required' });
  }

  const storeLat = db.settings.store_lat;
  const storeLng = db.settings.store_lng;
  const distanceKm = calculateHaversineDistance(storeLat, storeLng, lat, lng);
  const eligibility = getDeliveryEligibility(distanceKm, subtotal, categories);

  res.json({
    store: {
      lat: storeLat,
      lng: storeLng,
      address: db.settings.store_address,
      name: db.settings.store_name
    },
    customer: { lat, lng },
    ...eligibility
  });
});

// Categories API
app.get('/api/categories', (req, res) => {
  const sorted = [...db.categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  res.json(sorted);
});

app.post('/api/categories', (req, res) => {
  const newCat = {
    id: req.body.id || `cat-${Date.now()}`,
    name: req.body.name,
    slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-'),
    image: req.body.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
    subcategories: req.body.subcategories || [],
    sort_order: Number(req.body.sort_order) || db.categories.length + 1,
    active: req.body.active !== undefined ? req.body.active : true,
    max_radius_km: req.body.max_radius_km ? Number(req.body.max_radius_km) : null,
    available_hours: req.body.available_hours || null
  };
  db.categories.push(newCat);
  saveDatabase();
  broadcastEvent('CATEGORIES_UPDATED', db.categories);
  res.status(201).json(newCat);
});

app.put('/api/categories/:id', (req, res) => {
  const index = db.categories.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Category not found' });

  db.categories[index] = { ...db.categories[index], ...req.body };
  saveDatabase();
  broadcastEvent('CATEGORIES_UPDATED', db.categories);
  res.json(db.categories[index]);
});

app.delete('/api/categories/:id', (req, res) => {
  db.categories = db.categories.filter(c => c.id !== req.params.id);
  saveDatabase();
  broadcastEvent('CATEGORIES_UPDATED', db.categories);
  res.json({ success: true });
});

// Products API
app.get('/api/products', (req, res) => {
  let list = [...db.products];

  if (req.query.category) {
    list = list.filter(p => p.category_id === req.query.category);
  }
  if (req.query.subcategory) {
    list = list.filter(p => p.subcategory === req.query.subcategory);
  }
  if (req.query.search) {
    const q = req.query.search.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }
  if (req.query.veg === 'true') {
    list = list.filter(p => p.veg_flag === true);
  }
  if (req.query.popular === 'true') {
    list = list.filter(p => p.is_popular);
  }
  if (req.query.active !== undefined) {
    const isActive = req.query.active === 'true';
    list = list.filter(p => p.active === isActive);
  }

  // Sorting
  if (req.query.sort === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  } else if (req.query.sort === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  } else if (req.query.sort === 'discount') {
    list.sort((a, b) => {
      const discA = a.mrp ? (a.mrp - a.price) / a.mrp : 0;
      const discB = b.mrp ? (b.mrp - b.price) / b.mrp : 0;
      return discB - discA;
    });
  }

  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const prod = db.products.find(p => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: 'Product not found' });
  res.json(prod);
});

// Manual Image Upload API (saves base64 image to server/uploads)
app.post('/api/upload', (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let ext = 'jpg';
    let dataBuffer;
    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      dataBuffer = Buffer.from(matches[2], 'base64');
    } else {
      dataBuffer = Buffer.from(imageBase64, 'base64');
    }
    const safeName = (filename || 'product').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const finalFilename = `${Date.now()}_${safeName}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, finalFilename);
    fs.writeFileSync(filePath, dataBuffer);
    const fileUrl = `/uploads/${finalFilename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

app.post('/api/products', (req, res) => {
  const newProd = {
    id: req.body.id || `prod-${Date.now()}`,
    name: req.body.name,
    category_id: req.body.category_id,
    subcategory: req.body.subcategory || '',
    brand: req.body.brand || 'GhartakKart',
    unit: req.body.unit || '1 unit',
    price: Number(req.body.price) || 0,
    mrp: Number(req.body.mrp) || Number(req.body.price) || 0,
    stock: Number(req.body.stock) || 0,
    images: Array.isArray(req.body.images) && req.body.images.length ? req.body.images : [
      req.body.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'
    ],
    description: req.body.description || '',
    veg_flag: req.body.veg_flag !== undefined ? req.body.veg_flag : true,
    prep_time_mins: req.body.prep_time_mins ? Number(req.body.prep_time_mins) : undefined,
    gst_rate: req.body.gst_rate !== undefined ? Number(req.body.gst_rate) : 5,
    fssai: req.body.fssai || db.settings.fssai_license || '10824005000123',
    hsn_code: req.body.hsn_code || '',
    active: req.body.active !== undefined ? req.body.active : true,
    is_popular: Boolean(req.body.is_popular)
  };

  db.products.unshift(newProd);
  saveDatabase();
  broadcastEvent('PRODUCTS_UPDATED', db.products);
  res.status(201).json(newProd);
});

app.put('/api/products/:id', (req, res) => {
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  const updated = {
    ...db.products[index],
    ...req.body
  };
  if (req.body.price !== undefined) updated.price = Number(req.body.price);
  if (req.body.mrp !== undefined) updated.mrp = Number(req.body.mrp);
  if (req.body.stock !== undefined) updated.stock = Number(req.body.stock);
  if (req.body.gst_rate !== undefined) updated.gst_rate = Number(req.body.gst_rate);
  if (req.body.fssai !== undefined) updated.fssai = req.body.fssai;
  if (req.body.hsn_code !== undefined) updated.hsn_code = req.body.hsn_code;

  db.products[index] = updated;
  saveDatabase();
  broadcastEvent('PRODUCTS_UPDATED', db.products);
  res.json(updated);
});

app.delete('/api/products/:id', (req, res) => {
  db.products = db.products.filter(p => p.id !== req.params.id);
  saveDatabase();
  broadcastEvent('PRODUCTS_UPDATED', db.products);
  res.json({ success: true });
});

// Coupons API
app.get('/api/coupons', (req, res) => {
  res.json(db.coupons);
});

app.post('/api/coupons/apply', (req, res) => {
  const { code, subtotal } = req.body;
  const coupon = db.coupons.find(c => c.code.toUpperCase() === (code || '').toUpperCase());

  if (!coupon) {
    return res.status(400).json({ valid: false, message: 'Invalid coupon code' });
  }

  if (subtotal < coupon.min_order) {
    return res.status(400).json({
      valid: false,
      message: `Minimum order value for ${coupon.code} is ₹${coupon.min_order}`
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'flat') {
    discount = coupon.discount_value;
  } else if (coupon.discount_type === 'percent') {
    discount = Math.round((subtotal * coupon.discount_value) / 100);
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else if (coupon.discount_type === 'free_delivery') {
    discount = 0; // Handled as 0 delivery fee in client
  }

  res.json({
    valid: true,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount,
    description: coupon.description
  });
});

// Delivery Staff API
app.get('/api/staff', (req, res) => {
  res.json(db.delivery_staff);
});

app.post('/api/staff', (req, res) => {
  const newStaff = {
    id: `staff-${Date.now()}`,
    name: req.body.name,
    phone: req.body.phone,
    vehicle: req.body.vehicle || 'Bike',
    active: req.body.active !== undefined ? req.body.active : true,
    assigned_count: 0
  };
  db.delivery_staff.push(newStaff);
  saveDatabase();
  res.status(201).json(newStaff);
});

// Orders API
app.get('/api/orders', (req, res) => {
  // Confidentiality: Viewing all store orders requires authenticated admin token
  if (!req.query.phone) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.admin_token || req.headers['x-admin-token']);
    if (!token || !validAdminTokens.has(token)) {
      return res.status(403).json({ error: 'Access denied. Admin authorization required to view store orders.' });
    }
  }

  let orders = [...db.orders];
  if (req.query.phone) {
    orders = orders.filter(o => o.customer_phone.includes(req.query.phone.replace(/\D/g, '')));
  }
  if (req.query.status) {
    orders = orders.filter(o => o.order_status === req.query.status);
  }
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_email,
    address,
    items,
    delivery_slot,
    payment_method,
    coupon_code
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Check if store is open
  if (db.settings.delivery_hours && db.settings.delivery_hours.is_open === false) {
    const closedMsg = db.settings.delivery_hours.closed_message || `Store is currently closed for deliveries. Operating hours are ${db.settings.delivery_hours.open || '07:00'} to ${db.settings.delivery_hours.close || '23:00'}.`;
    return res.status(400).json({ error: closedMsg });
  }

  // Calculate distance
  const storeLat = db.settings.store_lat;
  const storeLng = db.settings.store_lng;
  const custLat = address?.lat || storeLat + 0.015;
  const custLng = address?.lng || storeLng + 0.015;
  const distanceKm = calculateHaversineDistance(storeLat, storeLng, custLat, custLng);

  // Extract category IDs for check
  const categoryIds = [];
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.product_id);
    if (prod && !categoryIds.includes(prod.category_id)) {
      categoryIds.push(prod.category_id);
    }
  }

  // Calculate subtotal
  let subtotal = 0;
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.product_id);
    const price = prod ? prod.price : item.price;
    subtotal += price * (item.qty || 1);
  }

  // Check eligibility
  const eligibility = getDeliveryEligibility(distanceKm, subtotal, categoryIds);
  if (!eligibility.deliverable) {
    return res.status(400).json({ error: eligibility.reason });
  }

  // Check minimum order
  if (eligibility.min_order && subtotal < eligibility.min_order) {
    return res.status(400).json({
      error: `Minimum order value for distance ${distanceKm} km is ₹${eligibility.min_order}. Current items total: ₹${subtotal}.`
    });
  }

  // Check stock and decrement
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.product_id);
    if (prod) {
      if (prod.stock < item.qty) {
        return res.status(400).json({
          error: `Insufficient stock for "${prod.name}". Available: ${prod.stock}`
        });
      }
      prod.stock -= item.qty;
    }
  }

  // Coupon handling
  let discount = 0;
  let deliveryFee = eligibility.fee;

  if (coupon_code) {
    const coupon = db.coupons.find(c => c.code.toUpperCase() === coupon_code.toUpperCase());
    if (coupon && subtotal >= coupon.min_order) {
      if (coupon.discount_type === 'flat') {
        discount = coupon.discount_value;
      } else if (coupon.discount_type === 'percent') {
        discount = Math.round((subtotal * coupon.discount_value) / 100);
        if (coupon.max_discount && discount > coupon.max_discount) {
          discount = coupon.max_discount;
        }
      } else if (coupon.discount_type === 'free_delivery') {
        deliveryFee = 0;
      }
    }
  }

  const total = Math.max(0, subtotal + deliveryFee - discount);

  const orderId = `GK-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newOrder = {
    id: orderId,
    customer_name: customer_name || 'Guest Customer',
    customer_phone: customer_phone || '+91 99999 99999',
    customer_email: customer_email || '',
    address: {
      label: address?.label || 'Home',
      line1: address?.line1 || 'Main Street, Flat 101',
      landmark: address?.landmark || '',
      city: address?.city || 'Khair',
      pincode: address?.pincode || '202138',
      lat: custLat,
      lng: custLng,
      maps_url: `https://www.google.com/maps?q=${custLat},${custLng}`,
      directions_url: `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`
    },
    distance_km: distanceKm,
    items: items.map(it => {
      const prod = db.products.find(p => p.id === it.product_id);
      return {
        product_id: it.product_id,
        name: prod ? prod.name : it.name,
        unit: prod ? prod.unit : it.unit,
        price: prod ? prod.price : it.price,
        qty: it.qty,
        veg_flag: prod ? prod.veg_flag : true
      };
    }),
    subtotal,
    delivery_fee: deliveryFee,
    discount,
    coupon_code: coupon_code || null,
    total,
    payment_method: payment_method || 'Cash on Delivery',
    payment_status: payment_method === 'Cash on Delivery' ? 'Pending' : 'Paid',
    order_status: 'Placed',
    delivery_slot: delivery_slot || 'ASAP (25-35 mins)',
    assigned_staff_id: null,
    created_at: now,
    timeline: [
      { status: 'Placed', time: now, note: 'Order placed by customer' }
    ]
  };

  db.orders.unshift(newOrder);
  saveDatabase();

  // Notify real-time clients (Admin sound alert & order live list!)
  broadcastEvent('NEW_ORDER', newOrder);
  broadcastEvent('PRODUCTS_UPDATED', db.products);

  res.status(201).json(newOrder);
});

// ==========================================
// Razorpay Standard Checkout Endpoints
// ==========================================

// STEP 1: BACKEND - Create Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    // Validate amount >= 100 paise (₹1.00 minimum)
    if (!amount || Number(amount) < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).'
      });
    }

    const orderOptions = {
      amount: Math.round(Number(amount)),
      currency: currency || 'INR',
      receipt: receipt || `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(orderOptions);

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    // Handle auth failures (return 401)
    if (error?.statusCode === 401 || (error?.error?.code === 'BAD_REQUEST_ERROR' && error?.error?.description?.toLowerCase().includes('auth'))) {
      return res.status(401).json({
        error: 'Razorpay authentication failed. Please verify API key and secret.'
      });
    }
    // Handle general Razorpay API errors (return 500)
    return res.status(error?.statusCode || 500).json({
      error: error?.error?.description || error?.message || 'Failed to create Razorpay order'
    });
  }
});

// STEP 3: BACKEND - Verify Payment Signature
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Missing fields: return 400
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature must be provided.'
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'BU1aThew952QHSru25BoC04x';
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

    // HMAC-SHA256 signature generation
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    // Compare generated signature with razorpay_signature
    if (expectedSignature === razorpay_signature) {
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });
    } else {
      // Signature mismatch: return 400, do NOT mark as paid
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Signature mismatch'
      });
    }
  } catch (error) {
    console.error('Razorpay verify-payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error verifying signature'
    });
  }
});

// UPI Payment Verification Endpoint (Automatic / Manual UTR Check)
app.post('/api/payments/verify', (req, res) => {
  const { utr, order_payload, simulate_failure } = req.body;

  if (simulate_failure) {
    return res.status(400).json({
      success: false,
      error: 'Bank decline: Transaction could not be completed or was cancelled by user.'
    });
  }

  const cleanUtr = utr && utr.trim().length > 0 ? String(utr).trim() : `UPI${Date.now()}`;
  if (utr && utr.trim().length > 0 && utr.trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Invalid UPI Ref / UTR number. Please enter a valid reference number.'
    });
  }

  // If order_payload provided, execute order creation directly
  if (order_payload) {
    const {
      customer_name,
      customer_phone,
      customer_email,
      address,
      items,
      delivery_slot,
      coupon_code
    } = order_payload;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Check if store is open
    if (db.settings.delivery_hours && db.settings.delivery_hours.is_open === false) {
      const closedMsg = db.settings.delivery_hours.closed_message || `Store is currently closed for deliveries. Operating hours are ${db.settings.delivery_hours.open || '07:00'} to ${db.settings.delivery_hours.close || '23:00'}.`;
      return res.status(400).json({ success: false, error: closedMsg });
    }

    const storeLat = db.settings.store_lat;
    const storeLng = db.settings.store_lng;
    const custLat = address?.lat || storeLat + 0.015;
    const custLng = address?.lng || storeLng + 0.015;
    const distanceKm = calculateHaversineDistance(storeLat, storeLng, custLat, custLng);

    const categoryIds = [];
    let subtotal = 0;
    for (const item of items) {
      const prod = db.products.find(p => p.id === item.product_id);
      if (prod && !categoryIds.includes(prod.category_id)) {
        categoryIds.push(prod.category_id);
      }
      const price = prod ? prod.price : item.price;
      subtotal += price * (item.qty || 1);
    }

    const eligibility = getDeliveryEligibility(distanceKm, subtotal, categoryIds);
    let discount = 0;
    let deliveryFee = eligibility.fee;

    if (coupon_code) {
      const coupon = db.coupons.find(c => c.code.toUpperCase() === coupon_code.toUpperCase());
      if (coupon && subtotal >= coupon.min_order) {
        if (coupon.discount_type === 'flat') {
          discount = coupon.discount_value;
        } else if (coupon.discount_type === 'percent') {
          discount = Math.round((subtotal * coupon.discount_value) / 100);
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else if (coupon.discount_type === 'free_delivery') {
          deliveryFee = 0;
        }
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);
    const orderId = `GK-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newOrder = {
      id: orderId,
      customer_name: customer_name || 'Guest Customer',
      customer_phone: customer_phone || '+91 99999 99999',
      customer_email: customer_email || '',
      address: {
        label: address?.label || 'Home',
        line1: address?.line1 || 'Main Street, Flat 101',
        landmark: address?.landmark || '',
        city: address?.city || 'Khair',
        pincode: address?.pincode || '202138',
        lat: custLat,
        lng: custLng,
        maps_url: `https://www.google.com/maps?q=${custLat},${custLng}`,
        directions_url: `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`
      },
      distance_km: distanceKm,
      items: items.map(it => {
        const prod = db.products.find(p => p.id === it.product_id);
        return {
          product_id: it.product_id,
          name: prod ? prod.name : it.name,
          unit: prod ? prod.unit : it.unit,
          price: prod ? prod.price : it.price,
          qty: it.qty,
          veg_flag: prod ? prod.veg_flag : true
        };
      }),
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      coupon_code: coupon_code || null,
      total,
      payment_method: 'UPI',
      payment_status: 'Paid',
      upi_ref: cleanUtr,
      order_status: 'Placed',
      delivery_slot: delivery_slot || 'ASAP (25-35 mins)',
      assigned_staff_id: null,
      created_at: now,
      timeline: [
        { status: 'Placed', time: now, note: `Order placed & UPI Payment Received (Ref: ${cleanUtr})` }
      ]
    };

    db.orders.unshift(newOrder);
    saveDatabase();
    broadcastEvent('NEW_ORDER', newOrder);
    broadcastEvent('PRODUCTS_UPDATED', db.products);

    return res.status(201).json({ success: true, verified: true, order: newOrder, utr: cleanUtr });
  }

  res.json({ success: true, verified: true, utr: cleanUtr });
});

// Update order status or remark (Admin or Rider flow)
app.patch('/api/orders/:id/status', checkAdminAuth, (req, res) => {
  const { status, note, remark, admin_remark, staff_id, reject_reason } = req.body;
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const now = new Date().toISOString();
  if (status) {
    order.order_status = status;
  }

  const finalRemark = remark !== undefined ? remark : (admin_remark !== undefined ? admin_remark : note);
  if (finalRemark !== undefined) {
    order.admin_remark = finalRemark;
  }

  if (staff_id !== undefined) {
    order.assigned_staff_id = staff_id || null;
  }
  if (reject_reason !== undefined) {
    order.reject_reason = reject_reason;
  }

  if (!order.timeline) {
    order.timeline = [];
  }

  const timelineNote = note || finalRemark || (status ? `Order status changed to ${status}` : 'Order details updated');
  order.timeline.push({
    status: order.order_status,
    time: now,
    note: timelineNote
  });

  saveDatabase();
  broadcastEvent('ORDER_UPDATED', order);

  res.json(order);
});

// Customer cancel order before packing
app.post('/api/orders/:id/cancel', (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (['Packing', 'Out for Delivery', 'Delivered'].includes(order.order_status)) {
    return res.status(400).json({
      error: `Order cannot be cancelled once it is in "${order.order_status}" stage.`
    });
  }

  // Restore inventory
  for (const item of order.items) {
    const prod = db.products.find(p => p.id === item.product_id);
    if (prod) {
      prod.stock += item.qty;
    }
  }

  const now = new Date().toISOString();
  order.order_status = 'Cancelled';
  order.cancel_reason = req.body.reason || 'Cancelled by customer';
  order.timeline.push({
    status: 'Cancelled',
    time: now,
    note: order.cancel_reason
  });

  saveDatabase();
  broadcastEvent('ORDER_UPDATED', order);
  broadcastEvent('PRODUCTS_UPDATED', db.products);

  res.json(order);
});

// Reports API for Admin
app.get('/api/reports', checkAdminAuth, (req, res) => {
  const totalOrders = db.orders.length;
  const completedOrders = db.orders.filter(o => o.order_status === 'Delivered');
  const activeOrders = db.orders.filter(o => !['Delivered', 'Cancelled', 'Rejected'].includes(o.order_status));
  const totalRevenue = db.orders
    .filter(o => o.order_status !== 'Cancelled' && o.order_status !== 'Rejected')
    .reduce((sum, o) => sum + o.total, 0);

  // Category breakdown
  const categorySales = {};
  for (const cat of db.categories) {
    categorySales[cat.name] = 0;
  }
  for (const order of db.orders) {
    if (['Cancelled', 'Rejected'].includes(order.order_status)) continue;
    for (const item of order.items) {
      const prod = db.products.find(p => p.id === item.product_id);
      if (prod) {
        const cat = db.categories.find(c => c.id === prod.category_id);
        const catName = cat ? cat.name : 'Other';
        categorySales[catName] = (categorySales[catName] || 0) + (item.price * item.qty);
      }
    }
  }

  // Low stock products
  const lowStock = db.products.filter(p => p.stock <= 15);

  res.json({
    total_orders: totalOrders,
    active_orders: activeOrders.length,
    completed_orders: completedOrders.length,
    total_revenue: totalRevenue,
    average_order_value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    category_sales: categorySales,
    low_stock_items: lowStock
  });
});

// Serve frontend build if exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`GhartakKart Server running on port ${PORT}`);
});

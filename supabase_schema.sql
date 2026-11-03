-- ========================================================
-- GhartakKart Supabase Database Schema
-- Run this in your Supabase SQL Editor (1-Click Setup)
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Settings (KeyValue or Single Row)
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  max_radius_km NUMERIC DEFAULT 10,
  subcategories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  price NUMERIC NOT NULL,
  mrp NUMERIC,
  unit TEXT DEFAULT '1 unit',
  stock NUMERIC DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  image TEXT,
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customer Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  wallet_used NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash on Delivery',
  payment_status TEXT DEFAULT 'Pending',
  order_status TEXT DEFAULT 'Placed',
  timeline JSONB DEFAULT '[]'::jsonb,
  delivery_partner JSONB,
  scratch_card JSONB,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Customer Wallets
CREATE TABLE IF NOT EXISTS customer_wallets (
  phone TEXT PRIMARY KEY,
  balance NUMERIC NOT NULL DEFAULT 0,
  history JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Blocked Customers (Anti-Fake Orders Protection)
CREATE TABLE IF NOT EXISTS blocked_customers (
  phone TEXT PRIMARY KEY,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Offers & Coupons
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT,
  discount_percent NUMERIC DEFAULT 0,
  discount_flat NUMERIC DEFAULT 0,
  min_order NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Milestone Gifts
CREATE TABLE IF NOT EXISTS milestone_gifts (
  id TEXT PRIMARY KEY,
  min_amount NUMERIC NOT NULL,
  title TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Delivery Staff & Fleets
CREATE TABLE IF NOT EXISTS delivery_staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'offline',
  current_location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow public read/write for client application
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_staff ENABLE ROW LEVEL SECURITY;

-- Public Access Policies (anon key access)
CREATE POLICY "Public full access store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access customer_wallets" ON customer_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access blocked_customers" ON blocked_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access offers" ON offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access milestone_gifts" ON milestone_gifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access delivery_staff" ON delivery_staff FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for live order tracking
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE customer_wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;

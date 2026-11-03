# 🛒 GhartakKart - Hyperlocal Delivery Platform (Khair)
> **"Fresh to Home, Fast to You."**
> Hyperlocal delivery website for Grocery, Fast Food, Vegetables, Fruits & Personal Care with a separate, secured Admin Portal and 0 to 10 km radius enforcement.

---

## 🔐 Admin Portal Credentials
The Admin Portal is separated from the customer storefront with a login gateway:

- **Admin Portal URL**: Click **"Admin Portal Login"** in the footer of `http://localhost:5000` or navigate directly to:
  ```
  http://localhost:5000/#admin
  ```
- **Username**: `ghartakkartkhair`
- **Password**: `Ganesh@#$4001`
- **Features**:
  - Live order feed with audio chimes.
  - Customer **Live Shared GPS Location** with one-click **"Open in Google Maps"** & **"Navigate / Directions"**.
  - Order status updates (`Placed` → `Accepted` → `Packing` → `Out for Delivery` → `Delivered` → `Cancelled`).
  - Rider assignment from delivery fleet.
  - Printable **Tax Invoice & Packing Slip** with customer coordinates and maps link.
  - Product & category catalog editor with custom radius limits.
  - Radius slider (0–10 km) and fee slabs configurator.
  - Instant CSV export.

---

## 📍 Customer Live Location & GPS Tracking for Admin
When any customer sets their delivery pin and places an order:
1. Exact GPS Latitude and Longitude (e.g. `27.94720, 77.84150`) are captured with the order.
2. The Admin order card displays a green **"📍 Customer Shared Live Location"** panel.
3. With 1 click, the Store Manager or Delivery Rider can:
   - Click **"Open in Google Maps"**: Views the exact map pin.
   - Click **"Navigate / Directions"**: Launches Google Maps turn-by-turn navigation directly to the customer's doorstep!

---

## 🧹 Presaved Data Status
- **Orders**: Reset to **0** (completely fresh and clean).
- **Customer Profiles**: Removed all pre-filled dummy names, mock addresses, and hardcoded numbers. Fresh visitors start clean.
- **Store Location**: Centered at **Khair, Aligarh, Uttar Pradesh (27.9463, 77.8398)** with preset neighborhood test points.

---

## 🚀 Running the Project
The application is live and running at:
```
http://localhost:5000
```

# GhartakKart — Production Deployment & Publishing Guide

This guide explains how to deploy and publish **GhartakKart** online for live customers within minutes.

---

## 🚀 Quick Overview
- **Architecture**: Single unified Node.js/Express service that serves both the API (`/api/*`) and the high-performance React (Vite) frontend (`/`).
- **Default Port**: Listens on `process.env.PORT || 5000`.
- **Database**: JSON persistence located at `server/data/store_db.json`.
- **Admin Credentials**:
  - **Username**: `ghartakkartkhair`
  - **Password**: `Ganesh@#$4001`
- **Store UPI ID**: `9058564391@ptsbi`

---

## Option 1: 1-Click Free / Low-Cost Deployment (Render.com) — *Recommended*

Render allows you to deploy Node.js web services with zero server maintenance.

1. **Push your code to GitHub / GitLab**:
   ```bash
   git init
   git add .
   git commit -m "Production release of GhartakKart"
   git remote add origin https://github.com/YOUR_USERNAME/ghartakkart.git
   git branch -M main
   git push -u origin main
   ```

2. **Create a Web Service on Render**:
   - Go to [https://dashboard.render.com](https://dashboard.render.com)
   - Click **New +** → **Web Service**
   - Connect your GitHub repository.

3. **Configure Settings**:
   - **Name**: `ghartakkart`
   - **Environment**: `Node`
   - **Region**: Singapore or Frankfurt (choose nearest to India)
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: Free or Starter ($7/mo for 24/7 uptime)

4. **Add Disk for Persistent Storage (Important for image uploads & DB)**:
   - In Render Dashboard → Your Service → **Disks**
   - Click **Add Disk**
   - Mount Path: `/opt/render/project/src/server/data` (or keep backups synced)

5. Click **Create Web Service**. Your site will be live at `https://ghartakkart.onrender.com`!

---

## Option 2: Railway.app Deployment

1. Go to [https://railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository.
4. In **Settings** → **Build & Start**:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Railway automatically generates a secure `https://...up.railway.app` URL and SSL certificate.

---

## Option 3: VPS / Cloud Server (Ubuntu 22.04 / 24.04 on DigitalOcean, AWS EC2, or Hostinger)

If you have your own VPS:

1. **Install Node.js & Git**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git nginx
   sudo npm install -g pm2
   ```

2. **Clone & Build the App**:
   ```bash
   cd /var/www
   git clone <YOUR_GIT_REPO_URL> ghartakkart
   cd ghartakkart
   npm install
   npm run build
   ```

3. **Start with PM2 (Auto-restart on reboot)**:
   ```bash
   pm2 start server/index.js --name "ghartakkart"
   pm2 startup
   pm2 save
   ```

4. **Setup Nginx Reverse Proxy with SSL**:
   Create `/etc/nginx/sites-available/ghartakkart`:
   ```nginx
   server {
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Enable and get free SSL with Certbot:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ghartakkart /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

---

## 🔒 Security & Admin Access
- The customer storefront is at the root URL: `/`.
- There are **no visible admin passwords or prefilled credentials** anywhere on the customer storefront.
- To access the merchant panel: Click **"Admin Portal"** in the footer or visit directly.
- Only users with valid credentials (`ghartakkartkhair` / `Ganesh@#$4001`) can access store management, view orders, edit products, or change settings.
- All customer phone orders and GPS location shares are strictly protected and only accessible by authenticated store admins.

---

## 🖨️ Thermal Printer Setup (80mm ESC/POS)
1. In the Admin Panel, click **"Print Receipt"** on any order.
2. Select your 80mm thermal receipt printer (e.g. TVS, Epson, Everycom, NGX).
3. The receipt prints immediately with 0 margin, monospace formatting, customer GPS location link, and itemized totals.

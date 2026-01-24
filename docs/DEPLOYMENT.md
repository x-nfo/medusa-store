# Production Deployment Guide

This guide covers deploying the Mastro Store (Medusa v2 backend + Astro storefront) to production.

## Prerequisites

- **Node.js**: >= 20.x (for manual deployment)
- **Docker & Docker Compose**: >= 24.x (for containerized deployment)
- **PostgreSQL**: >= 14.x (included in Docker Compose)

---

## Quick Start with Docker (Recommended)

1. Copy environment template:

   ```bash
   cp .env.docker.example .env
   ```

2. Edit `.env` with your production values (secrets, API keys, etc.)

3. Build and start all services:

   ```bash
   docker-compose up -d --build
   ```

4. Run database migrations:

   ```bash
   docker-compose exec backend npx medusa db:migrate
   ```

5. (Optional) Seed initial data:

   ```bash
   docker-compose exec backend npm run seed
   ```

**Services will be available at:**

- Backend API: `http://localhost:9000`
- Storefront: `http://localhost:4321`
- Admin Dashboard: `http://localhost:9000/app`

### Docker Commands

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f storefront

# Restart services
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## Storefront: Cloudflare Pages Deployment

The storefront uses Astro with the Cloudflare adapter for optimal edge performance.

### Option A: Deploy via Cloudflare Dashboard (Recommended)

1. Push your code to GitHub/GitLab
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > **Pages** > **Create a project**
3. Connect your repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `storefront`
5. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `PUBLIC_MEDUSA_BACKEND_URL` | `https://api.yourdomain.com` |
   | `PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Your publishable key |
   | `PUBLIC_MIDTRANS_CLIENT_KEY` | Your Midtrans client key |
   | `PUBLIC_MIDTRANS_URL` | `https://app.midtrans.com/snap/snap.js` |
   | `PUBLIC_MIDTRANS_IS_PRODUCTION` | `true` |
   | `PUBLIC_RAJAONGKIR_ORIGIN_CITY_ID` | `153` |

6. Deploy!

### Option B: Deploy via CLI

```bash
cd storefront
npm run deploy
```

This will build and deploy using wrangler. You'll need to authenticate first:

```bash
npx wrangler login
```

### Local Preview (Cloudflare Workers Runtime)

```bash
cd storefront
npm run build
npm run preview:cf
```

---

## Manual Deployment (Backend Only)

## 1. Environment Setup

### Backend

1. Copy environment template:

   ```bash
   cd backend
   cp .env.production.template .env
   ```

2. Configure required variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` & `COOKIE_SECRET` - Generate secure secrets:

     ```bash
     openssl rand -base64 32
     ```

   - `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` - Your production domains

3. Configure third-party services:
   - **Resend**: Get API key from [resend.com](https://resend.com), verify your domain
   - **Midtrans**: Get production keys from Midtrans Dashboard, set `MIDTRANS_IS_PRODUCTION=true`
   - **RajaOngkir/Komerce**: Get production API keys, update base URLs to production

### Storefront

1. Copy environment template:

   ```bash
   cd storefront
   cp .env.production.template .env
   ```

2. Configure:
   - `PUBLIC_MEDUSA_BACKEND_URL` - Your backend API URL
   - `PUBLIC_MIDTRANS_URL` - Production Snap URL: `https://app.midtrans.com/snap/snap.js`
   - `PUBLIC_MIDTRANS_IS_PRODUCTION=true`

## 2. Build

### Backend

```bash
cd backend
npm install
npm run build
```

Output: `.medusa/server` directory

### Storefront

```bash
cd storefront
npm install
npm run build
```

Output: `dist/` directory

## 3. Database Migration

Run migrations on production database:

```bash
cd backend
npx medusa db:migrate
```

To seed initial data (optional for fresh installs):

```bash
npm run seed
```

## 4. Start Application

### Backend

```bash
cd backend
npm run start
```

Or with PM2:

```bash
pm2 start npm --name "medusa-backend" -- run start
```

### Storefront

```bash
cd storefront
node ./dist/server/entry.mjs
```

Or with PM2:

```bash
pm2 start ./dist/server/entry.mjs --name "storefront"
```

## 5. CORS Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `STORE_CORS` | Storefront domain(s) | `https://yourdomain.com` |
| `ADMIN_CORS` | Admin dashboard domain(s) | `https://admin.yourdomain.com` |
| `AUTH_CORS` | All domains that use auth | `https://yourdomain.com,https://admin.yourdomain.com` |

> **Note**: Separate multiple domains with commas (no spaces).

## 6. Third-Party Service Setup

### Midtrans

1. Log into [Midtrans Dashboard](https://dashboard.midtrans.com)
2. Go to Settings > Access Keys
3. Copy **Production** Server Key and Client Key
4. Configure webhook URL under Settings > Configuration > Notification URL
5. Set to: `https://api.yourdomain.com/webhooks/midtrans`

### RajaOngkir (Komerce)

1. Log into [Komerce Dashboard](https://komerce.id)
2. Get your production API keys
3. **Important**: Top up your collaborator balance for prepaid shipping

> **Note**: Production uses `https://api.collaborator.komerce.id/` (not sandbox)

### Resend

1. Log into [Resend Dashboard](https://resend.com)
2. Add and verify your sending domain
3. Get your API key
4. Set `RESEND_FROM_EMAIL` to an email on your verified domain

### Cloudflare R2 (File Storage)

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2 Object Storage** > **Create Bucket**
3. Note your bucket name

4. Create R2 API Token:
   - Go to **R2** > **Manage R2 API Tokens** > **Create API Token**
   - Select permissions: **Object Read & Write**
   - Copy **Access Key ID** and **Secret Access Key**

5. Get your Account ID:
   - Found in the R2 dashboard URL or Overview page
   - Endpoint format: `https://{account-id}.r2.cloudflarestorage.com`

6. Configure public access (choose one):
   - **Custom Domain (recommended)**: R2 > Bucket Settings > Custom Domains > Add
   - **R2.dev URL (dev only)**: R2 > Bucket Settings > Public Access > Enable

7. Set CORS policy:
   - R2 > Bucket Settings > CORS Policy > Add

   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com", "https://admin.yourdomain.com"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

## 7. Production Checklist

- [ ] Secure secrets (JWT_SECRET, COOKIE_SECRET) generated
- [ ] HTTPS/SSL configured for all domains
- [ ] Database backups configured
- [ ] Midtrans production keys configured
- [ ] Midtrans webhook URL set
- [ ] RajaOngkir production keys configured
- [ ] Komerce balance topped up (for prepaid shipping)
- [ ] Resend domain verified
- [ ] CORS configured for production domains
- [ ] Error monitoring set up (optional)
- [ ] Logging configured (optional)

## Troubleshooting

### "Insufficient Balance" from RajaOngkir

You need to top up your Komerce collaborator balance. Log into Komerce dashboard and add funds.

### Midtrans webhook not received

1. Verify webhook URL is accessible from the internet
2. Check Midtrans dashboard for failed notifications
3. Ensure HTTPS is properly configured

### CORS errors

Ensure all frontend domains are listed in the appropriate CORS variables. Remember to include both `http://` and `https://` if needed during testing.

# Production Deployment Guide

This guide covers deploying ChainCheck to production environments. The project consists of three main components that can be deployed independently or together.

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Backend Deployment](#backend-deployment)
4. [Web Dashboard Deployment](#web-dashboard-deployment)
5. [Mobile App Distribution](#mobile-app-distribution)
6. [Database Setup](#database-setup)
7. [Environment Configuration](#environment-configuration)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Platform-Specific Guides](#platform-specific-guides)
10. [Troubleshooting](#troubleshooting)

## Overview

ChainCheck is a monorepo with three deployable components:

- **Backend** (`backend/`): Express.js API server (Node.js)
- **Web Dashboard** (`web/`): Next.js web application
- **Mobile App** (`mobile/`): Expo React Native app (distributed via app stores)

### Deployment Architecture

```
┌─────────────────┐
│  Web Dashboard  │  (Next.js on Vercel/Railway/etc.)
│   (Port 3000)   │
└────────┬────────┘
         │
         │ API Calls
         │
┌────────▼────────┐
│  Backend API    │  (Express on Railway/Render/AWS/etc.)
│   (Port 4000)   │
└────────┬────────┘
         │
         ├──► PostgreSQL Database
         ├──► XYO Network (XL1 Blockchain)
         ├──► Pinata/IPFS (Photo/Signature Storage)
         └──► XYO Archivist/Diviner
```

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All environment variables are configured (see [Environment Configuration](#environment-configuration))
- [ ] PostgreSQL database is provisioned and accessible
- [ ] XYO API key is obtained and configured
- [ ] Pinata API keys are configured (for photo/signature uploads)
- [ ] JWT secret is generated (use `openssl rand -base64 32`)
- [ ] XL1 wallet mnemonic is configured (for real blockchain transactions)
- [ ] Mapbox access token is configured (for web and mobile maps)
- [ ] Domain names are configured (if using custom domains)
- [ ] SSL certificates are configured (HTTPS required for production)
- [ ] Database migrations are run (`npx prisma migrate deploy`)
- [ ] Health check endpoints are tested (`/health`, `/api/server-status`)

## Backend Deployment

### Option 1: Railway (Recommended for Simplicity)

Railway provides PostgreSQL, automatic deployments, and environment variable management.

**Steps:**

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Create a new project

2. **Add PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will provide `DATABASE_URL` automatically

3. **Deploy Backend**
   - Click "New" → "GitHub Repo" → Select your ChainCheck repository
   - Railway will detect it's a Node.js project
   - Set root directory to `backend/`
   - Railway will auto-detect build commands

4. **Configure Environment Variables**
   - Go to "Variables" tab
   - Add all required variables from `backend/env.example`
   - Railway will automatically inject `DATABASE_URL` from PostgreSQL service

5. **Set Build Command**
   - Build command: `npm run build`
   - Start command: `npm start`

6. **Deploy**
   - Railway will automatically deploy on push to main branch
   - Check logs for deployment status

**Railway Environment Variables:**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=<auto-provided-by-railway>
XYO_API_KEY=your_xyo_api_key
WEB_URL=https://your-web-domain.com
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
JWT_SECRET=<generated-secret>
XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase
XYO_ARCHIVIST_URL=https://api.archivist.xyo.network
XYO_DIVINER_URL=https://api.location.diviner.xyo.network
XYO_CHAIN_RPC_URL=https://beta.api.chain.xyo.network/rpc
XYO_CHAIN_ID=dd381fbb392c85160d8b0453e446757b12384046
MOCK_XL1_TRANSACTIONS=false
```

### Option 2: Render

Render provides similar functionality to Railway with PostgreSQL support.

**Steps:**

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)

2. **Create PostgreSQL Database**
   - New → PostgreSQL
   - Note the connection string

3. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Settings:
     - **Root Directory**: `backend`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: Node

4. **Configure Environment Variables**
   - Add all variables from `backend/env.example`
   - Use the PostgreSQL connection string for `DATABASE_URL`

5. **Deploy**
   - Render will deploy automatically on push

### Option 3: AWS (EC2/ECS/Lambda)

For AWS deployment, you have several options:

#### AWS EC2 (Traditional Server)

1. **Launch EC2 Instance**
   - Use Ubuntu 22.04 LTS
   - Security group: Allow ports 4000 (backend) and 22 (SSH)

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm postgresql-client
   # Install Node.js 18+ using nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   ```

3. **Clone and Setup**
   ```bash
   git clone https://github.com/xyo-geohacker/chaincheck.git
   cd chaincheck/backend
   npm install
   npm run build
   ```

4. **Configure Environment**
   - Create `.env` file with production values
   - Use AWS Secrets Manager for sensitive values

5. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

6. **Start with PM2**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name chaincheck-backend
   pm2 save
   pm2 startup
   ```

#### AWS ECS (Containerized)

1. **Create Dockerfile** (see [Docker Deployment](#docker-deployment) below)
2. **Build and Push to ECR**
3. **Create ECS Task Definition**
4. **Deploy to ECS Cluster**

### Option 4: Docker Deployment

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY dist ./dist/

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

**Build and Run:**
```bash
cd backend
docker build -t chaincheck-backend .
docker run -p 4000:4000 --env-file .env chaincheck-backend
```

## Web Dashboard Deployment

### Option 1: Vercel (Recommended for Next.js)

Vercel is the recommended platform for Next.js applications.

**Steps:**

1. **Create Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Connect GitHub account

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your ChainCheck repository
   - Set root directory to `web/`

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

4. **Configure Environment Variables**
   - Add `NEXT_PUBLIC_API_URL` (your backend URL)
   - Add `NEXT_PUBLIC_MAPBOX_TOKEN`

5. **Deploy**
   - Vercel will deploy automatically on push
   - Custom domain can be configured in project settings

**Vercel Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
```

### Option 2: Netlify

1. **Create Netlify Account**
   - Sign up at [netlify.com](https://netlify.com)

2. **Import Project**
   - New site from Git → Select repository
   - Build settings:
     - Base directory: `web`
     - Build command: `npm run build`
     - Publish directory: `web/.next`

3. **Configure Environment Variables**
   - Site settings → Environment variables
   - Add `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN`

### Option 3: Self-Hosted (Docker)

Create `web/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

**Note:** Requires Next.js standalone output. Update `next.config.js`:

```javascript
module.exports = {
  output: 'standalone',
  // ... other config
}
```

## Mobile App Distribution

The mobile app is built with Expo and can be distributed via:

### Option 1: Expo Application Services (EAS)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**
   ```bash
   cd mobile
   eas build:configure
   ```

3. **Build for Production**
   ```bash
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

4. **Submit to App Stores**
   ```bash
   # iOS (App Store)
   eas submit --platform ios
   
   # Android (Google Play)
   eas submit --platform android
   ```

### Option 2: Local Builds

1. **iOS (macOS only)**
   ```bash
   cd mobile
   npm run ios -- --configuration Release
   ```

2. **Android**
   ```bash
   cd mobile
   npm run android -- --mode release
   ```

## Database Setup

### Production PostgreSQL

**Recommended Providers:**
- **Railway**: Integrated PostgreSQL (easiest)
- **Render**: Managed PostgreSQL
- **Supabase**: PostgreSQL with additional features
- **AWS RDS**: Enterprise-grade PostgreSQL
- **DigitalOcean**: Managed PostgreSQL

**Database Configuration:**
- Use connection pooling (PgBouncer recommended)
- Enable SSL/TLS connections
- Set up automated backups
- Configure appropriate instance size for expected load

**Run Migrations:**
```bash
cd backend
npx prisma migrate deploy
```

**Note:** Use `migrate deploy` (not `migrate dev`) in production.

## Environment Configuration

### Production Environment Variables

**Backend (`backend/.env`):**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/chaincheck?sslmode=require
XYO_API_KEY=your_xyo_api_key
WEB_URL=https://your-web-domain.com
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
JWT_SECRET=<generate-with-openssl-rand-base64-32>
XYO_WALLET_MNEMONIC=your twelve word mnemonic phrase here
XYO_ARCHIVIST_URL=https://api.archivist.xyo.network
XYO_DIVINER_URL=https://api.location.diviner.xyo.network
XYO_CHAIN_RPC_URL=https://beta.api.chain.xyo.network/rpc
XYO_CHAIN_ID=dd381fbb392c85160d8b0453e446757b12384046
MOCK_XL1_TRANSACTIONS=false
```

**Web (`web/.env.production`):**
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
```

**Mobile (`mobile/.env.production`):**
```env
EXPO_PUBLIC_API_URL=https://your-backend-domain.com
EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
```

### Security Best Practices

1. **Never commit `.env` files** - Use platform environment variable management
2. **Use secrets management** - AWS Secrets Manager, HashiCorp Vault, etc.
3. **Rotate secrets regularly** - Especially JWT secrets and API keys
4. **Use different secrets per environment** - Dev, staging, production
5. **Enable SSL/TLS** - All production endpoints must use HTTPS
6. **Restrict database access** - Use IP whitelisting and SSL connections

## Monitoring & Health Checks

### Health Check Endpoints

**Backend:**
- `GET /health` - Basic health check
- `GET /api/server-status` - Detailed service status (requires auth)

**Expected Response:**
```json
{
  "status": "ok",
  "uptime": 12345.67
}
```

### Monitoring Setup

**Recommended Tools:**
- **Uptime Monitoring**: UptimeRobot, Pingdom, StatusCake
- **Error Tracking**: Sentry, Rollbar, Bugsnag
- **Application Performance**: New Relic, Datadog, AppDynamics
- **Logging**: LogRocket, Papertrail, CloudWatch

**Health Check Configuration:**
- Check interval: 1-5 minutes
- Timeout: 5 seconds
- Alert on: 2+ consecutive failures

## Platform-Specific Guides

### Railway

**Advantages:**
- Integrated PostgreSQL
- Automatic HTTPS
- Zero-config deployments
- Environment variable management

**Limitations:**
- Limited customization
- Pricing based on usage

### Render

**Advantages:**
- Free tier available
- PostgreSQL included
- Automatic SSL
- Easy scaling

**Limitations:**
- Services sleep on free tier
- Limited customization

### Vercel (Web Only)

**Advantages:**
- Optimized for Next.js
- Global CDN
- Automatic deployments
- Free tier available

**Limitations:**
- Next.js only
- Serverless functions have limits

### AWS

**Advantages:**
- Enterprise-grade
- Highly customizable
- Scalable
- Global infrastructure

**Limitations:**
- Complex setup
- Requires AWS knowledge
- Higher cost

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check all required environment variables are set
- Verify database connection string
- Check logs for specific errors
- Ensure port is not already in use

**Database connection errors:**
- Verify `DATABASE_URL` format
- Check database is accessible from deployment platform
- Ensure SSL is configured if required
- Verify database credentials

**Build failures:**
- Check Node.js version (18.18.0+)
- Verify all dependencies install correctly
- Check for TypeScript errors
- Review build logs

**Health check failures:**
- Verify `/health` endpoint is accessible
- Check CORS configuration
- Verify firewall/security group settings
- Test endpoint manually with `curl`

### Getting Help

- Check [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) for detailed setup
- Review [Troubleshooting](../DEVELOPMENT_GUIDE.md#troubleshooting) section
- Open an issue on GitHub
- Check platform-specific documentation

## Next Steps

After deployment:

1. **Test all endpoints** - Verify API functionality
2. **Test mobile app** - Connect to production backend
3. **Monitor logs** - Watch for errors
4. **Set up alerts** - Configure monitoring
5. **Document URLs** - Keep track of production URLs
6. **Backup database** - Set up automated backups
7. **Review security** - Ensure all security measures are in place

---

**Last Updated**: November 2025


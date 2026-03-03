# Deployment Guide

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository

### Steps

1. Push your code to GitHub

2. Import project in Vercel:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select `frontend` as root directory

3. Configure environment variables in Vercel:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=your-backend-url
   ```

4. Deploy settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Deploy!

### Custom Domain (Optional)
- Add your custom domain in Vercel project settings
- Update DNS records as instructed

## Backend Deployment (Render)

### Prerequisites
- Render account
- GitHub repository

### Steps

1. Create new Web Service in Render:
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select `backend` as root directory

2. Configure service:
   - Name: `inventory-backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: Choose based on needs (Free tier available)

3. Add environment variables:
   ```
   SUPABASE_URL=
   SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_KEY=
   FRONTEND_URL=https://your-frontend-url.vercel.app
   SHOPIFY_REDIRECT_URI=https://your-backend-url.onrender.com/api/shopify/callback
   SHOPIFY_WEBHOOK_SECRET=
   PORT=3002
   NODE_ENV=production
   TZ=Africa/Cairo
   ```

4. Deploy!

5. Update Shopify webhooks to point to your Render URL:
   - `https://your-app.onrender.com/api/webhooks/shopify`

## Backend Deployment (Fly.io) - Alternative

### Prerequisites
- Fly.io account
- Fly CLI installed

### Steps

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login:
   ```bash
   fly auth login
   ```

3. Create `fly.toml` in backend directory:
   ```toml
   app = "inventory-backend"
   
   [build]
     builder = "heroku/buildpacks:20"
   
   [env]
     PORT = "8080"
     NODE_ENV = "production"
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = 80
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

4. Deploy:
   ```bash
   cd backend
   fly launch
   fly secrets set SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx ...
   fly deploy
   ```

## Post-Deployment

### 1. Update Frontend API URL
Update `VITE_API_URL` in Vercel to point to your deployed backend

### 2. Configure Shopify Webhooks
In each Shopify store admin:
- Settings → Notifications → Webhooks
- Add webhooks pointing to: `https://your-backend-url/api/webhooks/shopify`
- Topics: inventory_levels/update, orders/create, orders/paid, orders/cancelled, refunds/create, products/update

### 3. Seed Database
Run seed script once:
```bash
# SSH into your backend server or run locally with production DB
npm run seed
```

### 4. Create First Admin User
1. Sign up through the app with the first account.
2. The first account is promoted to `admin` automatically by the signup trigger.

## Monitoring

### Logs
- Vercel: Check deployment logs in dashboard
- Render: View logs in service dashboard
- Fly.io: `fly logs`

### Health Check
- Backend: `https://your-backend-url/health`

### Scheduled Jobs
Verify cron job is running:
- Check logs at 18:00 Africa/Cairo daily
- Verify notifications are created

## Troubleshooting

### Webhook Issues
- Check HMAC secret matches in Shopify and backend
- Verify webhook URL is accessible
- Check Shopify webhook logs for delivery status

### Database Connection
- Verify Supabase credentials
- Check RLS policies are enabled
- Ensure service key is used in backend

### CORS Issues
- Update CORS settings in backend if needed
- Verify frontend URL is allowed

## Scaling

### Database
- Monitor Supabase usage
- Add indexes for slow queries
- Consider upgrading Supabase plan

### Backend
- Increase instance size in Render/Fly
- Add horizontal scaling if needed
- Consider Redis for caching

### Frontend
- Vercel handles scaling automatically
- Monitor bandwidth usage

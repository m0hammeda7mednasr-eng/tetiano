# 🏪 Tetiano Inventory System

Professional multi-store inventory management system with Shopify integration.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)](COMPLETE_FIX_PLAN.md)

---

## ✨ Features

- 📦 **Inventory Management** - Track products, variants, and stock levels
- 🛍️ **Shopify Integration** - Seamless OAuth connection and real-time sync
- 📊 **Order Tracking** - Monitor orders, customers, and sales
- 👥 **Team Management** - Role-based access control with custom permissions
- 📝 **Daily Reports** - Team reporting with attachments and comments
- 🔔 **Webhooks** - Real-time updates from Shopify
- 📈 **Dashboard** - Overview of key metrics and statistics
- 🔒 **Security** - JWT authentication, RLS policies, audit logging
- 🚀 **Performance** - Optimized queries, caching, rate limiting

---

## 🏗️ Architecture

### Tech Stack

- **Frontend:** React + TypeScript + Vite + Zustand + TailwindCSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)
- **Deployment:** Vercel (frontend) + Railway (backend)
- **Integration:** Shopify Admin API + Webhooks

### Project Structure

```
├── backend/              # Express API server
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── middleware/  # Auth, validation, rate limiting
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Helper functions
│   │   └── index.ts     # Entry point
│   └── package.json
│
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # API client, utilities
│   │   ├── store/       # Zustand stores
│   │   └── main.tsx     # Entry point
│   └── package.json
│
├── supabase/            # Database migrations
│   └── migrations/
│       └── 001_complete_schema.sql
│
├── docs/                # Documentation
│   ├── api.md          # API documentation
│   ├── troubleshooting.md
│   └── ...
│
├── SETUP_GUIDE.md      # Complete setup instructions
├── CHANGELOG.md        # Version history
└── README.md           # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Railway account (free tier works)
- Vercel account (free tier works)
- Shopify Partner account (free)

### 1. Clone Repository

```bash
git clone https://github.com/your-username/tetiano.git
cd tetiano
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 3. Setup Database

1. Create a Supabase project
2. Run the migration:
   ```sql
   -- In Supabase SQL Editor
   -- Copy and paste: supabase/migrations/001_complete_schema.sql
   ```
3. Run the setup script:
   ```sql
   -- Copy and paste: SETUP_DATABASE.sql
   ```

### 4. Configure Environment Variables

**Backend** (`backend/.env`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
BACKEND_URL=http://localhost:3002
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3002
```

**Frontend** (`frontend/.env`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3002
```

### 5. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 6. Access Application

- Frontend: http://localhost:5173
- Backend: http://localhost:3002
- Health Check: http://localhost:3002/health

---

## 📖 Documentation

- **[Setup Guide](SETUP_GUIDE.md)** - Complete setup instructions for production
- **[API Documentation](docs/api.md)** - Full API reference
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Changelog](CHANGELOG.md)** - Version history and changes
- **[Complete Fix Plan](COMPLETE_FIX_PLAN.md)** - Recent improvements

---

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run typecheck

# Build for production
npm run build
```

### Database Migrations

All migrations are in `supabase/migrations/`. The current schema is in `001_complete_schema.sql`.

To apply migrations:

1. Open Supabase SQL Editor
2. Copy and paste migration content
3. Run the query

### Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## 🚢 Deployment

### Production Deployment

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed deployment instructions.

**Quick Overview:**

1. **Database (Supabase)**
   - Apply migration `001_complete_schema.sql`
   - Run `SETUP_DATABASE.sql`

2. **Backend (Railway)**
   - Connect GitHub repository
   - Set environment variables
   - Deploy from `backend/` directory

3. **Frontend (Vercel)**
   - Connect GitHub repository
   - Set environment variables
   - Deploy from `frontend/` directory

4. **Shopify App**
   - Create app in Shopify Partners
   - Configure OAuth redirect URLs
   - Set up webhooks

---

## 🔐 Security

- **Authentication:** JWT tokens via Supabase Auth
- **Authorization:** Role-based access control (RBAC)
- **Database:** Row Level Security (RLS) policies
- **API:** Rate limiting and input validation
- **Audit:** Comprehensive audit logging
- **HTTPS:** Required for all production traffic

---

## 📊 API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `GET /api/app/me` - Current user profile
- `GET /api/app/dashboard/overview` - Dashboard statistics
- `GET /api/app/products` - List products
- `GET /api/app/orders` - List orders
- `POST /api/app/shopify/connect` - Connect Shopify store
- `POST /api/webhooks/shopify` - Shopify webhooks

See [docs/api.md](docs/api.md) for complete API documentation.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### Getting Help

- **Documentation:** Check [SETUP_GUIDE.md](SETUP_GUIDE.md) and [docs/](docs/)
- **Troubleshooting:** See [docs/troubleshooting.md](docs/troubleshooting.md)
- **Issues:** Open an issue on GitHub
- **Discussions:** Use GitHub Discussions

### Common Issues

See [docs/troubleshooting.md](docs/troubleshooting.md) for solutions to:

- "store_id context is required"
- "Invalid or expired token"
- Shopify connection errors
- Webhook issues
- Database schema errors

---

## 🎯 Roadmap

### Version 2.1 (Planned)

- [ ] Multi-currency support
- [ ] Advanced reporting
- [ ] Bulk operations
- [ ] Export/import functionality

### Version 2.2 (Planned)

- [ ] Mobile app
- [ ] Additional integrations
- [ ] Advanced analytics
- [ ] Automated workflows

---

## 📈 Status

- **Version:** 2.0.0
- **Status:** Production Ready ✅
- **Last Updated:** March 7, 2026
- **Stability:** Stable

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) - Database and authentication
- [Railway](https://railway.app/) - Backend hosting
- [Vercel](https://vercel.com/) - Frontend hosting
- [Shopify](https://shopify.dev/) - E-commerce platform
- [React](https://react.dev/) - UI framework
- [Express](https://expressjs.com/) - Backend framework

---

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for inventory management**

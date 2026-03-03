# 🚀 دليل النشر للإنتاج

> خطوات شاملة لنشر المشروع على بيئة الإنتاج بأمان واحترافية

## ✅ قائمة التحقق قبل النشر

- [ ] تمرير جميع الاختبارات
- [ ] مراجعة الكود (Code Review)
- [ ] تحديث جميع المتغيرات البيئية
- [ ] التحقق من الأمان (Security Audit)
- [ ] اختبار شامل (Staging)
- [ ] نسخ احتياطي من البيانات

## 🔧 إعدادات الإنتاج

### Backend Environment

```dotenv
# .env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_KEY=prod-service-key

SHOPIFY_REDIRECT_URI=https://api.yourdomain.com/api/shopify/callback
FRONTEND_URL=https://yourdomain.com

PORT=3002
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database
DATABASE_POOL_SIZE=20
CONNECTION_TIMEOUT=5000

# Email (اختياري)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### Frontend Environment

```dotenv
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
VITE_API_URL=https://api.yourdomain.com
```

## 📦 نشر Backend على Render

### 1. الإعداد الأولي

```bash
# تسجيل الدخول
render login

# أو من Dashboard
```

### 2. إنشاء Web Service

```yaml
name: inventory-management-api
buildCommand: npm install && npm run build
startCommand: npm start
envVars:
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
  - SHOPIFY_REDIRECT_URI
  - NODE_ENV=production
```

### 3. Firebase السريع

**أو استخدم Fly.io**:

```bash
# التثبيت
curl -L https://fly.io/install.sh | sh

# تهيئة
cd backend
fly apps create inventory-api

# النشر
fly deploy
```

## 🎨 نشر Frontend على Vercel

### 1. تسجيل الدخول

```bash
npm install -g vercel
vercel login
```

### 2. النشر

```bash
cd frontend
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_API_URL

vercel --prod
```

### 3. Environment Variables في Vercel

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=prod-key
VITE_API_URL=https://api.yourdomain.com
```

## 🗄️ قاعدة البيانات

### 1. تشغيل Migrations

```bash
# في Supabase Dashboard
SQL Editor → نسخ والصق كل migration

# أو عبر CLI
npx supabase db push --db-url postgres://...
```

### 2. النسخ الاحتياطي

```bash
# إنشاء نسخة احتياطية
pg_dump postgres://user:pass@host/db > backup.sql

# الاستعادة
psql postgres://user:pass@host/db < backup.sql
```

### 3. Monitoring

```sql
-- مراقبة الاتصالات
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

-- حجم الجداول
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔒 إجراءات الأمان

### 1. HTTPS/SSL

```bash
# في Vercel: يتم تلقائياً
# في Render: يتم تلقائياً
```

### 2. CORS Configuration

```typescript
// backend/src/index.ts
const allowedOrigins = ["https://yourdomain.com", "https://www.yourdomain.com"];
```

### 3. قيود المعدل (Rate Limiting)

```typescript
// يتم تحديثه في الـ code
app.use("/api/", rateLimiter(900000, 100)); // 100 req/15 min
```

### 4. Headers الأمان

```typescript
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000");
  next();
});
```

## 📊 المراقبة

### Logs

```bash
# Render
render logs --tail

# Vercel
vercel logs
```

### Metrics

```bash
# CPU Usage
# Memory Usage
# Request Count
# Error Rate
# Response Time
```

## 🔄 التحديثات

### عملية التحديث الآمنة

```bash
# 1. إنشاء branch جديد
git checkout -b production-update

# 2. الاختبار المحلي
npm run dev

# 3. Push والمراجعة
git push origin production-update
# افتح Pull Request

# 4. بعد الموافقة
git merge main
git push origin main
# سيتم النشر تلقائياً

# 5. تحديث البيانات إن لزم
# في Supabase SQL Editor
```

## 🆘 استكشاف الأخطاء

### 502 Bad Gateway

```bash
# تحقق من صحة الخادم
curl https://api.yourdomain.com/health

# رجّع التطبيق
render deploy --id=<id>
```

### بطء الأداء

```sql
-- تحديد البطء
EXPLAIN ANALYZE SELECT * FROM products WHERE brand_id = '...';

-- إضافة indexes
CREATE INDEX idx_products_brand ON products(brand_id);
```

### مشاكل الاتصال

```bash
# اختبر الاتصال
psql postgres://user:pass@host/db -c "SELECT 1"

# تحقق من Connection Pool
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

## 📈 التوسع

### عندما تنمو البيانات

```sql
-- إعادة تنظيم الجداول
VACUUM ANALYZE;

-- إضافة Partitioning
ALTER TABLE stock_movements
PARTITION BY RANGE (EXTRACT(YEAR FROM created_at));
```

### Caching

```typescript
// إضافة Redis
import redis from "redis";
const client = redis.createClient();

// مثال
const cached = await client.get(`inventory:${brandId}`);
if (!cached) {
  const data = await fetchFromDB();
  await client.setex(`inventory:${brandId}`, 3600, JSON.stringify(data));
}
```

## 📚 الموارد المفيدة

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

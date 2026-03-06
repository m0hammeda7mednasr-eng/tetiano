# قائمة التحقق قبل الـ Deployment

## ✅ الخطوات المطلوبة

### 1. قاعدة البيانات (Supabase)

- [ ] افتح Supabase SQL Editor
- [ ] شغل `supabase/migrations/019_final_production_fix.sql`
- [ ] تأكد من رسالة النجاح: `✅ Migration 019 completed successfully`
- [ ] أنشئ store جديد:
  ```sql
  INSERT INTO stores (name) VALUES ('متجر تيتيانو') RETURNING id;
  ```
- [ ] اربط المستخدم بالـ store:
  ```sql
  UPDATE user_profiles SET store_id = 'STORE_ID' WHERE email = 'your-email@example.com';
  ```

### 2. الكود (Git)

- [ ] راجع التغييرات:
  ```bash
  git status
  git diff backend/src/middleware/auth.ts
  ```
- [ ] Commit التغييرات:
  ```bash
  git add .
  git commit -m "🧹 Clean up project and fix production issues

  - Remove 80+ duplicate documentation files
  - Create single migration (019) to fix all DB issues
  - Fix auth middleware to remove primary_brand_id dependency
  - Simplify project structure
  - Add clear setup guides"
  ```
- [ ] Push للـ repository:
  ```bash
  git push origin main
  ```

### 3. Backend (Railway)

- [ ] تأكد من Environment Variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
  - `BACKEND_URL`
  - `FRONTEND_URL`
  - `NODE_ENV=production`
- [ ] انتظر الـ deployment التلقائي
- [ ] تحقق من الـ logs
- [ ] اختبر health endpoint: `https://tetiano-production.up.railway.app/health`

### 4. Frontend (Vercel)

- [ ] تأكد من Environment Variables:
  - `VITE_API_URL`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] انتظر الـ deployment التلقائي
- [ ] افتح التطبيق: `https://tetiano.vercel.app`
- [ ] سجل دخول

### 5. اختبار Shopify Integration

- [ ] اذهب لإعدادات Shopify
- [ ] أدخل:
  - Shop Domain: `tetiano.myshopify.com`
  - API Key: من Shopify App
  - API Secret: من Shopify App
- [ ] اضغط "Connect"
- [ ] تأكد من إعادة التوجيه لـ Shopify
- [ ] وافق على الصلاحيات
- [ ] تأكد من الرجوع للتطبيق بنجاح

### 6. التحقق النهائي

- [ ] تحقق من Railway logs - لا أخطاء
- [ ] تحقق من Supabase logs - لا أخطاء
- [ ] جرب إضافة منتج
- [ ] جرب تعديل المخزون
- [ ] جرب المزامنة مع Shopify

## 🚨 في حالة حدوث مشاكل

### خطأ 500 في /api/app/shopify/connect
1. تأكد من تشغيل migration 019
2. تأكد من وجود store_id للمستخدم
3. راجع Railway logs للتفاصيل

### "store_id context is required"
1. المستخدم مش مربوط بـ store
2. شغل الأمر في الخطوة 1

### "Invalid or expired token"
1. سجل خروج ودخول مرة تانية
2. تأكد من Supabase JWT settings

## 📞 الدعم

- Railway Logs: https://railway.app
- Supabase Logs: https://supabase.com/dashboard
- GitHub Issues: [repository-url]/issues

---

**ملاحظة**: اتبع الخطوات بالترتيب للحصول على أفضل النتائج.

# دليل الإعداد السريع

## 1. إصلاح قاعدة البيانات

افتح Supabase SQL Editor وشغل الملف ده:
```
supabase/migrations/019_final_production_fix.sql
```

## 2. التحقق من Environment Variables في Railway

تأكد إن المتغيرات دي موجودة:

```env
SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BACKEND_URL=https://tetiano-production.up.railway.app
FRONTEND_URL=https://tetiano.vercel.app
NODE_ENV=production
```

## 3. إنشاء Store للمستخدم

لو المستخدم مش عنده store، شغل الكود ده في Supabase SQL Editor:

```sql
-- إنشاء store جديد
INSERT INTO stores (name, created_at, updated_at)
VALUES ('متجر تيتيانو', NOW(), NOW())
RETURNING id;

-- ربط المستخدم بالـ store (استبدل USER_ID و STORE_ID)
UPDATE user_profiles 
SET store_id = 'STORE_ID_FROM_ABOVE'
WHERE id = 'YOUR_USER_ID';
```

## 4. اختبار الاتصال بـ Shopify

1. افتح التطبيق
2. اذهب إلى إعدادات Shopify
3. أدخل:
   - Shop Domain: `tetiano.myshopify.com`
   - API Key: من Shopify App
   - API Secret: من Shopify App
4. اضغط "Connect"

## 5. التحقق من النجاح

شوف Railway logs:
```
✅ OAuth state created
✅ Redirecting to Shopify
```

## مشاكل شائعة

### خطأ 500 في /api/app/shopify/connect
- تأكد إن migration 019 اتنفذ
- تأكد إن المستخدم عنده store_id

### خطأ "store_id context is required"
- المستخدم مش مربوط بـ store
- شغل الكود في الخطوة 3

### خطأ "Invalid or expired token"
- المستخدم مش مسجل دخول
- الـ JWT token منتهي

## الدعم

لو في أي مشكلة، شوف الـ logs في:
- Railway: https://railway.app
- Supabase: https://supabase.com/dashboard

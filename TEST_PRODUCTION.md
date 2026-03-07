# اختبار Production بعد الإصلاح

## ✅ تم الإصلاح

- إزالة الاعتماد على legacy bridge endpoint
- تبسيط الكود ليعمل مباشرة
- إصلاح خطأ 503

## 🧪 خطوات الاختبار

### 1. انتظر Railway Deployment (2-3 دقائق)

تحقق من: https://railway.app

### 2. اختبر Health Endpoint

```bash
curl https://tetiano-production.up.railway.app/health
```

يجب أن ترى:
```json
{"status":"ok","timestamp":"...","uptime":...,"environment":"production"}
```

### 3. تأكد من قاعدة البيانات

في Supabase SQL Editor، شغل:

```sql
-- تحقق من المستخدمين
SELECT id, email, store_id 
FROM user_profiles 
WHERE store_id IS NOT NULL
LIMIT 5;

-- تحقق من الجداول المطلوبة
SELECT 
  'shopify_oauth_states' as table_name,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_oauth_states') as exists
UNION ALL
SELECT 
  'shopify_connections',
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shopify_connections')
UNION ALL
SELECT 
  'stores',
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stores');
```

كل الجداول لازم تكون موجودة (exists = true).

### 4. اختبر Shopify Connect

1. افتح: https://tetiano.vercel.app
2. سجل دخول
3. اذهب لإعدادات Shopify
4. أدخل:
   - Shop: `tetiano.myshopify.com`
   - API Key: من Shopify App
   - API Secret: من Shopify App
5. اضغط "Connect"

### 5. النتيجة المتوقعة

✅ **نجح:**
- رسالة نجاح
- إعادة توجيه لـ Shopify OAuth
- URL يبدأ بـ `https://tetiano.myshopify.com/admin/oauth/authorize`

❌ **فشل:**
- خطأ 400: بيانات ناقصة
- خطأ 401: مش مسجل دخول
- خطأ 403: مفيش store_id للمستخدم
- خطأ 500: مشكلة في قاعدة البيانات
- خطأ 503: Backend لسه مش جاهز

## 🔍 استكشاف الأخطاء

### خطأ 403: "store_id context is required"

المستخدم مش مربوط بـ store. شغل في Supabase:

```sql
-- أنشئ store
INSERT INTO stores (name) VALUES ('متجر تيتيانو') RETURNING id;

-- اربط المستخدم (استبدل الـ IDs)
UPDATE user_profiles 
SET store_id = 'STORE_ID_FROM_ABOVE'
WHERE email = 'your-email@example.com';
```

### خطأ 500: Database error

شغل migration 019 في Supabase:
- افتح `supabase/migrations/019_final_production_fix.sql`
- انسخ والصق في SQL Editor
- شغل

### خطأ 503: Service Unavailable

- تأكد من Railway deployment اكتمل
- شوف Railway logs للأخطاء
- جرب Restart للـ service

## 📊 Timeline

- ✅ Code fix: تم
- ✅ Git push: تم
- ⏳ Railway deployment: 2-3 دقائق
- ⏳ Test: 1 دقيقة

**إجمالي: 3-5 دقائق من الآن**

## 🎯 الخطوة التالية

بعد ما Railway deployment يكتمل:
1. اختبر health endpoint
2. اختبر Shopify connect
3. لو نجح، كمل باقي الإعداد
4. لو فشل، ابعتلي Railway logs

---

**ملاحظة**: الكود الآن مبسط وبدون dependencies على endpoints مش موجودة. المفروض يشتغل! 🚀

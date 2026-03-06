# البدء السريع - خطوات بسيطة

## الخطوة 1: إصلاح قاعدة البيانات (5 دقائق)

1. افتح Supabase: https://supabase.com/dashboard/project/hgphobgcyjrtshwrnxfj
2. اضغط على "SQL Editor"
3. اضغط "New Query"
4. انسخ محتوى الملف: `supabase/migrations/019_final_production_fix.sql`
5. الصق في المحرر واضغط "Run"
6. انتظر رسالة: `✅ Migration 019 completed successfully`

## الخطوة 2: إنشاء Store (دقيقتين)

في نفس SQL Editor، شغل:

```sql
-- إنشاء store
INSERT INTO stores (name, created_at, updated_at)
VALUES ('متجر تيتيانو', NOW(), NOW())
RETURNING id;

-- انسخ الـ ID اللي ظهر، واستخدمه في الأمر التالي
-- استبدل YOUR_USER_ID بـ ID المستخدم الحالي
UPDATE user_profiles 
SET store_id = 'STORE_ID_FROM_ABOVE'
WHERE email = 'your-email@example.com';
```

## الخطوة 3: اختبار الاتصال

1. افتح التطبيق: https://tetiano.vercel.app
2. سجل دخول
3. اذهب لإعدادات Shopify
4. أدخل بيانات المتجر:
   - Shop: `tetiano.myshopify.com`
   - API Key: من Shopify
   - API Secret: من Shopify
5. اضغط "Connect"

## الخطوة 4: التحقق

إذا نجح الاتصال، سترى:
- ✅ رسالة نجاح
- ✅ إعادة توجيه لـ Shopify للموافقة
- ✅ بعد الموافقة، رجوع للتطبيق

## إذا حدث خطأ

### خطأ 500
- تأكد إن migration 019 اتنفذ بنجاح
- تأكد إن المستخدم عنده store_id

### "store_id context is required"
- المستخدم مش مربوط بـ store
- ارجع للخطوة 2

### "Invalid token"
- سجل خروج ودخول مرة تانية

## الدعم

شوف Railway logs للتفاصيل:
https://railway.app/project/[your-project]

---

**ملاحظة**: كل الملفات القديمة المكررة تم حذفها. المشروع الآن نظيف ومنظم! 🎉

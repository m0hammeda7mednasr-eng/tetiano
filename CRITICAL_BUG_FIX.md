# 🚨 CRITICAL FIX - Database & API Issues

**التاريخ**: 7 مارس 2026  
**الحالة**: 🔴 Issues detected  
**السبب الجذري**: Database schema not fully created OR incorrect endpoint configuration

---

## 🔍 المشاكل المكتشفة

### 1. 503 Errors على `/api/onboarding/bootstrap-store`

```
Error: Failed to load resource: the server responded with a status of 503
Meaning: Database table not responding (store_memberships table missing or querying failed)
```

**السبب**:

- Database migration لم تشتغل بشكل صحيح في Supabase
- الجداول موجودة بس فيها مشكلة في الـ structure

**الحل**:

1. اذهب لـ Supabase Dashboard
2. اختر project: tetiano
3. SQL Editor → New Query
4. **حذف وأعاد الـ migration من البداية**

---

### 2. 403 Errors على `/api/app/notifications/unread-count`, `/api/app/dashboard/overview`, إلخ

```
Error: Failed to load resource status of 403 (Forbidden)
Meaning: User doesn't have store OR middleware blocking access
```

**السبب**:

- اليوزر الجديد بدون store
- الـ `requireStoreContext()` middleware بيرفع أي طلب من user بدون store

**الحل**:

- الـ user يجب أولاً يمر من `/api/onboarding/bootstrap-store` لإنشاء store
- لكن هذا الـ endpoint ترجع 503

---

## ✅ الحل الشامل (الآن مباشرة)

### خطوة 1: تصحيح قاعدة البيانات

#### الخيار A: إعادة الـ Migration كاملة (الأفضل)

```sql
-- في Supabase SQL Editor:

-- أولاً: حذف جميع الجداول (اختياري - فقط إذا كنت متأكد)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- ثم: شغل الـ Migration من جديد
-- انسخ محتوى supabase/migrations/002_safe_migration.sql كاملاً
```

#### الخيار B: التحقق وإصلاح (أسرع)

```sql
-- هذا الـ script يتحقق من الحالة
-- انسخ محتوى DEBUG_DATABASE.sql وشغله
```

### خطوة 2: التحقق من الجداول

في Supabase Dashboard:

1. SQL Editor → New Query
2. اكتب:

```sql
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
```

3. يجب تكون النتيجة ≥ 22

### خطوة 3: إضافة Default Store للـ User (إذا لزم الأمر)

```sql
-- إذا كان عندك user بدون store
INSERT INTO stores (id, name, slug, admin_user_id, status)
VALUES (
  gen_random_uuid(),
  'My Store',
  'my-store-' || LEFT(gen_random_uuid()::text, 8),
  'YOUR_USER_ID_HERE',
  'active'
);

-- ثم ربط الـ user بـ الـ store
INSERT INTO store_memberships (store_id, user_id, store_role, status)
VALUES (
  (SELECT id FROM stores ORDER BY created_at DESC LIMIT 1),
  'YOUR_USER_ID_HERE',
  'admin',
  'active'
);
```

---

## 🔧 إصلاح الـ Code

### المشكلة في `onboarding.ts`

الـ bootstrap-store endpoint بيفشل على الـ queries لأن الجداول ما موجودة.

**الحل**: بعد تشغيل الـ migration بنجاح، الـ endpoint بيعمل تلقائياً.

### المشكلة في الـ 403 Errors

الـ `/api/app/*` endpoints محتاجة `requireStoreContext()` middleware، لكن الـ user الجديد بدون store.

**الحل الحالي**:

- الـ user يمر من `/api/onboarding/bootstrap-store` أولاً
- بعدها كل الـ endpoints بتشتغل

---

## 📋 خطوات الإصلاح (الآن)

### ❌ المشكلة الراهنة:

```
User tries to access /api/app/dashboard
    ↓
No store found
    ↓
requireStoreContext() blocks the request
    ↓
403 Forbidden ❌
```

### ✅ الحل الصحيح:

```
User signs up
    ↓
Frontend calls /api/onboarding/bootstrap-store
    ↓
Backend creates store automatically
    ↓
Backend creates store_membership
    ↓
User now has store_id ✅
    ↓
User can access /api/app/dashboard ✅
```

---

## 🚀 قائمة الإجراءات الفورية

### 1️⃣ تصحيح Database (5 دقايق)

```
1. اذهب: https://supabase.com/dashboard
2. اختر: tetiano project
3. اضغط: SQL Editor
4. اضغط: + New Query
5. انسخ: DEBUG_DATABASE.sql
6. شغل الـ query
7. شيك على النتائج:
   - يجب تكون ≥22 جدول
   - جميع الجداول موجودة
```

### 2️⃣ إعادة تشغيل الـ Migration (إذا لزم الأمر)

```
1. إذا ما فيش جداول:
   - اضغط: + New Query
   - انسخ: supabase/migrations/002_safe_migration.sql
   - شغل كاملاً
   - انتظر: "Query OK"
```

### 3️⃣ اختبار الـ Fix

```
1. اذهب: https://tetiano.vercel.app
2. Logout (من الحساب الحالي)
3. Sign Up بحساب جديد
4. تابع الـ onboarding
5. يجب يعمل بدون أخطاء ✅
```

### 4️⃣ Deploy الـ Fix (إذا لزم الأمر)

```bash
# لا حاجة لـ code changes - فقط database fix
# لو فيه مشكلة في الـ code:
git status
git add .
git commit -m "fix: handle database schema issues"
git push
```

---

## 📊 Diagnostic Checklist

### في Supabase Dashboard:

- [ ] 22+ tables موجودة
- [ ] `stores` table موجود
- [ ] `store_memberships` table موجود
- [ ] `user_profiles` table موجود
- [ ] `variants` table موجود
- [ ] `inventory_levels` table موجود
- [ ] All tables قابل للـ SELECT
- [ ] No constraint errors

### في الموقع:

- [ ] Sign Up works
- [ ] `/api/onboarding/bootstrap-store` returns 200 (لا 503)
- [ ] Dashboard loads (لا 403)
- [ ] inventory shows (لا 403)

---

## 🆘 إذا استمرت المشاكل

### 1. Verify Supabase Connection

```
Backend → .env
Check: SUPABASE_URL ✓
Check: SUPABASE_SERVICE_KEY ✓
Check: Both are correct ✓
```

### 2. Check Railway Logs

```
https://railway.app
→ tetiano-production → Backend → Logs
Look for error messages about database
```

### 3. Restart Services

```
Railway: Restart deployment
Vercel: Redeploy
Database: No restart needed
```

---

## 📝 الملفات المرجعية

| الملف                                        | الهدف                     |
| -------------------------------------------- | ------------------------- |
| `DEBUG_DATABASE.sql`                         | تشخيص حالة قاعدة البيانات |
| `supabase/migrations/002_safe_migration.sql` | إنشاء الجداول             |
| `SETUP_DATABASE.sql`                         | إضافة بيانات افتراضية     |
| `backend/.env`                               | تكوين الاتصال             |

---

## ⏱️ الوقت المتوقع

- تشخيص المشكلة: 2 دقيقة
- إصلاح Database: 5 دقايق
- إعادة test: 5 دقايق
- **المجموع: ~12 دقيقة**

---

**الآن ابدأ مباشرة بـ Step 1️⃣!**

_التاريخ_: 7 مارس 2026  
_الحالة_: 🔴 Diagnosing... Fix in progress

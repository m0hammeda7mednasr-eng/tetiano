# 🎯 خطة العمل - إصلاح وتشغيل المشروع

## 📋 الوضع الحالي

### ✅ ما تم إنجازه:
- [x] كود Frontend كامل ومكتوب
- [x] كود Backend كامل ومكتوب
- [x] Database Schema جاهز
- [x] GitHub Repository تم إنشاؤه ورفع الكود
- [x] Vercel Deployment تم (لكن صفحة بيضاء)
- [x] Railway Deployment محاولة (لكن فشل)

### ⚠️ المشاكل الحالية:
1. Frontend على Vercel يظهر صفحة بيضاء
2. Backend على Railway فشل البناء
3. Database Migrations لم يتم تطبيقها كلها
4. Service Role Key في Backend placeholder

---

## 🔧 خطة الإصلاح (بالترتيب)

### المرحلة 1: إصلاح Database ✅

#### الخطوة 1.1: الحصول على Service Role Key
```bash
1. افتح Supabase Dashboard
   https://supabase.com/dashboard/project/hgphobgcyjrtshwrnxfj

2. اذهب إلى: Settings → API

3. انسخ "service_role" key (مش anon!)
   - سيكون شكله: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

4. احتفظ به للخطوة التالية
```

#### الخطوة 1.2: تطبيق Database Migrations
```sql
-- في Supabase Dashboard → SQL Editor
-- قم بتشغيل هذا الكود:

-- Migration 010: Force Admin on Signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $
DECLARE
  profile_count BIGINT;
  initial_role TEXT := 'staff';
  random_color TEXT;
  display_name TEXT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  IF profile_count = 0 THEN
    initial_role := 'admin';
  END IF;

  display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  random_color := (
    ARRAY['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  )[floor(random() * 6 + 1)];

  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (NEW.id, display_name, initial_role, TRUE, random_color)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_color = COALESCE(user_profiles.avatar_color, EXCLUDED.avatar_color);

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Safety net: إذا لم يكن هناك admin، اجعل أول مستخدم admin
DO $
DECLARE
  first_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE role = 'admin') THEN
    SELECT id INTO first_user_id
    FROM user_profiles
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      UPDATE user_profiles
      SET role = 'admin'
      WHERE id = first_user_id;
    END IF;
  END IF;
END $;

-- تحقق من النتيجة
SELECT role, COUNT(*) AS users_count
FROM user_profiles
GROUP BY role
ORDER BY role;
```

#### الخطوة 1.3: تحديث Backend .env
```bash
# في ملف backend/.env
# استبدل السطر:
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI5ODA1NCwiZXhwIjoyMDg3ODc0MDU0fQ.placeholder

# بالقيمة الحقيقية من Supabase
SUPABASE_SERVICE_KEY=<القيمة الحقيقية من Supabase>
```

---

### المرحلة 2: إصلاح Backend على Railway 🚂

#### الخطوة 2.1: إعدادات Railway Dashboard
```bash
1. افتح Railway Dashboard
   https://railway.app/dashboard

2. اختر المشروع tetiano

3. Settings → اضبط الإعدادات:
   ✅ Root Directory: backend
   ✅ Build Command: npm install && npm run build
   ✅ Start Command: npm start
```

#### الخطوة 2.2: إضافة Environment Variables
```bash
في Railway Dashboard → Variables → Raw Editor:

SUPABASE_URL=https://hgphobgcyjrtshwrnxfj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTgwNTQsImV4cCI6MjA4Nzg3NDA1NH0.0lH6_OkPXvYb1PokkudAipBxaenwrmwPu5tk60sYqVU
SUPABASE_SERVICE_KEY=<القيمة من الخطوة 1.1>
PORT=3002
NODE_ENV=production
FRONTEND_URL=https://tetiano.vercel.app
```

#### الخطوة 2.3: Redeploy
```bash
1. في Railway Dashboard
2. اضغط "Redeploy"
3. انتظر حتى يكتمل البناء (2-3 دقائق)
4. تحقق من Logs للتأكد من عدم وجود أخطاء
```

#### الخطوة 2.4: الحصول على Backend URL
```bash
1. Settings → Domains
2. Generate Domain (إذا لم يكن موجود)
3. انسخ الـ URL: https://tetiano-backend.railway.app
```

#### الخطوة 2.5: اختبار Backend
```bash
# افتح في المتصفح:
https://tetiano-backend.railway.app/health

# يجب أن يرجع:
{
  "status": "ok",
  "timestamp": "2024-03-03T...",
  "uptime": 123.456,
  "environment": "production"
}
```

---

### المرحلة 3: إصلاح Frontend على Vercel 🌐

#### الخطوة 3.1: إضافة Environment Variables
```bash
1. افتح Vercel Dashboard
   https://vercel.com/dashboard

2. اختر المشروع tetiano

3. Settings → Environment Variables

4. أضف المتغيرات التالية:

Name: VITE_SUPABASE_URL
Value: https://hgphobgcyjrtshwrnxfj.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhncGhvYmdjeWpydHNod3JueGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTgwNTQsImV4cCI6MjA4Nzg3NDA1NH0.0lH6_OkPXvYb1PokkudAipBxaenwrmwPu5tk60sYqVU
Environment: Production, Preview, Development

Name: VITE_API_URL
Value: https://tetiano-backend.railway.app
Environment: Production, Preview, Development
```

#### الخطوة 3.2: Redeploy
```bash
1. Deployments → اختر آخر deployment
2. اضغط "..." → Redeploy
3. انتظر حتى يكتمل (1-2 دقيقة)
```

#### الخطوة 3.3: اختبار Frontend
```bash
# افتح في المتصفح:
https://tetiano.vercel.app

# يجب أن تظهر صفحة Login
```

---

### المرحلة 4: الاختبار النهائي 🧪

#### الخطوة 4.1: إنشاء أول حساب (Admin)
```bash
1. افتح https://tetiano.vercel.app
2. اضغط "إنشاء حساب جديد"
3. أدخل:
   - الاسم: Admin User
   - البريد: admin@tetiano.com
   - كلمة المرور: (كلمة مرور قوية)
4. اضغط "تسجيل"
```

#### الخطوة 4.2: تسجيل الدخول
```bash
1. سجل الدخول بالبريد وكلمة المرور
2. يجب أن يتم توجيهك إلى Admin Dashboard
```

#### الخطوة 4.3: التحقق من الصلاحيات
```bash
1. تحقق من ظهور قائمة Admin في الـ Sidebar
2. جرب الدخول إلى:
   - Admin Dashboard
   - User Management
   - Team Management
   - Inventory
   - Reports
```

#### الخطوة 4.4: إنشاء حساب ثاني (Staff)
```bash
1. سجل خروج
2. أنشئ حساب جديد:
   - البريد: staff@tetiano.com
   - كلمة المرور: (كلمة مرور)
3. سجل الدخول
4. تحقق من أن الحساب Staff (لا يظهر قائمة Admin)
```

---

## 📊 Checklist النهائي

### Database ✅
- [ ] Service Role Key تم الحصول عليه
- [ ] Migration 010 تم تطبيقه
- [ ] Trigger يعمل بشكل صحيح
- [ ] أول مستخدم موجود = Admin

### Backend (Railway) ✅
- [ ] Root Directory = backend
- [ ] Environment Variables مضافة
- [ ] Build نجح
- [ ] Health endpoint يعمل
- [ ] Logs لا تظهر أخطاء

### Frontend (Vercel) ✅
- [ ] Environment Variables مضافة
- [ ] Build نجح
- [ ] صفحة Login تظهر
- [ ] يمكن التسجيل والدخول

### Testing ✅
- [ ] أول حساب = Admin
- [ ] ثاني حساب = Staff
- [ ] Admin Dashboard يعمل
- [ ] Inventory يعمل
- [ ] Reports يعمل
- [ ] API calls تعمل

---

## 🚨 مشاكل محتملة وحلولها

### مشكلة: Backend Build يفشل على Railway
**الحل**:
```bash
1. تأكد من Root Directory = backend
2. تأكد من وجود package.json في backend/
3. تحقق من Logs للأخطاء
4. جرب Local Build أولاً: cd backend && npm run build
```

### مشكلة: Frontend صفحة بيضاء
**الحل**:
```bash
1. افتح Console في المتصفح (F12)
2. شوف الأخطاء
3. تأكد من Environment Variables
4. تأكد من VITE_API_URL صحيح
```

### مشكلة: CORS Error
**الحل**:
```bash
# في backend/src/index.ts
# تأكد من إضافة Frontend URL في allowedOrigins:
const allowedOrigins = [
  "https://tetiano.vercel.app",
  "http://localhost:5173"
];
```

### مشكلة: Database Connection Failed
**الحل**:
```bash
1. تحقق من SUPABASE_URL صحيح
2. تحقق من SUPABASE_SERVICE_KEY صحيح
3. تحقق من Supabase Project مش Paused
```

---

## 🎉 النتيجة المتوقعة

بعد إتمام جميع الخطوات:

✅ **Frontend**: https://tetiano.vercel.app (يعمل)
✅ **Backend**: https://tetiano-backend.railway.app (يعمل)
✅ **Database**: Supabase (متصل)
✅ **أول حساب**: Admin تلقائياً
✅ **باقي الحسابات**: Staff

**المشروع جاهز للاستخدام! 🚀**

---

## 📞 إذا واجهت مشكلة

1. تحقق من Logs:
   - Railway: Dashboard → Logs
   - Vercel: Deployments → View Function Logs
   - Supabase: Dashboard → Logs

2. تحقق من Environment Variables:
   - Railway: Settings → Variables
   - Vercel: Settings → Environment Variables

3. تحقق من Database:
   - Supabase: SQL Editor → SELECT * FROM user_profiles;

4. اختبر محلياً أولاً:
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

---

## 📝 ملاحظات نهائية

1. **GitHub Token**: تم مشاركته في المحادثة، يجب حذفه:
   ```bash
   # اذهب إلى: https://github.com/settings/tokens
   # احذف Token القديم الذي تم مشاركته
   ```

2. **Shopify Integration**: لم يتم تفعيله بعد، يحتاج:
   - إنشاء Shopify App
   - الحصول على Access Tokens
   - إضافتها في Environment Variables

3. **Scheduled Jobs**: ستعمل تلقائياً على Railway (18:00 Cairo Time)

4. **Webhooks**: تحتاج إعداد في Shopify Dashboard بعد تفعيل Integration

---

**ابدأ من المرحلة 1 وتابع بالترتيب! 💪**

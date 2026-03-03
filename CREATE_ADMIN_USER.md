# 🔐 إنشاء حساب Admin

## الطريقة 1: من خلال Supabase SQL Editor (الأسرع)

### الخطوات:

1. **افتح Supabase Dashboard**
   - اذهب إلى: https://hgphobgcyjrtshwrnxfj.supabase.co
   - اضغط على "SQL Editor"

2. **شغل هذا الكود SQL**:

```sql
-- 1. إنشاء مستخدم جديد في auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@tetiano.com',  -- غير الإيميل هنا
  crypt('Admin@123', gen_salt('bf')),  -- غير الباسورد هنا
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
RETURNING id;

-- 2. بعد ما تاخد الـ ID من الخطوة الأولى، استخدمه هنا
-- أو شغل الكود ده مباشرة عشان يعمل profile للآخر user
DO $$
DECLARE
  last_user_id UUID;
BEGIN
  -- Get the last created user
  SELECT id INTO last_user_id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create profile with admin role
  INSERT INTO user_profiles (id, full_name, role, is_active, avatar_color)
  VALUES (
    last_user_id,
    'Admin User',
    'admin',  -- الدور: admin
    true,
    '#6366f1'
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin', is_active = true;
  
  RAISE NOTICE 'Admin user created with ID: %', last_user_id;
END $$;
```

3. **سجل دخول**
   - Email: `admin@tetiano.com`
   - Password: `Admin@123`

---

## الطريقة 2: من خلال التطبيق (أسهل)

### الخطوات:

1. **افتح التطبيق**: http://localhost:5173

2. **اضغط "إنشاء حساب جديد"**

3. **املأ البيانات**:
   - الاسم: `Admin User`
   - البريد: `admin@tetiano.com`
   - الباسورد: `Admin@123`

4. **بعد التسجيل، روح على Supabase SQL Editor وشغل**:

```sql
-- غير الإيميل بتاعك هنا
UPDATE user_profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'admin@tetiano.com'
);
```

5. **سجل خروج وسجل دخول تاني**

---

## الطريقة 3: ترقية مستخدم موجود

إذا كان عندك حساب بالفعل:

```sql
-- غير الإيميل بتاعك
UPDATE user_profiles
SET role = 'admin', is_active = true
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'your-email@example.com'
);
```

---

## التحقق من الدور

بعد ما تسجل دخول، شغل في SQL Editor:

```sql
SELECT 
  u.email,
  p.full_name,
  p.role,
  p.is_active
FROM auth.users u
JOIN user_profiles p ON p.id = u.id
WHERE u.email = 'admin@tetiano.com';
```

يجب أن يظهر:
- role: `admin`
- is_active: `true`

---

## الوصول إلى Admin Dashboard

بعد تسجيل الدخول كـ Admin:

1. **من القائمة الجانبية**: اضغط على "لوحة تحكم الأدمن"
2. **أو اذهب مباشرة إلى**: http://localhost:5173/admin/dashboard

---

## الصلاحيات المتاحة للـ Admin

✅ عرض كل المستخدمين
✅ إضافة/تعديل/حذف مستخدمين
✅ تغيير أدوار المستخدمين
✅ عرض كل التقارير اليومية
✅ إدارة الفرق (Teams)
✅ إدارة العلامات التجارية (Brands)
✅ إعدادات Shopify
✅ عرض الإحصائيات
✅ إرسال الإشعارات

---

## ملاحظات مهمة

⚠️ **الأمان**: غير الباسورد الافتراضي بعد أول تسجيل دخول

⚠️ **البريد الإلكتروني**: استخدم بريد حقيقي إذا كنت تريد استقبال إشعارات

⚠️ **الدور الأول**: أول مستخدم يتم إنشاؤه يجب أن يكون Admin

---

## استكشاف الأخطاء

### المشكلة: لا أستطيع الوصول إلى Admin Dashboard

**الحل**:
```sql
-- تأكد من أن الدور admin
SELECT role FROM user_profiles WHERE id = auth.uid();

-- إذا لم يكن admin، غيره
UPDATE user_profiles SET role = 'admin' WHERE id = auth.uid();
```

### المشكلة: "غير مصرح بالوصول"

**الحل**: سجل خروج وسجل دخول مرة أخرى لتحديث الصلاحيات

### المشكلة: الصفحة فارغة أو بها أخطاء

**الحل**: تأكد من أن Backend شغال على http://localhost:3002

---

## الأدوار المتاحة

1. **owner** - المالك (صلاحيات كاملة)
2. **admin** - مدير (إدارة المستخدمين والنظام)
3. **manager** - مشرف (إدارة المخزون)
4. **user** - مستخدم (عرض وتعديل محدود)
5. **viewer** - مشاهد (عرض فقط)

---

**تم! الآن يمكنك الوصول إلى Admin Dashboard 🎉**

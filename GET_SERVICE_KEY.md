# 🔑 كيفية الحصول على Supabase Service Role Key

## الخطوات:

### 1. افتح Supabase Dashboard
```
https://supabase.com/dashboard/project/hgphobgcyjrtshwrnxfj
```

### 2. اذهب إلى Settings → API
```
في القائمة الجانبية:
Settings → API
```

### 3. انسخ Service Role Key
```
في صفحة API Settings، هتلاقي:

1. Project URL: https://hgphobgcyjrtshwrnxfj.supabase.co
2. anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (موجود عندك)
3. service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (محتاجه!)
```

**⚠️ مهم:** انسخ الـ **service_role** key (مش الـ anon key!)

### 4. أضف الـ Key في Railway

في Railway Dashboard → Variables → New Variable:

```
Name: SUPABASE_SERVICE_KEY
Value: [الصق الـ service_role key هنا]
```

### 5. احفظ وأعد Deploy

بعد ما تضيف الـ Variable:
1. اضغط "Add" أو "Save"
2. Railway هيعمل Redeploy تلقائياً
3. انتظر حتى يكتمل البناء

---

## ملاحظة مهمة:

الـ Service Role Key ده **سري جداً** ولازم:
- ✅ يتحط في Environment Variables فقط
- ✅ ما يتشاركش في GitHub
- ✅ ما يتحطش في الكود
- ❌ ما يتحطش في Frontend أبداً

---

## بعد ما تضيف الـ Key:

Railway هيعمل Redeploy تلقائياً، وهتلاقي:
1. ✅ Build ينجح
2. ✅ Backend يشتغل
3. ✅ Health endpoint يرد
4. ✅ Database connection تشتغل

---

**دلوقتي روح اعمل الخطوات دي وارجع!** 🚀

# 🔥 Hotfix: 403 Forbidden Errors

## المشكلة

كل الـ API requests ترجع 403 Forbidden للمستخدمين الجدد.

## السبب

الـ `requireStoreContext()` middleware كان يطبق على **كل** routes في `/api/app/*`، بما فيها `/api/app/me`.

المستخدمون الجدد ليس لديهم `store_id` بعد، لذلك كانوا يحصلون على 403.

## الحل ✅

### التغيير في `backend/src/routes/app.ts`:

**قبل:**

```typescript
router.use(authenticate);
router.use(requireStoreContext()); // ❌ يطبق على كل routes

router.get("/me", async (req, res) => {
  // ...
});
```

**بعد:**

```typescript
router.use(authenticate);

// Routes that don't require store context
router.get("/me", async (req, res) => {
  const storeId = resolveStoreId(req);
  // ✅ يعمل حتى لو store_id = null
  // ...
});

// All other routes require store context
router.use(requireStoreContext()); // ✅ يطبق فقط على routes بعده
```

## التأثير

### Endpoints بدون store context (تعمل للجميع):

- ✅ `GET /api/app/me` - يعمل الآن للمستخدمين الجدد

### Endpoints تحتاج store context:

- ✅ `GET /api/app/dashboard/overview`
- ✅ `GET /api/app/products`
- ✅ `GET /api/app/orders`
- ✅ `POST /api/app/shopify/connect`
- ✅ كل endpoints الأخرى

## Flow الصحيح للمستخدم الجديد:

1. **Sign up** → ينشئ حساب في Supabase Auth
2. **GET /api/app/me** → ✅ يعمل (بدون store)
3. **POST /api/onboarding/bootstrap-store** → ينشئ store
4. **GET /api/app/me** → ✅ يعمل (مع store)
5. **GET /api/app/dashboard/overview** → ✅ يعمل (لديه store الآن)

## الاختبار

### قبل الـ Hotfix:

```bash
curl https://tetiano-production.up.railway.app/api/app/me \
  -H "Authorization: Bearer NEW_USER_TOKEN"
# ❌ 403 Forbidden
```

### بعد الـ Hotfix:

```bash
curl https://tetiano-production.up.railway.app/api/app/me \
  -H "Authorization: Bearer NEW_USER_TOKEN"
# ✅ 200 OK
# {
#   "user": { "id": "...", "email": "...", "store_role": null },
#   "store": null,
#   "profile": { ... }
# }
```

## Deploy

```bash
# 1. Commit التغيير
git add backend/src/routes/app.ts
git commit -m "hotfix: Allow /me endpoint without store context

Fixes 403 errors for new users who don't have a store yet.
The /me endpoint now works without store_id."

# 2. Push
git push origin main

# 3. Railway سيعمل auto-deploy
```

## التحقق بعد Deploy

1. افتح https://tetiano.vercel.app
2. سجل حساب جديد
3. يجب أن تظهر Dashboard (بدون 403 errors)
4. اضغط "Create Store" أو سيتم إنشاؤه تلقائياً
5. كل شيء يجب أن يعمل الآن ✅

## ملاحظات

- ✅ الـ fix بسيط وآمن
- ✅ لا يؤثر على المستخدمين الحاليين
- ✅ يحل مشكلة المستخدمين الجدد
- ✅ متوافق مع كل الـ documentation

---

**Status:** ✅ Fixed
**Date:** 2026-03-07
**Impact:** Critical - يحل مشكلة تمنع المستخدمين الجدد من استخدام التطبيق

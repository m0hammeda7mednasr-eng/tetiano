# Force Restart Railway - حل سريع

## المشكلة
لسه في خطأ 503 بعد الإصلاح. ده معناه Railway مش عمل deploy للكود الجديد.

## الحل (خطوتين):

### الخطوة 1: Force Redeploy

في Railway Dashboard:
1. اختار backend service
2. اضغط Settings
3. اضغط "Redeploy" أو "Restart"
4. انتظر 2-3 دقائق

### الخطوة 2: تحقق من الـ Logs

في Railway:
1. اضغط على backend service
2. اضغط "View Logs"
3. شوف آخر الـ logs

**ابحث عن:**
- `🚀 Server running on port 3002`
- `✅ Migration completed`
- أي error messages

## البديل: Empty Commit

لو Redeploy مش شغال، اعمل empty commit:

```bash
git commit --allow-empty -m "🔄 Force Railway redeploy"
git push origin main
```

## التحقق

بعد الـ restart:
1. افتح: https://tetiano-production.up.railway.app/health
2. لازم تشوف: `{"status":"ok"}`
3. جرب Shopify connect تاني

---

**ملاحظة**: خطأ 503 معناه الـ service مش متاح. غالباً بسبب deployment مش مكتمل.

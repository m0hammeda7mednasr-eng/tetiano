# إصلاحات حرجة - المشاكل اللي لازم تتحل فوراً

## 🚨 المشاكل الحرجة (Critical)

### 1. Migration ناقص - مفيش جداول أساسية
**المشكلة**: Migration 001 مقطوع ومفيش فيه جداول مهمة زي:
- `variants` - للمنتجات
- `inventory_levels` - للمخزون
- `audit_logs` - للتتبع
- `shopify_webhook_events` - للـ webhooks
- `shopify_customers` - للعملاء
- `shopify_orders` - للطلبات

**الحل**: هكمل الـ migration بكل الجداول المطلوبة

### 2. brand_id vs store_id - ازدواجية
**المشكلة**: الكود بيستخدم brand_id و store_id في نفس الوقت

**الحل**: هوحد كل حاجة على store_id

### 3. ملفات مقطوعة
**المشكلة**: app.ts و shopifyOAuth.ts مش كاملين

**الحل**: هكمل الملفات دي

## ✅ الحلول

جاري التنفيذ...

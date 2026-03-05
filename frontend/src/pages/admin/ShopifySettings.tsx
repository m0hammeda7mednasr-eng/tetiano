import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Zap,
  Settings,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle,
  Server,
  Webhook,
  Package,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "../../lib/api";
import { useToastStore } from "../../store/toastStore";

interface BrandIntegration {
  id: string;
  name: string;
  shopify_domain: string;
  api_key?: string;
  is_configured: boolean;
  last_sync?: string;
  sync_status: "synced" | "syncing" | "error" | "pending";
  webhook_status: "active" | "inactive" | "error";
  products_count: number;
  orders_count: number;
}

interface WebhookConfig {
  topic: string;
  enabled: boolean;
  last_event?: string;
  pending_count: number;
}

export default function ShopifySettings() {
  const { addToast } = useToastStore();

  const [brands, setBrands] = useState<BrandIntegration[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [brandsRes, webhooksRes] = await Promise.all([
        api.get("/api/admin/shopify/brands"),
        api.get("/api/admin/shopify/webhooks"),
      ]);
      setBrands(brandsRes.data.brands || []);
      setWebhooks(webhooksRes.data.webhooks || []);
    } catch (err: any) {
      addToast("خطأ في تحميل البيانات", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncBrand = async (brandId: string) => {
    try {
      setSyncing(brandId);
      await api.post(`/api/inventory/sync-brand/${brandId}`);
      addToast("جاري المزامجة...", "success");
      setTimeout(() => load(), 2000);
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ في المزامجة", "error");
    } finally {
      setSyncing(null);
    }
  };

  const toggleWebhook = async (topic: string, enabled: boolean) => {
    try {
      await api.patch(`/api/admin/shopify/webhooks/${topic}`, { enabled });
      addToast(enabled ? `تفعيل ${topic}` : `تعطيل ${topic}`, "success");
      await load();
    } catch (err: any) {
      addToast("خطأ", "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getSyncStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      synced: {
        icon: CheckCircle,
        color: "text-emerald-600",
        label: "مزامج",
        badgeClass: "badge-green",
      },
      syncing: {
        icon: RefreshCw,
        color: "text-blue-600",
        label: "جاري",
        badgeClass: "badge-blue animate-spin",
      },
      error: {
        icon: AlertTriangle,
        color: "text-red-600",
        label: "خطأ",
        badgeClass: "badge-red",
      },
      pending: {
        icon: Zap,
        color: "text-amber-600",
        label: "معلق",
        badgeClass: "badge-yellow",
      },
    };
    return configs[status] || configs.pending;
  };

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <span className="section-label">Shopify Integration</span>
          </div>
          <h1 className="page-title">إعدادات Shopify</h1>
          <p className="page-subtitle">
            إدارة الربط مع متاجرك والمزامجة التلقائية
          </p>
        </div>
        <button onClick={() => load()} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Info Card */}
      <div className="card border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent p-5">
        <div className="flex gap-3">
          <Server className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-1">
              كيفية الربط
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              1️⃣ انتقل إلى متجرك Shopify وأنشئ تطبيق جديد (Custom App)
              <br />
              2️⃣ احصل على API Key و Access Token
              <br />
              3️⃣ انسخهما هنا وسيتم ربط المتجر تلقائياً
              <br />
              4️⃣ تأكد من تفعيل الـ Webhooks لمزامجة تلقائية
            </p>
          </div>
        </div>
      </div>

      {/* Brands Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" />
          المتاجر المربوطة ({brands.length})
        </h2>

        {loading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="card flex flex-col items-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-400">
              لا توجد متاجر مربوطة
            </p>
            <p className="text-xs text-slate-400 mt-1">
              انتقل إلى إعدادات العلامة التجارية لإضافة متجر Shopify
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {brands.map((brand) => {
              const syncConfig = getSyncStatusConfig(brand.sync_status);
              return (
                <div
                  key={brand.id}
                  className="card overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow"
                >
                  <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-transparent border-b border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-black text-slate-800 mb-1">
                          {brand.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {brand.shopify_domain}
                        </p>
                      </div>
                      <span
                        className={`badge ${brand.is_configured ? "badge-green" : "badge-red"}`}
                      >
                        {brand.is_configured ? "✓ مربوط" : "✗ غير مربوط"}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <syncConfig.icon
                            className={`w-5 h-5 ${syncConfig.color}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">
                            حالة المزامجة
                          </p>
                          <p className="text-sm font-black text-slate-800">
                            {syncConfig.label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            brand.webhook_status === "active"
                              ? "bg-emerald-100"
                              : "bg-slate-100"
                          }`}
                        >
                          <Webhook
                            className={`w-5 h-5 ${
                              brand.webhook_status === "active"
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">Webhooks</p>
                          <p className="text-sm font-black text-slate-800">
                            {brand.webhook_status === "active"
                              ? "مفعّل"
                              : "معطّل"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="px-3 py-2 bg-slate-50 rounded-lg">
                        <p className="text-[10px] text-slate-500 font-medium">
                          المنتجات
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          {brand.products_count}
                        </p>
                      </div>
                      <div className="px-3 py-2 bg-slate-50 rounded-lg">
                        <p className="text-[10px] text-slate-500 font-medium">
                          الأوردرات
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          {brand.orders_count}
                        </p>
                      </div>
                      <div className="px-3 py-2 bg-slate-50 rounded-lg">
                        <p className="text-[10px] text-slate-500 font-medium">
                          آخر تحديث
                        </p>
                        <p className="text-[10px] font-black text-slate-800">
                          {brand.last_sync
                            ? new Date(brand.last_sync).toLocaleString(
                                "ar-EG",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* API Key (if configured) */}
                    {brand.api_key && (
                      <div className="border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500 font-medium mb-2">
                          API Key
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-slate-50 rounded-lg font-mono text-xs text-slate-600 overflow-hidden">
                            {showSecret === brand.id
                              ? brand.api_key
                              : "••••••••••••••••"}
                          </div>
                          <button
                            onClick={() =>
                              setShowSecret(
                                showSecret === brand.id ? null : brand.id,
                              )
                            }
                            className="px-2 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {showSecret === brand.id ? (
                              <EyeOff className="w-4 h-4 text-slate-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              copyToClipboard(brand.api_key!, brand.id)
                            }
                            className="px-2 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {copiedId === brand.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => syncBrand(brand.id)}
                        disabled={syncing === brand.id}
                        className="flex-1 btn-secondary text-sm disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncing === brand.id ? "animate-spin" : ""}`}
                        />
                        مزامجة الآن
                      </button>
                      <button className="flex-1 btn-primary text-sm">
                        <Settings className="w-3.5 h-3.5" />
                        الإعدادات
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-indigo-600" />
          إعدادات Webhooks
        </h2>

        <div className="grid gap-3">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))
          ) : webhooks.length === 0 ? (
            <div className="card text-center py-8">
              <Webhook className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">لا توجد webhooks مفعّلة</p>
            </div>
          ) : (
            webhooks.map((wh) => (
              <div
                key={wh.topic}
                className="card p-4 flex items-center justify-between border border-slate-200"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-800">
                    {wh.topic}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {wh.last_event
                      ? `آخر حدث: ${new Date(wh.last_event).toLocaleString("ar-EG")}`
                      : "لم يتم التفعيل"}
                  </p>
                  {wh.pending_count > 0 && (
                    <span className="badge badge-yellow text-[9px] mt-2">
                      {wh.pending_count} معلقة
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={wh.enabled}
                    onChange={(e) => toggleWebhook(wh.topic, e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm font-bold text-slate-600">
                    {wh.enabled ? "مفعّل" : "معطّل"}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Testing Section */}
      <div className="card p-5 border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-transparent">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-2">
              اختبر الربط
            </h3>
            <button className="btn-secondary text-sm">
              <Zap className="w-3.5 h-3.5" />
              إرسال webhook تجريبي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Zap,
  RefreshCw,
  Copy,
  Check,
  CheckCircle,
  Server,
  Webhook,
  Eye,
  EyeOff,
  Link,
  Save,
  AlertCircle,
} from "lucide-react";
import api from "../../lib/api";
import { useToastStore } from "../../store/toastStore";

interface ShopifyConfig {
  shopify_domain: string;
  client_id: string;
  client_secret: string;
  is_connected: boolean;
  redirect_uri: string;
}

interface WebhookConfig {
  topic: string;
  label: string;
  enabled: boolean;
  last_event?: string;
  status: "active" | "inactive" | "error";
}

export default function ShopifySettings() {
  const { addToast } = useToastStore();

  const [config, setConfig] = useState<ShopifyConfig>({
    shopify_domain: "",
    client_id: "",
    client_secret: "",
    is_connected: false,
    redirect_uri: "",
  });

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    { topic: "orders/create", label: "إنشاء أوردر جديد", enabled: false, status: "inactive" },
    { topic: "orders/updated", label: "تحديث أوردر", enabled: false, status: "inactive" },
    { topic: "products/create", label: "إضافة منتج", enabled: false, status: "inactive" },
    { topic: "products/update", label: "تحديث منتج", enabled: false, status: "inactive" },
    { topic: "inventory_levels/update", label: "تحديث المخزون", enabled: false, status: "inactive" },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/shopify/config");
      if (res.data.config) {
        setConfig(res.data.config);
      }
      if (res.data.webhooks) {
        setWebhooks(res.data.webhooks);
      }
    } catch (err: any) {
      console.error("Error loading config:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config.shopify_domain || !config.client_id || !config.client_secret) {
      addToast("يرجى ملء جميع الحقول", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await api.post("/api/admin/shopify/config", {
        shopify_domain: config.shopify_domain,
        client_id: config.client_id,
        client_secret: config.client_secret,
      });
      
      setConfig(res.data.config);
      addToast("تم حفظ الإعدادات بنجاح", "success");
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ في حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  const connectToShopify = async () => {
    if (!config.is_connected) {
      addToast("يرجى حفظ الإعدادات أولاً", "error");
      return;
    }

    try {
      const res = await api.get("/api/admin/shopify/auth-url");
      window.location.href = res.data.url;
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ في الاتصال", "error");
    }
  };

  const toggleWebhook = async (topic: string, enabled: boolean) => {
    try {
      await api.patch(`/api/admin/shopify/webhooks/${topic}`, { enabled });
      setWebhooks(prev =>
        prev.map(wh =>
          wh.topic === topic
            ? { ...wh, enabled, status: enabled ? "active" : "inactive" }
            : wh
        )
      );
      addToast(enabled ? `تم تفعيل ${topic}` : `تم تعطيل ${topic}`, "success");
    } catch (err: any) {
      addToast("خطأ في تحديث Webhook", "error");
    }
  };

  const setupAllWebhooks = async () => {
    try {
      await api.post("/api/admin/shopify/webhooks/setup-all");
      addToast("جاري تفعيل جميع الـ Webhooks...", "success");
      setTimeout(() => loadConfig(), 2000);
    } catch (err: any) {
      addToast("خطأ في تفعيل Webhooks", "error");
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast("تم النسخ", "success");
    setTimeout(() => setCopiedField(null), 1500);
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
            ربط متجرك وإدارة المزامجة التلقائية
          </p>
        </div>
        <button onClick={loadConfig} className="btn-secondary" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Connection Status */}
      {config.is_connected && (
        <div className="card border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-transparent p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800">متصل بـ Shopify</h3>
              <p className="text-xs text-slate-600">{config.shopify_domain}</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-black text-slate-800">إعدادات الاتصال</h2>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700 space-y-2">
              <p className="font-bold">خطوات الربط:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>اذهب إلى Shopify Admin → Apps → App development</li>
                <li>أنشئ Custom App جديد</li>
                <li>احصل على Client ID و Client Secret</li>
                <li>أدخل البيانات هنا واحفظ</li>
                <li>انسخ Redirect URI وضعه في إعدادات التطبيق في Shopify</li>
                <li>اضغط "Connect to Shopify"</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Shopify Domain */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Shopify Store Domain
            </label>
            <input
              type="text"
              value={config.shopify_domain}
              onChange={(e) => setConfig({ ...config, shopify_domain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="input w-full"
              disabled={config.is_connected}
            />
            <p className="text-xs text-slate-500 mt-1">
              مثال: my-store.myshopify.com
            </p>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Client ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.client_id}
                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                placeholder="Enter Client ID"
                className="input flex-1"
                disabled={config.is_connected}
              />
              {config.client_id && (
                <button
                  onClick={() => copyToClipboard(config.client_id, "client_id")}
                  className="btn-secondary"
                >
                  {copiedField === "client_id" ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Client Secret
            </label>
            <div className="flex gap-2">
              <input
                type={showSecret ? "text" : "password"}
                value={config.client_secret}
                onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                placeholder="Enter Client Secret"
                className="input flex-1 font-mono"
                disabled={config.is_connected}
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="btn-secondary"
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              {config.client_secret && (
                <button
                  onClick={() => copyToClipboard(config.client_secret, "client_secret")}
                  className="btn-secondary"
                >
                  {copiedField === "client_secret" ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Redirect URI */}
          {config.redirect_uri && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Redirect URI
                <span className="text-xs font-normal text-slate-500 mr-2">
                  (انسخه وضعه في Shopify)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.redirect_uri}
                  readOnly
                  className="input flex-1 bg-slate-50 font-mono text-xs"
                />
                <button
                  onClick={() => copyToClipboard(config.redirect_uri, "redirect_uri")}
                  className="btn-secondary"
                >
                  {copiedField === "redirect_uri" ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={saveConfig}
            disabled={saving || config.is_connected}
            className="btn-primary flex-1"
          >
            <Save className="w-4 h-4" />
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
          <button
            onClick={connectToShopify}
            disabled={!config.is_connected}
            className="btn-secondary flex-1"
          >
            <Link className="w-4 h-4" />
            Connect to Shopify
          </button>
        </div>
      </div>

      {/* Webhooks Section */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-800">Webhooks</h2>
          </div>
          <button
            onClick={setupAllWebhooks}
            disabled={!config.is_connected}
            className="btn-secondary text-sm"
          >
            <Zap className="w-4 h-4" />
            تفعيل الكل
          </button>
        </div>

        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.topic}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-800">{wh.label}</h4>
                  <span
                    className={`badge text-[9px] ${
                      wh.status === "active"
                        ? "badge-green"
                        : wh.status === "error"
                          ? "badge-red"
                          : "badge-gray"
                    }`}
                  >
                    {wh.status === "active" ? "نشط" : wh.status === "error" ? "خطأ" : "معطل"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">{wh.topic}</p>
                {wh.last_event && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    آخر حدث: {new Date(wh.last_event).toLocaleString("ar-EG")}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm font-bold text-slate-600">
                  {wh.enabled ? "مفعّل" : "معطّل"}
                </span>
                <input
                  type="checkbox"
                  checked={wh.enabled}
                  onChange={(e) => toggleWebhook(wh.topic, e.target.checked)}
                  disabled={!config.is_connected}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          ))}
        </div>

        {!config.is_connected && (
          <div className="text-center py-4 text-sm text-slate-500">
            يجب الاتصال بـ Shopify أولاً لتفعيل Webhooks
          </div>
        )}
      </div>
    </div>
  );
}

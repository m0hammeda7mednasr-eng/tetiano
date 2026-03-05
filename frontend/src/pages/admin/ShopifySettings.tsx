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
  ExternalLink,
  Settings,
  Package,
  Activity,
} from "lucide-react";
import api from "../../lib/api";
import { useToastStore } from "../../store/toastStore";

interface ShopifyConfig {
  shopify_domain: string;
  client_id: string;
  client_secret: string;
  is_connected: boolean;
  redirect_uri: string;
  backend_url: string;
}

interface WebhookConfig {
  topic: string;
  label: string;
  description: string;
  enabled: boolean;
  last_event?: string;
  status: "active" | "inactive" | "error";
}

interface ConnectedBrand {
  id: string;
  name: string;
  shopify_domain: string;
  connected_at: string;
  last_sync_at?: string;
  products_count: number;
  orders_count: number;
  is_configured: boolean;
}

export default function ShopifySettings() {
  const { addToast } = useToastStore();

  // Configuration State
  const [config, setConfig] = useState<ShopifyConfig>({
    shopify_domain: "",
    client_id: "",
    client_secret: "",
    is_connected: false,
    redirect_uri: "",
    backend_url: "",
  });

  // Webhooks State
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      topic: "orders/create",
      label: "إنشاء أوردر جديد",
      description: "يتم تفعيله عند إنشاء أوردر جديد في Shopify",
      enabled: false,
      status: "inactive",
    },
    {
      topic: "orders/updated",
      label: "تحديث أوردر",
      description: "يتم تفعيله عند تحديث حالة أوردر",
      enabled: false,
      status: "inactive",
    },
    {
      topic: "products/create",
      label: "إضافة منتج",
      description: "يتم تفعيله عند إضافة منتج جديد",
      enabled: false,
      status: "inactive",
    },
    {
      topic: "products/update",
      label: "تحديث منتج",
      description: "يتم تفعيله عند تحديث بيانات منتج",
      enabled: false,
      status: "inactive",
    },
    {
      topic: "inventory_levels/update",
      label: "تحديث المخزون",
      description: "يتم تفعيله عند تغيير كمية المخزون",
      enabled: false,
      status: "inactive",
    },
  ]);

  // Connected Brands State
  const [connectedBrands, setConnectedBrands] = useState<ConnectedBrand[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "webhooks" | "brands">("config");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadConfig(), loadBrands()]);
    } catch (err: any) {
      console.error("Error loading:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await api.get("/api/admin/shopify/config");
      if (res.data.config) {
        setConfig(res.data.config);
      }
      if (res.data.webhooks) {
        setWebhooks(res.data.webhooks);
      }
    } catch (err: any) {
      console.error("Error loading config:", err);
    }
  };

  const loadBrands = async () => {
    try {
      const res = await api.get("/api/admin/shopify/brands");
      if (res.data.brands) {
        setConnectedBrands(res.data.brands.filter((b: any) => b.is_configured));
      }
    } catch (err: any) {
      console.error("Error loading brands:", err);
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
      addToast("تم حفظ الإعدادات بنجاح ✓", "success");
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ في حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleWebhook = async (topic: string, enabled: boolean) => {
    try {
      await api.patch(`/api/admin/shopify/webhooks/${topic}`, { enabled });
      setWebhooks((prev) =>
        prev.map((wh) =>
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

  const syncBrand = async (brandId: string) => {
    try {
      await api.post(`/api/admin/shopify/brands/${brandId}/sync`);
      addToast("جاري المزامجة...", "success");
      setTimeout(() => loadBrands(), 2000);
    } catch (err: any) {
      addToast("خطأ في المزامجة", "error");
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast("تم النسخ ✓", "success");
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
          <p className="page-subtitle">ربط متجرك وإدارة المزامجة التلقائية</p>
        </div>
        <button
          onClick={loadAll}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Connection Status Banner */}
      {config.is_connected && connectedBrands.length > 0 && (
        <div className="card border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  متصل بـ Shopify
                </h3>
                <p className="text-xs text-slate-600">
                  {connectedBrands.length} متجر مربوط
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connectedBrands.slice(0, 3).map((brand) => (
                <div
                  key={brand.id}
                  className="px-3 py-1 bg-white rounded-lg border border-green-200"
                >
                  <p className="text-xs font-bold text-slate-700">{brand.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card p-1 flex gap-1">
        <button
          onClick={() => setActiveTab("config")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "config"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Server className="w-4 h-4 inline-block ml-2" />
          إعدادات الاتصال
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "webhooks"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Webhook className="w-4 h-4 inline-block ml-2" />
          Webhooks
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "brands"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Package className="w-4 h-4 inline-block ml-2" />
          المتاجر المربوطة
        </button>
      </div>

      {/* Configuration Tab */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {/* Setup Guide */}
          <div className="card border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent p-5">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-700 space-y-3">
                <p className="font-bold text-slate-800">خطوات الربط:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                  <li>
                    اذهب إلى Shopify Admin → Settings → Apps and sales channels
                    → Develop apps
                  </li>
                  <li>اضغط "Create an app" وأدخل اسم التطبيق</li>
                  <li>
                    في تبويب Configuration، اضغط "Configure" في Admin API
                    integration
                  </li>
                  <li>
                    اختر الصلاحيات المطلوبة: Products (read/write), Inventory
                    (read/write), Orders (read)
                  </li>
                  <li>احفظ واضغط "Install app"</li>
                  <li>
                    انسخ Admin API access token و API key وضعهم في الحقول أدناه
                  </li>
                  <li>
                    انسخ Redirect URI من الأسفل وضعه في App setup → URLs →
                    Allowed redirection URL(s)
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-black text-slate-800">
                بيانات الاتصال
              </h2>
            </div>

            <div className="space-y-4">
              {/* Shopify Domain */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Shopify Store Domain
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <input
                  type="text"
                  value={config.shopify_domain}
                  onChange={(e) =>
                    setConfig({ ...config, shopify_domain: e.target.value })
                  }
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
                  API Key (Client ID)
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.client_id}
                    onChange={(e) =>
                      setConfig({ ...config, client_id: e.target.value })
                    }
                    placeholder="Enter API Key"
                    className="input flex-1 font-mono text-sm"
                    disabled={config.is_connected}
                  />
                  {config.client_id && (
                    <button
                      onClick={() =>
                        copyToClipboard(config.client_id, "client_id")
                      }
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
                  Admin API Access Token (Client Secret)
                  <span className="text-red-500 mr-1">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={config.client_secret}
                    onChange={(e) =>
                      setConfig({ ...config, client_secret: e.target.value })
                    }
                    placeholder="shpat_xxxxxxxxxxxxx"
                    className="input flex-1 font-mono text-sm"
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
                      onClick={() =>
                        copyToClipboard(config.client_secret, "client_secret")
                      }
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

              {/* Redirect URI - Always Show */}
              <div className="pt-4 border-t border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Redirect URI
                  <span className="text-xs font-normal text-orange-600 mr-2">
                    (انسخه وضعه في إعدادات التطبيق في Shopify)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      config.redirect_uri ||
                      `${config.backend_url || window.location.origin}/api/shopify/callback`
                    }
                    readOnly
                    className="input flex-1 bg-slate-50 font-mono text-xs"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        config.redirect_uri ||
                          `${config.backend_url || window.location.origin}/api/shopify/callback`,
                        "redirect_uri"
                      )
                    }
                    className="btn-secondary"
                  >
                    {copiedField === "redirect_uri" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  ضع هذا الرابط في Shopify App Setup → URLs → Allowed
                  redirection URL(s)
                </p>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Webhook URL
                  <span className="text-xs font-normal text-slate-500 mr-2">
                    (للـ Webhooks)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${config.backend_url || window.location.origin}/api/webhooks/shopify`}
                    readOnly
                    className="input flex-1 bg-slate-50 font-mono text-xs"
                  />
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${config.backend_url || window.location.origin}/api/webhooks/shopify`,
                        "webhook_url"
                      )
                    }
                    className="btn-secondary"
                  >
                    {copiedField === "webhook_url" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={saveConfig}
                disabled={saving || config.is_connected}
                className="btn-primary flex-1"
              >
                <Save className="w-4 h-4" />
                {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </button>
              {config.is_connected && (
                <a
                  href={`https://${config.shopify_domain}/admin/settings/apps/development`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  فتح Shopify Admin
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-slate-800">
                  إدارة Webhooks
                </h2>
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
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-black text-slate-800">
                        {wh.label}
                      </h4>
                      <span
                        className={`badge text-[9px] ${
                          wh.status === "active"
                            ? "badge-green"
                            : wh.status === "error"
                              ? "badge-red"
                              : "badge-gray"
                        }`}
                      >
                        {wh.status === "active"
                          ? "نشط"
                          : wh.status === "error"
                            ? "خطأ"
                            : "معطل"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      {wh.description}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {wh.topic}
                    </p>
                    {wh.last_event && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        آخر حدث:{" "}
                        {new Date(wh.last_event).toLocaleString("ar-EG")}
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
                      onChange={(e) =>
                        toggleWebhook(wh.topic, e.target.checked)
                      }
                      disabled={!config.is_connected}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                </div>
              ))}
            </div>

            {!config.is_connected && (
              <div className="text-center py-8 text-sm text-slate-500">
                يجب حفظ إعدادات الاتصال أولاً لتفعيل Webhooks
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected Brands Tab */}
      {activeTab === "brands" && (
        <div className="space-y-4">
          {connectedBrands.length === 0 ? (
            <div className="card flex flex-col items-center py-12">
              <Package className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400">
                لا توجد متاجر مربوطة
              </p>
              <p className="text-xs text-slate-400 mt-1">
                قم بربط متجر من إعدادات العلامات التجارية
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {connectedBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="card p-5 border border-slate-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-800 mb-1">
                        {brand.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {brand.shopify_domain}
                      </p>
                    </div>
                    <span className="badge badge-green">✓ مربوط</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
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
                        آخر مزامجة
                      </p>
                      <p className="text-[10px] font-black text-slate-800">
                        {brand.last_sync_at
                          ? new Date(brand.last_sync_at).toLocaleString(
                              "ar-EG",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => syncBrand(brand.id)}
                    className="btn-secondary w-full text-sm"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    مزامجة الآن
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

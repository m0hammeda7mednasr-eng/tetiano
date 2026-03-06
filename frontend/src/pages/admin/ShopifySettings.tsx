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
  AlertCircle,
  ExternalLink,
  Settings,
  Package,
  Activity,
  XCircle,
  Link as LinkIcon,
} from "lucide-react";
import api from "../../lib/api";
import { useToastStore } from "../../store/toastStore";

interface BrandConfig {
  id: string;
  name: string;
  shopify_domain: string;
  shopify_api_key: string;
  is_configured: boolean;
  connected_at?: string;
  last_sync_at?: string;
  products_count: number;
  orders_count: number;
}

interface WebhookConfig {
  topic: string;
  label: string;
  description: string;
  enabled: boolean;
  last_event?: string;
  status: "active" | "inactive" | "error";
}

export default function ShopifySettings() {
  const { addToast } = useToastStore();

  const [brands, setBrands] = useState<BrandConfig[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [oauthData, setOauthData] = useState({
    shop: "",
    api_key: "",
    api_secret: "",
  });

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

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"brands" | "webhooks">("brands");

  const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const redirectUri = `${backendUrl}/api/shopify/callback`;

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/shopify/brands");
      if (res.data.brands) {
        setBrands(res.data.brands);
      }
    } catch (err: any) {
      console.error("Error loading brands:", err);
      addToast("خطأ في تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const startOAuthFlow = async () => {
    if (!selectedBrand) {
      addToast("يرجى اختيار علامة تجارية", "error");
      return;
    }

    if (!oauthData.shop || !oauthData.api_key || !oauthData.api_secret) {
      addToast("يرجى ملء جميع الحقول", "error");
      return;
    }

    try {
      setConnecting(true);
      
      // Build OAuth URL with query parameters
      const params = new URLSearchParams({
        shop: oauthData.shop,
        brand_id: selectedBrand,
        api_key: oauthData.api_key,
        api_secret: oauthData.api_secret,
      });

      // Redirect to OAuth endpoint
      window.location.href = `${backendUrl}/api/shopify/auth?${params.toString()}`;
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ في بدء الربط", "error");
      setConnecting(false);
    }
  };

  const disconnectBrand = async (brandId: string) => {
    if (!confirm("هل أنت متأكد من فصل هذا المتجر؟")) return;

    try {
      await api.delete(`/api/admin/shopify/brands/${brandId}/disconnect`);
      addToast("تم فصل المتجر", "success");
      await loadBrands();
    } catch (err: any) {
      addToast("خطأ في فصل المتجر", "error");
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
      setTimeout(() => loadBrands(), 2000);
    } catch (err: any) {
      addToast("خطأ في تفعيل Webhooks", "error");
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast("تم النسخ ✓", "success");
    setTimeout(() => setCopiedField(null), 1500);
  };

  const connectedBrands = brands.filter((b) => b.is_configured);
  const unconnectedBrands = brands.filter((b) => !b.is_configured);

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <span className="section-label">Shopify Integration</span>
          </div>
          <h1 className="page-title">ربط متاجر Shopify</h1>
          <p className="page-subtitle">ربط آمن عبر OAuth 2.0</p>
        </div>
        <button
          onClick={loadBrands}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {/* Connection Status */}
      {connectedBrands.length > 0 && (
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
                  <p className="text-xs font-bold text-slate-700">
                    {brand.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Redirect URI Info - Always Visible */}
      <div className="card border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-transparent p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-black text-slate-800">
              Redirect URI - مهم جداً!
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            انسخ هذا الرابط وضعه في إعدادات التطبيق في Shopify قبل الربط
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={redirectUri}
              readOnly
              className="input flex-1 bg-white font-mono text-sm font-bold text-orange-700"
            />
            <button
              onClick={() => copyToClipboard(redirectUri, "redirect_uri")}
              className="btn-primary"
            >
              {copiedField === "redirect_uri" ? (
                <>
                  <Check className="w-4 h-4" />
                  تم
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  نسخ
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            📍 المكان: Shopify Admin → Settings → Apps → Develop apps → [Your
            App] → Configuration → App setup → URLs → Allowed redirection
            URL(s)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card p-1 flex gap-1">
        <button
          onClick={() => setActiveTab("brands")}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "brands"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Package className="w-4 h-4 inline-block ml-2" />
          المتاجر ({brands.length})
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
      </div>

      {/* Brands Tab */}
      {activeTab === "brands" && (
        <div className="space-y-6">
          {/* Setup Guide */}
          <div className="card border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent p-5">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-700 space-y-3">
                <p className="font-bold text-slate-800">خطوات الربط:</p>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                  <li>
                    اذهب إلى Shopify Admin → Settings → Apps and sales
                    channels → Develop apps
                  </li>
                  <li>اضغط "Create an app" وأدخل اسم التطبيق</li>
                  <li>
                    في تبويب Configuration، اضغط "Configure" في Admin API
                    integration
                  </li>
                  <li>
                    اختر الصلاحيات: Products (read/write), Inventory
                    (read/write), Orders (read), Locations (read)
                  </li>
                  <li>احفظ التغييرات</li>
                  <li>
                    في App setup → URLs → Allowed redirection URL(s)، الصق
                    الـ Redirect URI من الأعلى
                  </li>
                  <li>احفظ واضغط "Install app"</li>
                  <li>
                    انسخ API key و API secret key (ليس Admin API access token!)
                  </li>
                  <li>الصقهم في النموذج أدناه واضغط "ربط عبر OAuth"</li>
                </ol>
              </div>
            </div>
          </div>

          {/* OAuth Connection Form */}
          {unconnectedBrands.length > 0 && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-black text-slate-800">
                  ربط متجر جديد عبر OAuth
                </h2>
              </div>

              <div className="space-y-4">
                {/* Brand Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    اختر العلامة التجارية
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <select
                    value={selectedBrand || ""}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="input w-full"
                    disabled={connecting}
                  >
                    <option value="">-- اختر --</option>
                    {unconnectedBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shop Domain */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Shopify Store Domain
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={oauthData.shop}
                    onChange={(e) =>
                      setOauthData({ ...oauthData, shop: e.target.value })
                    }
                    placeholder="your-store.myshopify.com"
                    className="input w-full"
                    disabled={connecting}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    مثال: my-store.myshopify.com
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    API Key (Client ID)
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={oauthData.api_key}
                    onChange={(e) =>
                      setOauthData({ ...oauthData, api_key: e.target.value })
                    }
                    placeholder="Enter API Key"
                    className="input w-full font-mono text-sm"
                    disabled={connecting}
                  />
                </div>

                {/* API Secret */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    API Secret Key
                    <span className="text-red-500 mr-1">*</span>
                    <span className="text-xs font-normal text-orange-600 mr-2">
                      (ليس Admin API access token!)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={oauthData.api_secret}
                      onChange={(e) =>
                        setOauthData({
                          ...oauthData,
                          api_secret: e.target.value,
                        })
                      }
                      placeholder="shpss_xxxxxxxxxxxxx"
                      className="input flex-1 font-mono text-sm"
                      disabled={connecting}
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="btn-secondary"
                      disabled={connecting}
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    يبدأ بـ shpss_ (وليس shpat_)
                  </p>
                </div>
              </div>

              {/* OAuth Button */}
              <button
                onClick={startOAuthFlow}
                disabled={connecting || !selectedBrand}
                className="btn-primary w-full"
              >
                <LinkIcon className="w-4 h-4" />
                {connecting ? "جاري التوجيه إلى Shopify..." : "ربط عبر OAuth"}
              </button>
            </div>
          )}

          {/* Connected Brands */}
          {connectedBrands.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-slate-800">
                المتاجر المربوطة ({connectedBrands.length})
              </h3>
              <div className="grid gap-4">
                {connectedBrands.map((brand) => (
                  <div
                    key={brand.id}
                    className="card p-5 border border-slate-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-black text-slate-800 mb-1">
                          {brand.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mb-2">
                          {brand.shopify_domain}
                        </p>
                        {brand.connected_at && (
                          <p className="text-[10px] text-slate-400">
                            تم الربط:{" "}
                            {new Date(brand.connected_at).toLocaleString(
                              "ar-EG"
                            )}
                          </p>
                        )}
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => syncBrand(brand.id)}
                        className="flex-1 btn-secondary text-sm"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        مزامجة
                      </button>
                      <button
                        onClick={() => disconnectBrand(brand.id)}
                        className="flex-1 btn-secondary text-sm text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        فصل
                      </button>
                      <a
                        href={`https://${brand.shopify_domain}/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        فتح
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brands.length === 0 && !loading && (
            <div className="card flex flex-col items-center py-12">
              <Package className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400">
                لا توجد علامات تجارية
              </p>
              <p className="text-xs text-slate-400 mt-1">
                قم بإضافة علامة تجارية أولاً من إعدادات النظام
              </p>
            </div>
          )}
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
                disabled={connectedBrands.length === 0}
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
                      disabled={connectedBrands.length === 0}
                      className="w-5 h-5 rounded"
                    />
                  </label>
                </div>
              ))}
            </div>

            {connectedBrands.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">
                يجب ربط متجر أولاً لتفعيل Webhooks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

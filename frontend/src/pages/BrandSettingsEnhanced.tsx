import { useEffect, useState } from "react";
import api from "../lib/api";
import { useToastStore } from "../store/toastStore";
import {
  ShoppingCart,
  Eye,
  EyeOff,
  Copy,
  Check,
  Server,
  Zap,
  RefreshCw,
  Settings,
  Calendar,
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  shopify_domain?: string;
  shopify_api_key?: string;
  is_configured: boolean;
  last_sync_at?: string;
}

export default function BrandSettingsPage() {
  const { addToast } = useToastStore();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupBrand, setSetupBrand] = useState<Brand | null>(null);
  const [setupForm, setSetupForm] = useState({
    apiKey: "",
    accessToken: "",
    domain: "",
    locationId: "",
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data } = await api.get("/api/admin/shopify/brands");
      setBrands(data.brands || []);
    } catch (err) {
      addToast("خطأ في تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const openSetupModal = (brand: Brand) => {
    setSetupBrand(brand);
    setSetupForm({
      apiKey: brand.shopify_api_key || "",
      accessToken: "",
      domain: brand.shopify_domain || "",
      locationId: "",
    });
    setShowSetupModal(true);
  };

  const handleSetupSubmit = async () => {
    if (!setupForm.apiKey || !setupForm.accessToken || !setupForm.domain) {
      addToast("بيانات ناقصة", "error");
      return;
    }

    try {
      await api.post("/api/admin/shopify/setup-credentials", {
        brandId: setupBrand?.id,
        apiKey: setupForm.apiKey,
        accessToken: setupForm.accessToken,
        domain: setupForm.domain,
        locationId: setupForm.locationId,
      });

      addToast("تم حفظ بيانات Shopify", "success");
      setShowSetupModal(false);
      fetchBrands();
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ", "error");
    }
  };

  const handleSync = async (brandId: string) => {
    try {
      setSyncing(brandId);
      await api.post(`/api/inventory/sync-brand/${brandId}`);
      addToast("جاري المزامجة...", "success");
      setTimeout(() => fetchBrands(), 2000);
    } catch (err: any) {
      addToast(err.response?.data?.error || "خطأ في المزامجة", "error");
    } finally {
      setSyncing(null);
    }
  };

  const handleConnect = async (brand: Brand) => {
    if (!brand.is_configured) {
      addToast("يجب تكوين بيانات أولاً", "error");
      return;
    }
    try {
      const { data } = await api.get("/api/shopify/auth", {
        params: {
          shop: brand.shopify_domain,
          brand_id: brand.id,
          response: "json",
        },
      });

      if (!data?.installUrl) {
        throw new Error("Install URL was not returned by backend");
      }

      window.location.href = data.installUrl;
    } catch (err: any) {
      addToast("خطأ في الاتصال", "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <span className="section-label">Brand Settings</span>
          </div>
          <h1 className="page-title">إعدادات العلامات التجارية</h1>
          <p className="page-subtitle">ربط متاجر Shopify والمزامجة التلقائية</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-transparent p-5">
        <div className="flex gap-3">
          <Server className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              كيفية الربط مع Shopify
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              1️⃣ انتقل إلى متجرك Shopify وأنشئ Custom App جديد
              <br />
              2️⃣ احصل على API Key و Access Token
              <br />
              3️⃣ انسخهما هنا في حقول البيانات
              <br />
              4️⃣ اضغط "ربط مع Shopify" لتفعيل المزامجة التلقائية
            </p>
          </div>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="card overflow-hidden group hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {brand.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {brand.shopify_domain || "غير مربوط"}
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  brand.is_configured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {brand.is_configured ? "✓ مربوط" : "✗ غير مربوط"}
              </div>
            </div>

            {/* Stats */}
            {brand.last_sync_at && (
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs">
                <p className="text-slate-500 mb-0.5">آخر مزامجة</p>
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(brand.last_sync_at).toLocaleDateString("ar-EG")}
                </p>
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* API Keys Display */}
              {brand.shopify_api_key && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-bold text-slate-600 uppercase">
                    بيانات Shopify
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-slate-200">
                    <div className="text-xs font-mono text-slate-800 truncate">
                      {showSecret === "key"
                        ? brand.shopify_api_key
                        : "***" + brand.shopify_api_key.slice(-4)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setShowSecret(showSecret === "key" ? null : "key")
                        }
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                      >
                        {showSecret === "key" ? (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          brand.shopify_api_key &&
                          copyToClipboard(
                            brand.shopify_api_key,
                            `${brand.id}-key`,
                          )
                        }
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                      >
                        {copiedId === `${brand.id}-key` ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {brand.is_configured ? (
                  <>
                    <button
                      onClick={() => handleSync(brand.id)}
                      disabled={syncing === brand.id}
                      className="flex-1 btn-secondary text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {syncing === brand.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          جاري...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          مزامجة
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleConnect(brand)}
                      className="flex-1 btn-primary text-xs flex items-center justify-center gap-1.5"
                    >
                      تفعيل OAuth
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openSetupModal(brand)}
                    className="w-full btn-brand text-xs flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    تكوين
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Setup Modal */}
      {showSetupModal && setupBrand && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                تكوين {setupBrand.name}
              </h3>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Domain
                </label>
                <input
                  type="text"
                  placeholder="example.myshopify.com"
                  value={setupForm.domain}
                  onChange={(e) =>
                    setSetupForm({ ...setupForm, domain: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  API Key
                </label>
                <input
                  type="password"
                  value={setupForm.apiKey}
                  onChange={(e) =>
                    setSetupForm({ ...setupForm, apiKey: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Access Token
                </label>
                <input
                  type="password"
                  value={setupForm.accessToken}
                  onChange={(e) =>
                    setSetupForm({ ...setupForm, accessToken: e.target.value })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Location ID (اختياري)
                </label>
                <input
                  type="text"
                  value={setupForm.locationId}
                  onChange={(e) =>
                    setSetupForm({ ...setupForm, locationId: e.target.value })
                  }
                  className="input"
                  placeholder="معرّف الموقع"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSetupModal(false)}
                className="flex-1 btn-secondary"
              >
                إلغاء
              </button>
              <button onClick={handleSetupSubmit} className="flex-1 btn-brand">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



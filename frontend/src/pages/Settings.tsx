import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Info,
  Key,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  ShoppingBag,
  Store,
  Unlink,
  X,
} from "lucide-react";

interface ShopifyStatus {
  connected: boolean;
  status: "connected" | "disconnected" | "error" | string;
  shop_domain: string;
  scopes?: string;
  connected_at?: string | null;
  updated_at?: string | null;
}

function normalizeShopDomain(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, "");
  if (!normalized) return "";
  return normalized.endsWith(".myshopify.com") ? normalized : `${normalized}.myshopify.com`;
}

export default function Settings() {
  const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:3002").replace(/\/+$/, "");
  const shopifyRedirectUri = `${apiBaseUrl}/api/shopify/callback`;

  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const [showOAuth, setShowOAuth] = useState(false);
  const [oauthStep, setOauthStep] = useState<1 | 2>(1);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [oauthForm, setOauthForm] = useState({ shop: "", api_key: "", api_secret: "" });

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const msg = searchParams.get("msg");

    if (oauth === "success") {
      setMessage({ type: "success", text: "تم ربط متجر Shopify بنجاح." });
      fetchStatus();
    } else if (oauth === "declined") {
      setMessage({ type: "error", text: "تم إلغاء عملية الربط من Shopify." });
    } else if (oauth === "error") {
      setMessage({ type: "error", text: `فشل الربط: ${msg || "خطأ غير معروف"}` });
    }

    if (oauth) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStatus();
  }, []);

  const scopes = useMemo(() => {
    return (status?.scopes || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [status?.scopes]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/app/shopify/status");
      setStatus({
        connected: Boolean(data?.connected),
        status: data?.status || "disconnected",
        shop_domain: data?.shop_domain || "",
        scopes: data?.scopes || "",
        connected_at: data?.connected_at || null,
        updated_at: data?.updated_at || null,
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error || "فشل تحميل حالة Shopify.",
      });
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const { data } = await api.post("/api/app/shopify/sync/full", { wipe_existing_data: true });
      const summary = data?.summary || {};
      setMessage({
        type: "success",
        text: `تمت المزامنة بنجاح: منتجات ${summary.products || 0} - عملاء ${summary.customers || 0} - طلبات ${summary.orders || 0}`,
      });
      await fetchStatus();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "فشلت المزامنة." });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("هل تريد فصل متجر Shopify؟")) return;
    setDisconnecting(true);
    setMessage(null);
    try {
      await api.post("/api/app/shopify/disconnect");
      setMessage({ type: "info", text: "تم فصل متجر Shopify بنجاح." });
      await fetchStatus();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "فشل فصل المتجر." });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleOAuthConnect = async () => {
    setOauthError("");

    const normalizedShop = normalizeShopDomain(oauthForm.shop);
    if (!normalizedShop) return setOauthError("أدخل عنوان المتجر.");
    if (!oauthForm.api_key.trim()) return setOauthError("أدخل API Key.");
    if (!oauthForm.api_secret.trim()) return setOauthError("أدخل API Secret.");

    setOauthLoading(true);
    try {
      const { data } = await api.post("/api/app/shopify/connect", {
        shop: normalizedShop,
        api_key: oauthForm.api_key.trim(),
        api_secret: oauthForm.api_secret.trim(),
      });
      window.location.href = data.install_url || data.installUrl;
    } catch (err: any) {
      setOauthError(err?.response?.data?.error || "تعذر بدء الربط مع Shopify.");
      setOauthLoading(false);
    }
  };

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(shopifyRedirectUri);
      setMessage({ type: "success", text: "تم نسخ Redirect URI." });
    } catch {
      setMessage({ type: "info", text: shopifyRedirectUri });
    }
  };

  const openModal = () => {
    setOauthForm({ shop: "", api_key: "", api_secret: "" });
    setOauthError("");
    setOauthStep(1);
    setShowSecret(false);
    setShowOAuth(true);
  };

  return (
    <div className="space-y-8 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-4 h-4 text-brand-500" />
            <span className="section-label">Settings</span>
          </div>
          <h1 className="page-title">إعدادات Shopify</h1>
          <p className="page-subtitle">متجر واحد لكل حساب مع عزل كامل للبيانات</p>
        </div>
        <button onClick={openModal} className="btn-shopify">
          <Plus className="w-4 h-4" />
          ربط متجر Shopify
        </button>
      </div>

      {message && (
        <div className={`${message.type === "success" ? "alert-success" : message.type === "error" ? "alert-error" : "alert-info"} anim-bounce-in`}>
          {message.type === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {message.type === "error" && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {message.type === "info" && <Info className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold flex-1">{message.text}</p>
          <button className="btn-icon p-1" onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-5 w-44 rounded" />
                <div className="skeleton h-4 w-72 rounded" />
                <div className="skeleton h-10 rounded-xl" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-shopify-50 border border-shopify-200">
                    <Store className="w-6 h-6 text-shopify-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black text-slate-800">حالة الربط</h3>
                    <p className="text-xs text-slate-500">
                      {status?.connected ? "المتجر متصل ويعمل" : "لا يوجد متجر Shopify متصل"}
                    </p>
                  </div>
                  <span className={`badge ${status?.connected ? "badge-green" : "badge-red"}`}>
                    {status?.connected ? "متصل" : "غير متصل"}
                  </span>
                </div>

                {status?.connected && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Shop Domain</p>
                      <a
                        href={`https://${status.shop_domain}/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-slate-700 hover:text-brand-600 flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        {status.shop_domain}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">تاريخ الربط</p>
                      <p className="text-xs font-bold text-slate-700">
                        {status.connected_at ? new Date(status.connected_at).toLocaleString("ar-EG") : "—"}
                      </p>
                    </div>
                  </div>
                )}

                {scopes.length > 0 && (
                  <div className="bg-shopify-50 border border-shopify-100 rounded-xl px-3 py-2.5 mb-4">
                    <p className="text-[10px] font-bold text-shopify-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      الصلاحيات
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {scopes.slice(0, 8).map((scope) => (
                        <span key={scope} className="badge badge-shopify text-[9px]">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSync}
                    disabled={!status?.connected || syncing}
                    className="btn-success flex-1 justify-center disabled:opacity-50 min-w-40"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "جاري المزامنة..." : "مزامنة كاملة"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={!status?.connected || disconnecting}
                    className="btn-danger disabled:opacity-50"
                  >
                    <Unlink className="w-4 h-4" />
                    {disconnecting ? "جارٍ الفصل..." : "فصل المتجر"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-black text-slate-800 mb-2">Redirect URI</h3>
            <p className="text-xs text-slate-500 mb-3">
              أضف الرابط التالي في Shopify App داخل Allowed redirection URLs.
            </p>
            <div className="bg-slate-900 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <code className="text-[11px] text-emerald-300 font-mono break-all flex-1">{shopifyRedirectUri}</code>
              <button onClick={copyRedirectUri} className="btn-icon text-slate-200 hover:bg-slate-700">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="card p-4 space-y-2 text-xs text-slate-500 font-medium">
            <p className="font-black text-slate-800">سياسة النظام</p>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
              <span>حساب واحد = متجر واحد فقط.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
              <span>جميع البيانات معزولة حسب `store_id`.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
              <span>الربط يتم عبر Shopify OAuth الرسمي.</span>
            </div>
          </div>
        </div>
      </div>

      {showOAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
          <div className="fixed inset-0 modal-overlay" onClick={() => setShowOAuth(false)} />
          <div className="modal-box w-full max-w-md anim-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-shopify-50 border border-shopify-200 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-shopify-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">ربط متجر Shopify</h3>
                  <p className="text-[11px] text-slate-400 font-medium">OAuth 2.0</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowOAuth(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-2">
                {[1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setOauthStep(s as 1 | 2)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${oauthStep === s ? "bg-brand-500 text-white shadow-brand" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    {s === 1 ? "1) المتجر" : "2) بيانات التطبيق"}
                  </button>
                ))}
              </div>

              {oauthError && (
                <div className="alert-error anim-shake">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm font-bold">{oauthError}</p>
                </div>
              )}

              {oauthStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="section-label">Shop Domain</label>
                    <div className="relative">
                      <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={oauthForm.shop}
                        onChange={(e) => setOauthForm({ ...oauthForm, shop: e.target.value })}
                        className="input pr-9"
                        placeholder="my-store أو my-store.myshopify.com"
                        onKeyDown={(e) => e.key === "Enter" && setOauthStep(2)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!oauthForm.shop.trim()) return setOauthError("أدخل عنوان المتجر.");
                      setOauthError("");
                      setOauthStep(2);
                    }}
                    className="btn-primary w-full justify-center py-2.5"
                  >
                    التالي
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {oauthStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="section-label">API Key (Client ID)</label>
                    <input
                      type="text"
                      value={oauthForm.api_key}
                      onChange={(e) => setOauthForm({ ...oauthForm, api_key: e.target.value })}
                      className="input font-mono text-sm"
                      placeholder="shpapp_xxxxxxxxxxxxxxxxxxxxxxxx"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="section-label">API Secret Key</label>
                    <div className="relative">
                      <input
                        type={showSecret ? "text" : "password"}
                        value={oauthForm.api_secret}
                        onChange={(e) => setOauthForm({ ...oauthForm, api_secret: e.target.value })}
                        className="input font-mono text-sm pr-10"
                        placeholder="••••••••••••••••••••••••••••••••"
                        dir="ltr"
                      />
                      <button
                        onClick={() => setShowSecret((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 btn-icon p-1"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setOauthStep(1)} className="btn-secondary px-4">
                      رجوع
                    </button>
                    <button
                      onClick={handleOAuthConnect}
                      disabled={oauthLoading || !oauthForm.api_key || !oauthForm.api_secret}
                      className="btn-shopify flex-1 justify-center py-2.5 disabled:opacity-50"
                    >
                      {oauthLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          ربط عبر Shopify OAuth
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Info,
  Key,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Server,
  Settings as SettingsIcon,
  Shield,
  ShoppingBag,
  Store,
  Unlink,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  shopify_domain: string;
  shopify_location_id?: string;
  shopify_scopes?: string;
  connected_at?: string;
  last_sync_at?: string | null;
  is_active?: boolean;
}

type ServiceHealth = 'online' | 'degraded' | 'offline';

function normalizeShopDomain(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, '');
  if (!normalized) return '';
  return normalized.endsWith('.myshopify.com') ? normalized : `${normalized}.myshopify.com`;
}

function healthBadgeClass(status: ServiceHealth): string {
  if (status === 'online') return 'badge-green';
  if (status === 'degraded') return 'badge-blue';
  return 'badge-red';
}

function healthLabel(status: ServiceHealth): string {
  if (status === 'online') return 'متصل';
  if (status === 'degraded') return 'جزئي';
  return 'غير متاح';
}

export default function Settings() {
  const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3002').replace(/\/+$/, '');
  const shopifyRedirectUri = `${apiBaseUrl}/api/shopify/callback`;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [webhooking, setWebhooking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [serviceHealth, setServiceHealth] = useState<{
    supabase: ServiceHealth;
    backend: ServiceHealth;
    webhooks: ServiceHealth;
    webhookEvents: number;
  }>({
    supabase: 'offline',
    backend: 'offline',
    webhooks: 'offline',
    webhookEvents: 0,
  });

  const [showOAuth, setShowOAuth] = useState(false);
  const [oauthStep, setOauthStep] = useState<1 | 2>(1);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthForm, setOauthForm] = useState({ shop: '', api_key: '', api_secret: '' });
  const [oauthError, setOauthError] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const activeBrands = useMemo(
    () => brands.filter((brand) => brand.is_active !== false),
    [brands],
  );
  const inactiveBrands = useMemo(
    () => brands.filter((brand) => brand.is_active === false),
    [brands],
  );

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const legacyConnected = searchParams.get('connected');
    const brand = searchParams.get('brand');
    const msg = searchParams.get('msg');

    if (legacyConnected === 'true' || oauth === 'success') {
      setMessage({
        type: 'success',
        text: `تم ربط متجر "${brand || 'Shopify'}" بنجاح.`,
      });
      fetchBrands();
    } else if (oauth === 'declined') {
      setMessage({ type: 'error', text: 'تم إلغاء عملية الربط من Shopify.' });
    } else if (oauth === 'error') {
      setMessage({ type: 'error', text: `فشل الربط: ${msg || 'خطأ غير معروف'}` });
    } else if (oauth === 'invalid_state') {
      setMessage({ type: 'error', text: 'طلب OAuth غير صالح. حاول مرة أخرى.' });
    } else if (oauth === 'hmac_error') {
      setMessage({ type: 'error', text: 'فشل التحقق من Shopify. تأكد من API Secret.' });
    }

    if (oauth || legacyConnected) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);

    let nextBrands: Brand[] = [];
    let backendStatus: ServiceHealth = 'offline';
    let dbStatus: ServiceHealth = 'offline';

    try {
      const { data } = await api.get('/api/shopify/brands');
      nextBrands = data?.brands || [];
      backendStatus = 'online';
      dbStatus = 'online';
    } catch {
      backendStatus = 'offline';
      dbStatus = 'offline';
      nextBrands = [];
    }

    setBrands(nextBrands);

    const connectedCount = nextBrands.filter((brand) => brand.is_active !== false).length;
    if (connectedCount === 0) {
      setServiceHealth({
        supabase: dbStatus,
        backend: backendStatus,
        webhooks: 'offline',
        webhookEvents: 0,
      });
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/api/orders/webhooks/recent');
      const webhookEvents = Array.isArray(data?.events) ? data.events.length : 0;
      setServiceHealth({
        supabase: dbStatus,
        backend: backendStatus,
        webhooks: webhookEvents > 0 ? 'online' : 'degraded',
        webhookEvents,
      });
    } catch {
      setServiceHealth({
        supabase: dbStatus,
        backend: backendStatus,
        webhooks: backendStatus === 'online' ? 'degraded' : 'offline',
        webhookEvents: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (brandId: string) => {
    setSyncing(brandId);
    setMessage(null);
    try {
      const { data } = await api.post(`/api/inventory/sync-brand/${brandId}`);
      setMessage({ type: 'success', text: data?.message || 'تمت المزامنة بنجاح.' });
      await fetchBrands();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'فشلت المزامنة.' });
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (brandId: string) => {
    if (!confirm('هل تريد فصل هذا المتجر؟')) return;
    setDisconnecting(brandId);
    try {
      await api.post(`/api/shopify/disconnect/${brandId}`);
      setMessage({ type: 'info', text: 'تم فصل المتجر بنجاح.' });
      await fetchBrands();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'فشل فصل المتجر.' });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSetupWebhooks = async (brandId: string) => {
    setWebhooking(brandId);
    try {
      const { data } = await api.post(`/api/shopify/setup-webhooks/${brandId}`);
      setMessage({
        type: 'success',
        text: data?.message || 'تم إعداد Webhooks بنجاح.',
      });
      await fetchBrands();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.error || 'فشل إعداد Webhooks.' });
    } finally {
      setWebhooking(null);
    }
  };

  const handleOAuthConnect = async () => {
    setOauthError('');

    const normalizedShop = normalizeShopDomain(oauthForm.shop);
    if (!normalizedShop) return setOauthError('أدخل عنوان المتجر.');
    if (!oauthForm.api_key.trim()) return setOauthError('أدخل API Key.');
    if (!oauthForm.api_secret.trim()) return setOauthError('أدخل API Secret.');

    setOauthLoading(true);
    try {
      const { data } = await api.post('/api/shopify/get-install-url', {
        shop: normalizedShop,
        api_key: oauthForm.api_key.trim(),
        api_secret: oauthForm.api_secret.trim(),
      });

      window.location.href = data.installUrl;
    } catch (err: any) {
      setOauthError(err?.response?.data?.error || 'تعذر بدء الربط مع Shopify.');
      setOauthLoading(false);
    }
  };

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(shopifyRedirectUri);
      setMessage({ type: 'success', text: 'تم نسخ Redirect URI.' });
    } catch {
      setMessage({ type: 'info', text: shopifyRedirectUri });
    }
  };

  const openModal = () => {
    setOauthForm({ shop: '', api_key: '', api_secret: '' });
    setOauthError('');
    setOauthStep(1);
    setShowSecret(false);
    setShowOAuth(true);
  };

  const SkeletonCard = () => (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-12 h-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-40 rounded" />
        </div>
      </div>
      <div className="skeleton h-10 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-8 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-4 h-4 text-brand-500" />
            <span className="section-label">Settings</span>
          </div>
          <h1 className="page-title">الإعدادات والتكامل</h1>
          <p className="page-subtitle">ربط Shopify وإدارة حالة النظام من مكان واحد</p>
        </div>
        <button onClick={openModal} className="btn-shopify">
          <Plus className="w-4 h-4" />
          ربط متجر Shopify جديد
        </button>
      </div>

      {message && (
        <div
          className={`anim-bounce-in ${message.type === 'success'
            ? 'alert-success'
            : message.type === 'error'
              ? 'alert-error'
              : 'alert-info'
            }`}
        >
          {message.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {message.type === 'error' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          {message.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold flex-1">{message.text}</p>
          <button className="btn-icon p-1" onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-[11px] text-slate-400 font-bold mb-1">متاجر مرتبطة</p>
          <p className="text-2xl font-black text-slate-900">{activeBrands.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-slate-400 font-bold mb-1">متاجر غير مفعلة</p>
          <p className="text-2xl font-black text-slate-900">{inactiveBrands.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-slate-400 font-bold mb-1">Webhook Events (آخر 10)</p>
          <p className="text-2xl font-black text-slate-900">{serviceHealth.webhookEvents}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-shopify-500" />
            <h2 className="text-base font-black text-slate-800">متاجر Shopify</h2>
            {activeBrands.length > 0 && <span className="badge badge-shopify">{activeBrands.length}</span>}
          </div>

          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : activeBrands.length === 0 ? (
            <div className="card p-12 flex flex-col items-center text-center border-dashed">
              <div className="w-16 h-16 bg-shopify-50 border border-shopify-200 rounded-2xl flex items-center justify-center mb-4">
                <Store className="w-8 h-8 text-shopify-500" />
              </div>
              <h3 className="text-base font-black text-slate-700 mb-2">لا توجد متاجر مرتبطة</h3>
              <p className="text-sm text-slate-400 mb-5 max-w-xs">
                ابدأ بربط متجرك الآن وسيتم تفعيل المزامنة والتحديثات الفورية.
              </p>
              <button onClick={openModal} className="btn-shopify">
                <Plus className="w-4 h-4" />
                ربط متجر الآن
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBrands.map((brand) => (
                <div key={brand.id} className="card p-5">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-shopify-50 border border-shopify-200">
                        <Store className="w-6 h-6 text-shopify-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-800 capitalize leading-none">
                            {brand.name.replace(/_/g, ' ')}
                          </h3>
                          <span className="badge badge-green">
                            <Wifi className="w-2.5 h-2.5" />
                            متصل
                          </span>
                        </div>
                        <a
                          href={`https://${brand.shopify_domain}/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-1 mt-1"
                        >
                          <Globe className="w-3 h-3" />
                          {brand.shopify_domain}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">آخر مزامنة</p>
                      <p className="text-xs font-bold text-slate-700">
                        {brand.last_sync_at ? new Date(brand.last_sync_at).toLocaleString('ar-EG') : 'لم تتم بعد'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">تاريخ الربط</p>
                      <p className="text-xs font-bold text-slate-700">
                        {brand.connected_at ? new Date(brand.connected_at).toLocaleDateString('ar-EG') : '—'}
                      </p>
                    </div>
                    {brand.shopify_scopes && (
                      <div className="col-span-2 bg-shopify-50 border border-shopify-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-shopify-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          الصلاحيات
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {brand.shopify_scopes
                            .split(',')
                            .slice(0, 6)
                            .map((scope) => (
                              <span key={scope} className="badge badge-shopify text-[9px]">
                                {scope.trim()}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(brand.id)}
                      disabled={syncing === brand.id}
                      className="btn-success flex-1 justify-center disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing === brand.id ? 'animate-spin' : ''}`} />
                      {syncing === brand.id ? 'جاري المزامنة...' : 'مزامنة المنتجات'}
                    </button>
                    <button
                      onClick={() => handleSetupWebhooks(brand.id)}
                      disabled={webhooking === brand.id}
                      className="btn-secondary disabled:opacity-50"
                      title="إعداد Webhooks"
                    >
                      {webhooking === brand.id ? (
                        <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnect(brand.id)}
                      disabled={disconnecting === brand.id}
                      className="btn-danger"
                      title="فصل المتجر"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {inactiveBrands.length > 0 && (
                <div>
                  <p className="section-label mb-2">متاجر غير مفعلة</p>
                  {inactiveBrands.map((brand) => (
                    <div key={brand.id} className="card-flat p-4 flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Store className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-600">{brand.name}</p>
                          <span className="badge badge-red">
                            <WifiOff className="w-2.5 h-2.5" />
                            غير متصل
                          </span>
                        </div>
                      </div>
                      <button onClick={openModal} className="btn-secondary text-xs">
                        إعادة الربط
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-brand-500" />
              <h2 className="text-base font-black text-slate-800">حالة النظام</h2>
            </div>
            <div className="card divide-y divide-slate-50 overflow-hidden">
              {[
                {
                  icon: Database,
                  bg: 'bg-brand-50',
                  color: 'text-brand-600',
                  title: 'Supabase',
                  sub: 'Database health',
                  status: serviceHealth.supabase,
                },
                {
                  icon: Server,
                  bg: 'bg-cyan-50',
                  color: 'text-cyan-600',
                  title: 'Backend API',
                  sub: 'HTTP connection',
                  status: serviceHealth.backend,
                },
                {
                  icon: Activity,
                  bg: 'bg-violet-50',
                  color: 'text-violet-600',
                  title: 'Webhooks',
                  sub: `${serviceHealth.webhookEvents} event(s)`,
                  status: serviceHealth.webhooks,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-none">{item.title}</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                  <span className={`badge ${healthBadgeClass(item.status)}`}>{healthLabel(item.status)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-shopify-500" />
              <h2 className="text-base font-black text-slate-800">رابط Redirect URI</h2>
            </div>
            <div className="card p-4 space-y-3">
              <p className="text-xs text-slate-500">
                أضف الرابط التالي في Shopify App داخل <span className="font-bold">Allowed redirection URLs</span>.
              </p>
              <div className="bg-slate-900 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <code className="text-[11px] text-emerald-300 font-mono break-all flex-1">
                  {shopifyRedirectUri}
                </code>
                <button onClick={copyRedirectUri} className="btn-icon text-slate-200 hover:bg-slate-700">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800">الأمان</h3>
            </div>
            <div className="space-y-2 text-xs text-slate-500 font-medium">
              {[
                'الربط يتم عبر Shopify OAuth الرسمي.',
                'يتم التحقق من HMAC في Webhooks.',
                'يمكن فصل المتجر وإعادة الربط في أي وقت.',
              ].map((txt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{txt}</span>
                </div>
              ))}
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
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${oauthStep === s
                      ? 'bg-brand-500 text-white shadow-brand'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                  >
                    {s === 1 ? '1) المتجر' : '2) بيانات التطبيق'}
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
                  <div className="alert-info">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-semibold">أدخل Shop Domain للمتجر</p>
                  </div>
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
                        onKeyDown={(e) => e.key === 'Enter' && setOauthStep(2)}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!oauthForm.shop.trim()) return setOauthError('أدخل عنوان المتجر.');
                      setOauthError('');
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
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                    <p className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      Shopify App Credentials
                    </p>
                    <a
                      href="https://partners.shopify.com/organizations"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-amber-700 underline flex items-center gap-1"
                    >
                      partners.shopify.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-[11px] text-amber-600">Apps → اختر التطبيق → Client credentials</p>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-3">
                    <p className="text-[10px] text-slate-300 mb-1">Redirect URI (ضعه في Shopify)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] text-emerald-300 font-mono break-all flex-1">
                        {shopifyRedirectUri}
                      </code>
                      <button onClick={copyRedirectUri} className="btn-icon text-slate-200 hover:bg-slate-700">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

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
                        type={showSecret ? 'text' : 'password'}
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

              <p className="text-center text-[11px] text-slate-400">بالمتابعة أنت توافق على شروط Shopify API</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

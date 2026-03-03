import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import {
  Package, BarChart3, AlertTriangle, Activity, ShoppingBag,
  Clock, ChevronRight, Sparkles,
  ArrowRight, RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalVariants: 0, totalStock: 0, lowStock: 0, recentWebhooks: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [invRes, wRes] = await Promise.all([
        api.get('/api/inventory?limit=1000'),
        api.get('/api/orders/webhooks/recent').catch(() => ({ data: { events: [] } })),
      ]);
      const inv = invRes.data.data || [];
      setStats({
        totalVariants: inv.length,
        totalStock: inv.reduce((s: number, i: any) => s + (i.inventory_levels?.available || 0), 0),
        lowStock: inv.filter((i: any) => (i.inventory_levels?.available || 0) < 10).length,
        recentWebhooks: wRes.data.events?.slice(0, 8) || [],
      });
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const CARDS = [
    {
      title: 'إجمالي المنتجات',
      val: stats.totalVariants,
      sub: 'متغير مسجل في النظام',
      icon: Package,
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-600',
      accent: '#6366f1',
    },
    {
      title: 'إجمالي المخزون',
      val: stats.totalStock,
      sub: 'وحدة متاحة حالياً',
      icon: BarChart3,
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      accent: '#06b6d4',
    },
    {
      title: 'مخزون منخفض',
      val: stats.lowStock,
      sub: 'منتجات أقل من 10 وحدات',
      icon: AlertTriangle,
      iconBg: stats.lowStock > 0 ? 'bg-red-50' : 'bg-emerald-50',
      iconColor: stats.lowStock > 0 ? 'text-red-500' : 'text-emerald-600',
      accent: stats.lowStock > 0 ? '#ef4444' : '#10b981',
    },
    {
      title: 'أحداث Shopify',
      val: stats.recentWebhooks.length,
      sub: 'webhook في الجلسة الحالية',
      icon: Activity,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      accent: '#8b5cf6',
    },
  ];

  const topicLabel = (t: string) => ({
    'orders/create': 'طلب جديد',
    'orders/paid': 'طلب مدفوع',
    'orders/cancelled': 'طلب ملغي',
    'inventory_levels/update': 'تحديث مخزون',
    'products/update': 'تحديث منتج',
    'refunds/create': 'استرداد',
  }[t] || t);


  if (loading) return (
    <div className="space-y-6 anim-fade-in">
      <div className="flex gap-4">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="skeleton h-8 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="section-label">Dashboard</span>
          </div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">نظرة عامة على المخزون والنشاط التجاري</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load(true)}
            className="btn-secondary text-xs"
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <Link to="/reports" className="btn-primary text-xs">
            <Activity className="w-3.5 h-3.5" />رفع تقرير
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c, i) => (
          <div key={i} className={`stat-card delay-${i + 1} anim-fade-up`}>
            {/* top accent line */}
            <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl" style={{ background: c.accent }} />
            <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.iconColor}`} />
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none mb-1">
              {c.val.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-slate-500">{c.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhooks list */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">تحديثات Shopify الأخيرة</h2>
                <p className="text-[11px] text-slate-400 font-medium">Webhook events في الوقت الفعلي</p>
              </div>
            </div>
            <Link to="/settings" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
              الإعدادات <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recentWebhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">لا توجد تحديثات حتى الآن</p>
              <p className="text-xs text-slate-300 mt-1">ستظهر أحداث Shopify هنا تلقائياً</p>
            </div>
          ) : (
            <div>
              {stats.recentWebhooks.map((ev, i) => (
                <div
                  key={ev.id}
                  className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-25 transition-colors ${i < stats.recentWebhooks.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{topicLabel(ev.topic)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(ev.created_at).toLocaleString('ar-EG')}
                        </span>
                        {ev.brands?.name && (
                          <span className={`badge badge-indigo`}>{ev.brands.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-green">✓ تمت</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Quick Links */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-black text-slate-800">الوصول السريع</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'إدارة المخزون', sub: `${stats.totalVariants} منتج`, to: '/inventory', icon: Package, color: 'text-brand-600', bg: 'bg-brand-50' },
                { label: 'الأوردات', sub: 'عرض الطلبات', to: '/orders', icon: ShoppingBag, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'رفع تقرير يومي', sub: 'إرسال تقريرك اليوم', to: '/reports', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((item, i) => (
                <Link
                  key={i}
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
                >
                  <div className={`w-8 h-8 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900">{item.label}</p>
                    <p className="text-[10px] text-slate-400">{item.sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Stock health */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />صحة المخزون
              </h3>
              <Link to="/inventory" className="text-[11px] font-bold text-brand-600 hover:text-brand-700">
                عرض الكل ←
              </Link>
            </div>

            {/* Progress bar */}
            {stats.totalVariants > 0 && (() => {
              const goodPct = Math.round(((stats.totalVariants - stats.lowStock) / stats.totalVariants) * 100);
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">المخزون الجيد</span>
                    <span className="text-emerald-600">{goodPct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${goodPct}%`, background: goodPct > 70 ? '#10b981' : goodPct > 40 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'متوفر', val: stats.totalVariants - stats.lowStock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'منخفض', val: stats.lowStock, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'مجموع', val: stats.totalVariants, color: 'text-brand-600', bg: 'bg-brand-50' },
                    ].map((row, i) => (
                      <div key={i} className={`${row.bg} rounded-xl p-2 text-center`}>
                        <p className={`text-base font-black ${row.color}`}>{row.val}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{row.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {stats.totalVariants === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد بيانات بعد</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

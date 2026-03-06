import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Activity, AlertTriangle, BarChart3, Package, RefreshCw, Sparkles, Users } from "lucide-react";

interface OverviewStats {
  products_total: number;
  orders_total: number;
  customers_total: number;
  reports_total: number;
  members_total: number;
  low_stock_total: number;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewStats>({
    products_total: 0,
    orders_total: 0,
    customers_total: 0,
    reports_total: 0,
    members_total: 0,
    low_stock_total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get("/api/app/dashboard/overview");
      setOverview({
        products_total: Number(data?.overview?.products_total || 0),
        orders_total: Number(data?.overview?.orders_total || 0),
        customers_total: Number(data?.overview?.customers_total || 0),
        reports_total: Number(data?.overview?.reports_total || 0),
        members_total: Number(data?.overview?.members_total || 0),
        low_stock_total: Number(data?.overview?.low_stock_total || 0),
      });
    } catch {
      // silent on dashboard
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cards = [
    {
      title: "المنتجات",
      value: overview.products_total,
      sub: "إجمالي المنتجات",
      icon: Package,
      iconClass: "text-brand-600 bg-brand-50",
    },
    {
      title: "الأوردرات",
      value: overview.orders_total,
      sub: "إجمالي الطلبات",
      icon: BarChart3,
      iconClass: "text-cyan-600 bg-cyan-50",
    },
    {
      title: "العملاء",
      value: overview.customers_total,
      sub: "إجمالي العملاء",
      icon: Users,
      iconClass: "text-violet-600 bg-violet-50",
    },
    {
      title: "مخزون منخفض",
      value: overview.low_stock_total,
      sub: "أقل من 5 وحدات",
      icon: AlertTriangle,
      iconClass: overview.low_stock_total > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50",
    },
  ];

  const isEmptyStore =
    overview.products_total === 0 &&
    overview.orders_total === 0 &&
    overview.customers_total === 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-56 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="section-label">Dashboard</span>
          </div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">إحصائيات المتجر المعزولة لهذا الحساب فقط</p>
        </div>
        <button onClick={() => load(true)} className="btn-secondary text-xs" disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.iconClass}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none mb-1">{card.value.toLocaleString()}</p>
            <p className="text-xs font-semibold text-slate-600">{card.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {isEmptyStore && (
        <div className="card p-6 border-dashed border-brand-200 bg-brand-50/40">
          <p className="text-sm font-black text-slate-800 mb-1">ابدأ تجهيز متجرك</p>
          <p className="text-xs text-slate-600 mb-4">
            الحساب جديد ولسه بدون بيانات. اربط Shopify ثم شغّل المزامنة الكاملة.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/settings" className="btn-shopify text-xs">
              ربط Shopify
            </Link>
            <button onClick={() => load(true)} className="btn-secondary text-xs">
              تحديث بعد الربط
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/inventory" className="card p-4 hover:border-brand-200 transition-colors">
          <p className="text-sm font-black text-slate-800 mb-1">إدارة المخزون</p>
          <p className="text-xs text-slate-500">تعديل الكميات ومتابعة الحركات</p>
        </Link>
        <Link to="/orders" className="card p-4 hover:border-brand-200 transition-colors">
          <p className="text-sm font-black text-slate-800 mb-1">الأوردرات</p>
          <p className="text-xs text-slate-500">عرض الطلبات وحالة الدفع والشحن</p>
        </Link>
        <Link to="/reports" className="card p-4 hover:border-brand-200 transition-colors">
          <p className="text-sm font-black text-slate-800 mb-1">التقارير</p>
          <p className="text-xs text-slate-500">متابعة التقارير اليومية والمرفقات</p>
        </Link>
      </div>

      <div className="card p-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-brand-500" />
        <span className="text-sm font-semibold text-slate-600">
          أعضاء المتجر: <span className="font-black text-slate-800">{overview.members_total}</span>
        </span>
      </div>
    </div>
  );
}

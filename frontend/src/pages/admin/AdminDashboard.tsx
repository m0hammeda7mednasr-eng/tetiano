import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  DollarSign,
  FileText,
  Package,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import api from "../../lib/api";

interface Overview {
  products_total: number;
  orders_total: number;
  customers_total: number;
  reports_total: number;
  members_total: number;
  members_active_total: number;
  members_inactive_total: number;
  low_stock_total: number;
  latest_net_profit: number | null;
  total_net_profit: number | null;
  latest_net_profit_order_name: string | null;
  latest_net_profit_order_number: number | null;
  latest_net_profit_currency: string | null;
  latest_net_profit_at: string | null;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function formatMoney(value: number | null, currency?: string | null): string {
  if (value === null) return "—";
  const resolvedCurrency = (currency || "USD").toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${resolvedCurrency}`;
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/api/app/dashboard/overview");
        const source = data?.overview || {};
        setOverview({
          products_total: toNumber(source.products_total),
          orders_total: toNumber(source.orders_total),
          customers_total: toNumber(source.customers_total),
          reports_total: toNumber(source.reports_total),
          members_total: toNumber(source.members_total),
          members_active_total: toNumber(source.members_active_total),
          members_inactive_total: toNumber(source.members_inactive_total),
          low_stock_total: toNumber(source.low_stock_total),
          latest_net_profit: toNullableNumber(source.latest_net_profit),
          total_net_profit: toNullableNumber(source.total_net_profit),
          latest_net_profit_order_name: source.latest_net_profit_order_name
            ? String(source.latest_net_profit_order_name)
            : null,
          latest_net_profit_order_number: toNullableNumber(source.latest_net_profit_order_number),
          latest_net_profit_currency: source.latest_net_profit_currency
            ? String(source.latest_net_profit_currency)
            : null,
          latest_net_profit_at: source.latest_net_profit_at ? String(source.latest_net_profit_at) : null,
        });
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to load dashboard overview.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <AlertTriangle className="w-4 h-4" />
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  const latestProfitValue = formatMoney(
    overview?.latest_net_profit ?? null,
    overview?.latest_net_profit_currency,
  );
  const totalProfitValue = formatMoney(
    overview?.total_net_profit ?? null,
    overview?.latest_net_profit_currency,
  );
  const latestOrderLabel = overview?.latest_net_profit_order_name
    ? overview.latest_net_profit_order_name
    : overview?.latest_net_profit_order_number
      ? `Order #${overview.latest_net_profit_order_number}`
      : "No recent order";

  return (
    <div className="space-y-6 anim-fade-up">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-brand-500" />
          <span className="section-label">Store Admin</span>
        </div>
        <h1 className="page-title">Store Administration</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="stat-card">
          <Package className="w-5 h-5 text-brand-600 mb-2" />
          <p className="text-2xl font-black">{overview?.products_total ?? 0}</p>
          <p className="text-xs text-slate-500">Products</p>
        </div>
        <div className="stat-card">
          <ShoppingCart className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-black">{overview?.orders_total ?? 0}</p>
          <p className="text-xs text-slate-500">Orders</p>
        </div>
        <div className="stat-card">
          <Users className="w-5 h-5 text-cyan-600 mb-2" />
          <p className="text-2xl font-black">{overview?.members_total ?? 0}</p>
          <p className="text-xs text-slate-500">Store Members</p>
        </div>
        <div className="stat-card">
          <FileText className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-black">{overview?.reports_total ?? 0}</p>
          <p className="text-xs text-slate-500">Reports</p>
        </div>
        <div className="stat-card">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-xl font-black leading-tight">{latestProfitValue}</p>
          <p className="text-xs text-slate-500">Latest Net Profit</p>
        </div>
        <div className="stat-card">
          <DollarSign className="w-5 h-5 text-brand-600 mb-2" />
          <p className="text-xl font-black leading-tight">{totalProfitValue}</p>
          <p className="text-xs text-slate-500">Total Net Profit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-400 font-semibold mb-3">Latest Net Profit Details</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Order</span>
              <span className="text-sm font-bold text-slate-800 text-right">{latestOrderLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Profit</span>
              <span className="text-sm font-bold text-emerald-700">{latestProfitValue}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Date</span>
              <span className="text-xs font-semibold text-slate-600">
                {formatDateTime(overview?.latest_net_profit_at ?? null)}
              </span>
            </div>
          </div>
          {overview?.latest_net_profit === null && (
            <p className="text-[11px] text-slate-400 mt-3">
              Net profit data is unavailable or you do not have finance permission.
            </p>
          )}
        </div>

        <div className="card p-4">
          <p className="text-xs text-slate-400 font-semibold mb-3">Store Members Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Total</p>
              <p className="text-lg font-black text-slate-800">{overview?.members_total ?? 0}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <p className="text-[11px] text-emerald-700">Active</p>
              </div>
              <p className="text-lg font-black text-emerald-700">{overview?.members_active_total ?? 0}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <UserX className="w-3.5 h-3.5 text-red-500" />
                <p className="text-[11px] text-red-600">Inactive</p>
              </div>
              <p className="text-lg font-black text-red-600">{overview?.members_inactive_total ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-2">
        <Link to="/admin/users" className="btn-primary text-xs">
          Manage Users
        </Link>
        <Link to="/settings" className="btn-secondary text-xs">
          Shopify Settings
        </Link>
      </div>
    </div>
  );
}

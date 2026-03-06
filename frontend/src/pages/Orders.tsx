import { useEffect, useState } from "react";
import api from "../lib/api";
import { AlertCircle, Clock, RefreshCw, ShoppingBag, Truck } from "lucide-react";

interface AppOrder {
  id: string;
  order_name?: string | null;
  order_number?: number | null;
  created_at_shopify?: string | null;
  total_price?: string | number | null;
  current_total_price?: string | number | null;
  currency?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  email?: string | null;
}

function badgeClass(status: string | null | undefined): string {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("paid") || normalized.includes("fulfilled")) return "badge-green";
  if (normalized.includes("pending") || normalized.includes("unfulfilled")) return "badge-yellow";
  if (normalized.includes("cancel")) return "badge-red";
  return "badge-gray";
}

export default function Orders() {
  const [orders, setOrders] = useState<AppOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/api/app/orders", { params: { limit: 50 } });
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "فشل تحميل الأوردرات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalSales = orders.reduce((sum, order) => {
    const amount = Number(order.current_total_price || order.total_price || 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-brand-500" />
            <span className="section-label">Orders</span>
          </div>
          <h1 className="page-title">الأوردرات</h1>
          <p className="page-subtitle">طلبات المتجر الحالية داخل نطاق المتجر فقط</p>
        </div>
        <button onClick={() => fetchOrders(true)} className="btn-secondary text-xs" disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="section-label mb-1">عدد الأوردرات</p>
          <p className="text-2xl font-black text-slate-900">{orders.length}</p>
        </div>
        <div className="card p-4">
          <p className="section-label mb-1">إجمالي المبيعات</p>
          <p className="text-2xl font-black text-slate-900">{totalSales.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="section-label mb-1">مدفوع</p>
          <p className="text-2xl font-black text-emerald-600">
            {orders.filter((order) => String(order.financial_status || "").toLowerCase().includes("paid")).length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="card h-24 skeleton" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center py-16">
          <ShoppingBag className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-400">لا توجد أوردرات حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">{order.order_name || `Order #${order.order_number || order.id}`}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      {order.created_at_shopify
                        ? new Date(order.created_at_shopify).toLocaleString("ar-EG")
                        : "—"}
                    </span>
                    {order.email && <span>• {order.email}</span>}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-black text-slate-900">
                    {Number(order.current_total_price || order.total_price || 0).toLocaleString()}
                    <span className="text-xs text-slate-400 mr-1">{order.currency || ""}</span>
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`badge ${badgeClass(order.financial_status)}`}>{order.financial_status || "—"}</span>
                    <span className={`badge ${badgeClass(order.fulfillment_status)}`}>
                      <Truck className="w-3 h-3" />
                      {order.fulfillment_status || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


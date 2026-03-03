import { useState, useEffect } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import {
  ShoppingBag, User, Calendar, CreditCard, Truck,
  RefreshCw, Clock, Package, AlertCircle, ChevronDown
} from 'lucide-react';

interface Order {
  id: string;
  name: string;
  createdAt: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  customer?: { firstName: string; lastName: string };
  lineItems: { edges: { node: { title: string; quantity: number; sku: string } }[] };
}

const finBadge = (s: string) => {
  const m: Record<string, string> = { PAID: 'badge-green', PENDING: 'badge-yellow', PARTIALLY_PAID: 'badge-blue', REFUNDED: 'badge-red' };
  return { cls: m[s] || 'badge-gray', label: ({ PAID: 'تم الدفع', PENDING: 'معلق', PARTIALLY_PAID: 'جزئي', REFUNDED: 'مسترد' } as any)[s] || s };
};
const fulBadge = (s: string) => {
  const m: Record<string, string> = { FULFILLED: 'badge-green', UNFULFILLED: 'badge-red', PARTIAL: 'badge-blue' };
  return { cls: m[s] || 'badge-gray', label: ({ FULFILLED: 'تم الشحن', UNFULFILLED: 'لم يُشحن', PARTIAL: 'شحن جزئي' } as any)[s] || s };
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [expandedId, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('brands').select('id, name').eq('is_active', true)
      .then(({ data }) => {
        setBrands(data || []);
        if (data?.[0]) setBrandId(data[0].id);
      });
  }, []);

  useEffect(() => { if (brandId) fetchOrders(); }, [brandId]);

  const fetchOrders = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await api.get(`/api/orders/${brandId}`, { params: { limit: 25 } });
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل جلب الأوردات');
    } finally { setLoading(false); }
  };

  const total = orders.reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-brand-500" />
            <span className="section-label">Orders</span>
          </div>
          <h1 className="page-title">الأوردات</h1>
          <p className="page-subtitle">آخر الطلبات من Shopify في الوقت الفعلي</p>
        </div>
        <div className="flex items-center gap-2">
          {brands.length > 1 && (
            <div className="relative">
              <select
                value={brandId || ''}
                onChange={e => setBrandId(e.target.value)}
                className="input text-xs font-bold pl-8 appearance-none cursor-pointer"
                style={{ width: 160 }}
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
          <button onClick={fetchOrders} disabled={loading} className="btn-secondary text-xs disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'جاري التحميل...' : 'تحديث'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="section-label mb-1">إجمالي الطلبات</p>
            <p className="text-2xl font-black text-slate-900">{orders.length}</p>
          </div>
          <div className="card p-4">
            <p className="section-label mb-1">إجمالي المبيعات</p>
            <p className="text-2xl font-black text-slate-900">
              {total.toLocaleString()}
              <span className="text-sm font-bold text-slate-400 mr-1">{orders[0]?.totalPriceSet.shopMoney.currencyCode}</span>
            </p>
          </div>
          <div className="card p-4 sm:flex hidden">
            <div>
              <p className="section-label mb-1">الطلبات المدفوعة</p>
              <p className="text-2xl font-black text-emerald-600">
                {orders.filter(o => o.displayFinancialStatus === 'PAID').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-28 skeleton" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center py-20">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400">لا توجد أوردات</p>
          <p className="text-xs text-slate-300 mt-1">تأكد من ربط Shopify في الإعدادات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const fin = finBadge(order.displayFinancialStatus);
            const ful = fulBadge(order.displayFulfillmentStatus);
            const amount = parseFloat(order.totalPriceSet.shopMoney.amount);
            const isOpen = expandedId === order.id;

            return (
              <div key={order.id} className="card overflow-hidden">
                {/* Main row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 cursor-pointer hover:bg-slate-25 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Order # badge */}
                    <div className="w-11 h-11 rounded-xl grad-brand flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-brand">
                      #{order.name.replace(/[^0-9]/g, '').slice(-3)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-black text-slate-800">{order.name}</span>
                        <span className={`badge ${fin.cls}`}>{fin.label}</span>
                        <span className={`badge ${ful.cls}`}>
                          <Truck className="w-2.5 h-2.5" />{ful.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />{new Date(order.createdAt).toLocaleString('ar-EG')}
                        </span>
                        {order.customer && (
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <User className="w-3 h-3" />{order.customer.firstName} {order.customer.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 font-bold mb-0.5">المبلغ الإجمالي</p>
                    <p className="text-xl font-black text-slate-900">
                      {amount.toLocaleString()}
                      <span className="text-xs font-bold text-slate-400 mr-1">
                        {order.totalPriceSet.shopMoney.currencyCode}
                      </span>
                    </p>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded: line items */}
                {isOpen && order.lineItems.edges.length > 0 && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1">
                      <Package className="w-3 h-3" />المنتجات ({order.lineItems.edges.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {order.lineItems.edges.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                        >
                          <Package className="w-3 h-3 text-brand-400" />
                          <span className="text-[11px] font-bold text-slate-700">{item.node.title}</span>
                          <span className="badge badge-indigo text-[9px]">×{item.node.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

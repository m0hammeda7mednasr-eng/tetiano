import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import {
  Search, Plus, History, Package, Tag,
  ShoppingBag, RefreshCw, X
} from 'lucide-react';
import StockAdjustModal from '../components/StockAdjustModal';
import StockLedgerModal from '../components/StockLedgerModal';

interface Variant {
  id: string;
  title: string;
  sku: string;
  price: number;
  shopify_variant_id?: string;
  products: { title: string };
  brands: { name: string };
  inventory_levels: { available: number };
}

const brandBadge: Record<string, string> = {
  tetiano: 'badge-indigo',
  '98': 'badge-blue',
};
const getBadge = (name: string) => brandBadge[name?.toLowerCase()] || 'badge-gray';

const stockStatus = (n: number) => {
  if (n <= 0) return { cls: 'badge-red', label: 'نفذ', dot: 'bg-red-400' };
  if (n < 10) return { cls: 'badge-yellow', label: 'منخفض', dot: 'bg-amber-400' };
  return { cls: 'badge-green', label: 'متوفر', dot: 'bg-emerald-400' };
};

export default function Inventory() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Variant | null>(null);
  const [showAdjust, setAdjust] = useState(false);
  const [showLedger, setLedger] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/app/products', { params: { search, limit: 150 } });
      setVariants(data.products || data.data || []);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchInventory, 400);
    return () => clearTimeout(t);
  }, [fetchInventory]);

  const openAdjust = (v: Variant) => { setSelected(v); setAdjust(true); };
  const openLedger = (v: Variant) => { setSelected(v); setLedger(true); };

  const SkeletonRow = () => (
    <tr>{[60, 30, 35, 25, 20, 35, 25].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="skeleton h-3.5 rounded" style={{ width: `${w}%` }} />
      </td>
    ))}</tr>
  );

  const outCnt = variants.filter(v => (v.inventory_levels?.available || 0) <= 0).length;
  const lowCnt = variants.filter(v => { const a = v.inventory_levels?.available || 0; return a > 0 && a < 10; }).length;
  const okCnt = variants.filter(v => (v.inventory_levels?.available || 0) >= 10).length;

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-brand-500" />
            <span className="section-label">Inventory</span>
          </div>
          <h1 className="page-title">المخزون</h1>
          <p className="page-subtitle">إدارة وتتبع جميع المنتجات والكميات</p>
        </div>
        <button onClick={fetchInventory} className="btn-secondary text-xs">
          <RefreshCw className="w-3.5 h-3.5" />تحديث
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-2 card-flat rounded-xl text-xs font-bold text-slate-600">
          <Package className="w-3.5 h-3.5 text-brand-500" />{variants.length} منتج
        </div>
        <div className="flex items-center gap-2 px-3 py-2 card-flat rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-100" style={{ border: '1px solid' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />{okCnt} متوفر
        </div>
        <div className="flex items-center gap-2 px-3 py-2 card-flat rounded-xl text-xs font-bold text-amber-700 bg-amber-50" style={{ border: '1px solid #fde68a' }}>
          <span className="w-2 h-2 rounded-full bg-amber-400" />{lowCnt} منخفض
        </div>
        <div className="flex items-center gap-2 px-3 py-2 card-flat rounded-xl text-xs font-bold text-red-700 bg-red-50" style={{ border: '1px solid #fecaca' }}>
          <span className="w-2 h-2 rounded-full bg-red-400" />{outCnt} نفذ
        </div>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pr-9 text-sm"
              placeholder="بحث برقم SKU أو اسم المنتج..."
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scroll-thin">
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الماركة</th>
                <th>SKU</th>
                <th>السعر</th>
                <th style={{ textAlign: 'center' }}>الكمية</th>
                <th style={{ textAlign: 'center' }}>الحالة</th>
                <th style={{ textAlign: 'left' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                : variants.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div className="flex flex-col items-center">
                          <div className="w-14 h-14 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex items-center justify-center mb-3">
                            <Package className="w-7 h-7 text-slate-300" />
                          </div>
                          <p className="text-sm font-bold text-slate-400">
                            {search ? `لا نتائج لـ "${search}"` : 'لا توجد منتجات بعد'}
                          </p>
                          <p className="text-xs text-slate-300 mt-1">
                            {search ? 'جرب كلمة مختلفة' : 'قم بمزامنة Shopify من صفحة الإعدادات'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : variants.map((v) => {
                    const avail = v.inventory_levels?.available || 0;
                    const st = stockStatus(avail);
                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-brand-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate max-w-[160px] flex items-center gap-1">
                                {v.products?.title}
                                {v.shopify_variant_id && <ShoppingBag className="w-3 h-3 text-slate-300 flex-shrink-0" />}
                              </p>
                              {v.title && v.title !== 'Default Title' && (
                                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]">{v.title}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getBadge(v.brands?.name)} uppercase`}>
                            {v.brands?.name}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-slate-500">
                            <Tag className="w-3 h-3 text-slate-300" />
                            <span className="text-xs font-mono">{v.sku || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm font-bold text-slate-700">
                            {v.price ? v.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="text-lg font-black"
                            style={{ color: avail <= 0 ? '#ef4444' : avail < 10 ? '#f59e0b' : '#0f172a' }}
                          >
                            {avail}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openLedger(v)}
                              className="btn-icon"
                              title="سجل الحركات"
                            ><History className="w-4 h-4" /></button>
                            <button
                              onClick={() => openAdjust(v)}
                              className="btn-icon"
                              title="تعديل المخزون"
                            ><Plus className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && variants.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-medium">
              يُعرض {variants.length} منتج{search && ` لـ "${search}"`}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              إجمالي المخزون:{' '}
              <span className="font-bold text-slate-700">
                {variants.reduce((s, v) => s + (v.inventory_levels?.available || 0), 0).toLocaleString()}
              </span> وحدة
            </p>
          </div>
        )}
      </div>

      {showAdjust && selected && (
        <StockAdjustModal variant={selected} onClose={() => setAdjust(false)} onSuccess={() => { setAdjust(false); fetchInventory(); }} />
      )}
      {showLedger && selected && (
        <StockLedgerModal variant={selected} onClose={() => setLedger(false)} />
      )}
    </div>
  );
}

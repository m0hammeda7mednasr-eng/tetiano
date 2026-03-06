import { useEffect, useState } from 'react';
import api from '../lib/api';
import { X, History, User, ArrowRight, Package, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Movement {
  id: string;
  delta: number;
  previous_quantity: number;
  new_quantity: number;
  source: string;
  reason: string;
  created_at: string;
  user_profiles: { full_name: string };
}

const srcStyle = (s: string) => ({
  manual: { cls: 'badge-indigo', label: 'يدوي' },
  webhook: { cls: 'badge-green', label: 'Shopify' },
  order: { cls: 'badge-purple', label: 'طلب' },
  refund: { cls: 'badge-yellow', label: 'مرتجع' },
  sync: { cls: 'badge-blue', label: 'مزامنة' },
  adjustment: { cls: 'badge-gray', label: 'تعديل' },
} as any)[s] || { cls: 'badge-gray', label: s };

interface Props { variant: any; onClose: () => void; }

export default function StockLedgerModal({ variant, onClose }: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/app/variants/${variant.id}/movements`)
      .then(({ data }) => setMovements(data.movements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto scroll-thin" dir="rtl">
      <div className="fixed inset-0 modal-overlay" onClick={onClose} />
      <div className="modal-box w-full max-w-3xl anim-scale-in my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center">
              <History className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-none">سجل حركات المخزون</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Audit Trail كامل</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        {/* Product info */}
        <div className="mx-5 mt-4 mb-3 flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">{variant.products?.title}</p>
              {variant.title !== 'Default Title' && (
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{variant.title || variant.sku}</p>
              )}
            </div>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 mb-0.5">المخزون الحالي</p>
            <p className="text-2xl font-black text-slate-900">{variant.inventory_levels?.available || 0}</p>
          </div>
        </div>

        {/* Table */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center py-14 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Info className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-400">لا توجد حركات مسجلة</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-y-auto scroll-thin" style={{ maxHeight: '50vh' }}>
                <table className="data-table">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th>التاريخ</th>
                      <th>المصدر</th>
                      <th style={{ textAlign: 'center' }}>التعديل</th>
                      <th style={{ textAlign: 'center' }}>قبل ← بعد</th>
                      <th>السبب</th>
                      <th>بواسطة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => {
                      const src = srcStyle(m.source);
                      return (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-800">
                              {format(new Date(m.created_at), 'd MMM', { locale: ar })}
                            </p>
                            <p className="text-[10px] text-slate-400">{format(new Date(m.created_at), 'HH:mm')}</p>
                          </td>
                          <td>
                            <span className={`badge ${src.cls}`}>{src.label}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="flex items-center justify-center gap-0.5 text-sm font-black"
                              style={{ color: m.delta > 0 ? '#10b981' : '#ef4444' }}
                            >
                              {m.delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              {m.delta > 0 ? '+' : ''}{m.delta}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-500">
                              <span>{m.previous_quantity}</span>
                              <ArrowRight className="w-3 h-3 text-slate-300" />
                              <span className="font-black text-slate-800">{m.new_quantity}</span>
                            </div>
                          </td>
                          <td>
                            <p className="text-xs font-medium text-slate-500 max-w-[120px] truncate" title={m.reason}>
                              {m.reason || '—'}
                            </p>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-xl bg-slate-100 flex items-center justify-center">
                                <User className="w-3 h-3 text-slate-400" />
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {m.user_profiles?.full_name || 'النظام'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="btn-secondary">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import api from '../lib/api';
import { X, AlertCircle, Plus, Minus, Info, Package, CheckCircle } from 'lucide-react';

interface Props {
  variant: any;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK = ['استلام شحنة جديدة', 'جرد يدوي', 'تلف / هالك', 'مرتجع', 'تعديل تصحيحي'];

export default function StockAdjustModal({ variant, onClose, onSuccess }: Props) {
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [loading, setLoad] = useState(false);
  const [error, setError] = useState('');

  const current = variant.inventory_levels?.available || 0;
  const newStock = current + delta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError('السبب مطلوب'); return; }
    if (delta === 0) { setError('يجب أن تكون قيمة التعديل غير صفر'); return; }
    if (newStock < 0) { setError('لا يمكن أن يكون المخزون الناتج سالباً'); return; }
    setLoad(true); setError('');
    try {
      await api.post(`/api/inventory/${variant.id}/adjust`, { delta, reason: reason.trim() });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل في تعديل المخزون');
    } finally { setLoad(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
      <div className="fixed inset-0 modal-overlay" onClick={onClose} />
      <div className="modal-box w-full max-w-md anim-scale-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-black text-slate-900">تعديل المخزون</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product info */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-none">{variant.products?.title}</p>
                {variant.title && variant.title !== 'Default Title' && (
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{variant.title}</p>
                )}
              </div>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 mb-0.5">الحالي</p>
              <p className="text-2xl font-black text-slate-900">{current}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="alert-error anim-shake text-sm font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* Delta control */}
            <div className="space-y-2">
              <label className="section-label">قيمة التعديل</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDelta(d => d - 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={delta}
                  onChange={e => setDelta(parseInt(e.target.value) || 0)}
                  className="input text-center text-xl font-black"
                />
                <button
                  type="button"
                  onClick={() => setDelta(d => d + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Preview */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-slate-500">المخزون الجديد:</span>
                <span
                  className="text-base font-black"
                  style={{ color: newStock < 0 ? '#ef4444' : newStock === 0 ? '#f59e0b' : '#10b981' }}
                >
                  {newStock}
                </span>
              </div>
            </div>

            {/* Quick reasons */}
            <div className="space-y-1.5">
              <label className="section-label">اختر سبباً شائعاً</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${reason === r
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-brand-200 hover:bg-brand-50'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason input */}
            <div className="space-y-1.5">
              <label className="section-label">السبب *</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="input"
                placeholder="أو اكتب السبب بنفسك..."
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || delta === 0}
                className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><CheckCircle className="w-4 h-4" />تأكيد التعديل</>
                }
              </button>
              <button type="button" onClick={onClose} className="btn-secondary px-5">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

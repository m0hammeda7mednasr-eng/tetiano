import { useEffect, useState } from 'react';
import api from '../lib/api';
import {
  CheckCircle, AlertCircle, Send, Calendar,
  Lightbulb, ShieldAlert, Target, FileText
} from 'lucide-react';

export default function DailyReports() {
  const [status, setStatus] = useState<any>(null);
  const [form, setForm] = useState({ done_today: '', blockers: '', plan_tomorrow: '' });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data } = await api.get('/api/reports/status/today');
      setStatus(data);
      if (data.submitted && data.report) {
        setForm({ done_today: data.report.done_today, blockers: data.report.blockers || '', plan_tomorrow: data.report.plan_tomorrow });
      }
    } catch { /* silent */ }
    finally { setChecking(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await api.post('/api/reports', form);
      setSuccess('تم إرسال التقرير بنجاح! 🎉');
      checkStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل في إرسال التقرير');
    } finally { setLoading(false); }
  };

  const today = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-brand-500" />
            <span className="section-label">Daily Report</span>
          </div>
          <h1 className="page-title">التقرير اليومي</h1>
          <p className="page-subtitle">سجّل إنجازاتك وخططك ليوم غد</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 card-flat rounded-xl">
          <Calendar className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-bold text-slate-600">{today}</span>
        </div>
      </div>

      {/* Status banner */}
      {!checking && status && (
        <div className={`anim-bounce-in ${status.submitted ? 'alert-success' : 'alert-warn'}`}>
          {status.submitted
            ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0" />
          }
          <div className="flex-1">
            <p className="text-sm font-black">
              {status.submitted ? 'رائع! تم تسليم تقرير اليوم ✓' : 'لم يتم تسليم أي تقرير اليوم بعد'}
            </p>
            <p className="text-xs font-medium mt-0.5 opacity-80">
              {status.submitted
                ? 'يمكنك تحديث التقرير في أي وقت قبل نهاية اليوم.'
                : 'يرجى ملء النموذج أدناه وإطلاع الفريق على تقدمك.'}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center">
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">تفاصيل التقرير</p>
            <p className="text-[11px] text-slate-400 font-medium">الحقول المميزة بـ * إلزامية</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="alert-error anim-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
          {success && (
            <div className="alert-success anim-bounce-in">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-bold">{success}</p>
            </div>
          )}

          {/* Done today */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 section-label">
              <Target className="w-3.5 h-3.5 text-brand-500" />
              ماذا أنجزت اليوم؟ *
            </label>
            <textarea
              rows={4}
              value={form.done_today}
              onChange={e => setForm({ ...form, done_today: e.target.value })}
              className="input leading-relaxed"
              placeholder="قائمة بمهامك المكتملة والتقدم المحرز اليوم..."
              required
            />
          </div>

          {/* Blockers */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 section-label">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              المعوقات
              <span className="text-[10px] font-medium text-slate-400 normal-case">(اختياري)</span>
            </label>
            <textarea
              rows={3}
              value={form.blockers}
              onChange={e => setForm({ ...form, blockers: e.target.value })}
              className="input leading-relaxed"
              placeholder="أي تحديات أو مشاكل تحتاج مساعدة فيها..."
            />
          </div>

          {/* Plan tomorrow */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 section-label">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              خطتك لغداً *
            </label>
            <textarea
              rows={4}
              value={form.plan_tomorrow}
              onChange={e => setForm({ ...form, plan_tomorrow: e.target.value })}
              className="input leading-relaxed"
              placeholder="أهم الأهداف والمهام التي ستعمل عليها غداً..."
              required
            />
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={loading} className="btn-primary py-2.5 px-7 disabled:opacity-50">
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send className="w-4 h-4" />{status?.submitted ? 'تحديث التقرير' : 'إرسال التقرير'}</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-violet-50 border-brand-100">
        <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />نصائح لتقرير متميز
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'كن محدداً — استخدم أرقاماً وأسماء مهام واضحة',
            'اذكر المعوقات مبكراً للحصول على مساعدة أسرع',
            'ضع أهدافاً واقعية ليوم الغد',
            'أرسل التقرير قبل نهاية الدوام',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-brand-100 border border-brand-200 flex items-center justify-center text-xs font-black text-brand-700 flex-shrink-0">
                {i + 1}
              </div>
              <p className="text-xs font-medium text-slate-600 mt-0.5 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

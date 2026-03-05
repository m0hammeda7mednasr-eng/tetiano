import { useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, CalendarDays, RefreshCw } from "lucide-react";
import api from "../../lib/api";

interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  changes: {
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    changed_fields?: string[];
    meta?: Record<string, unknown>;
  } | null;
  created_at: string;
  actor_name?: string | null;
}

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState("");
  const [tableName, setTableName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/audit-logs", {
        params: {
          page: targetPage,
          limit: 30,
          action: action || undefined,
          table_name: tableName || undefined,
          start_date: fromDate || undefined,
          end_date: toDate || undefined,
        },
      });
      setRows(data.logs || []);
      setPage(data.pagination?.page || targetPage);
      setTotalPages(data.pagination?.total_pages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const grouped = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            <span className="section-label">Audit Trail</span>
          </div>
          <h1 className="page-title">سجل التغييرات</h1>
          <p className="page-subtitle">تتبع كامل لكل تعديل إداري (من/إلى)</p>
        </div>
        <button onClick={() => load(page)} className="btn-secondary text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="فلتر الإجراء (مثال: admin.user.update)"
            className="input pr-9 text-sm"
          />
        </div>
        <input
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="الجدول (user_profiles/teams/brands)"
          className="input text-sm"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="input text-sm"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="input text-sm"
        />
        <div className="md:col-span-5 flex gap-2">
          <button onClick={() => load(1)} className="btn-primary text-xs">
            <CalendarDays className="w-3.5 h-3.5" />
            تطبيق الفلاتر
          </button>
          <button
            onClick={() => {
              setAction("");
              setTableName("");
              setFromDate("");
              setToDate("");
              setTimeout(() => load(1), 0);
            }}
            className="btn-secondary text-xs"
          >
            مسح
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-500">
          {loading ? "جارٍ التحميل..." : `${grouped.length} سجل في الصفحة الحالية`}
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="px-4 py-4">
                <div className="skeleton h-4 w-1/2 rounded mb-2" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            ))
          ) : grouped.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400 font-bold">
              لا توجد سجلات مطابقة
            </div>
          ) : (
            grouped.map((row) => {
              const changed = row.changes?.changed_fields || [];
              const actor = row.actor_name || row.user_id || "System";
              return (
                <div key={row.id} className="px-4 py-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-indigo">{row.action}</span>
                    {row.table_name && <span className="badge badge-gray">{row.table_name}</span>}
                    <span className="text-xs text-slate-500 font-semibold">{actor}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(row.created_at).toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {changed.length > 0 ? (
                      <>الحقول المتغيرة: {changed.join(", ")}</>
                    ) : (
                      <>لا توجد حقول مقارنة متاحة</>
                    )}
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-brand-600 font-bold">
                      عرض from/to
                    </summary>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
                      <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto text-[11px]">
                        {JSON.stringify(row.changes?.before || {}, null, 2)}
                      </pre>
                      <pre className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 overflow-auto text-[11px]">
                        {JSON.stringify(row.changes?.after || {}, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="btn-secondary text-xs disabled:opacity-50"
          disabled={page <= 1 || loading}
          onClick={() => load(page - 1)}
        >
          السابق
        </button>
        <span className="text-xs font-bold text-slate-500">
          صفحة {page} من {totalPages}
        </span>
        <button
          className="btn-secondary text-xs disabled:opacity-50"
          disabled={page >= totalPages || loading}
          onClick={() => load(page + 1)}
        >
          التالي
        </button>
      </div>
    </div>
  );
}

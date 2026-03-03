import { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
    FileText, Search, CheckCircle, AlertCircle,
    ChevronDown, ChevronUp, Clock
} from 'lucide-react';

interface Report {
    id: string;
    done_today: string;
    blockers?: string;
    plan_tomorrow: string;
    created_at: string;
    user_profiles: { full_name: string; role: string; avatar_color: string };
    teams: { name: string; color: string } | null;
}

interface MissingUser {
    id: string;
    full_name: string;
    role: string;
    avatar_color: string;
}

export default function AdminReports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [missing, setMissing] = useState<MissingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [search, setSearch] = useState('');
    const [expandedId, setExp] = useState<string | null>(null);

    useEffect(() => { load(); }, [date]);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/reports', { params: { date } });
            setReports(data.reports || []);
            setMissing(data.missing || []);
        } finally { setLoading(false); }
    };

    const filtered = reports.filter(r =>
        r.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.teams?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 anim-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-brand-500" />
                        <span className="section-label">Team Reports</span>
                    </div>
                    <h1 className="page-title">تقارير الفريق</h1>
                    <p className="page-subtitle">متابعة التقارير اليومية لجميع الأعضاء</p>
                </div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input text-xs font-bold" style={{ width: 155 }} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
                <div className="card p-4 text-center">
                    <p className="section-label mb-1">المُسلَّمة</p>
                    <p className="text-2xl font-black text-emerald-600">{reports.length}</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="section-label mb-1">لم تُسلَّم</p>
                    <p className="text-2xl font-black text-red-500">{missing.length}</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="section-label mb-1">معدل الالتزام</p>
                    <p className="text-2xl font-black text-brand-600">
                        {reports.length + missing.length > 0
                            ? Math.round((reports.length / (reports.length + missing.length)) * 100)
                            : 0}%
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reports list */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input pr-9 text-sm" placeholder="بحث باسم الموظف أو التيم..." />
                    </div>

                    {loading ? (
                        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
                    ) : filtered.length === 0 ? (
                        <div className="card flex flex-col items-center py-14">
                            <FileText className="w-12 h-12 text-slate-200 mb-3" />
                            <p className="text-sm font-bold text-slate-400">لا توجد تقارير{search ? ` لـ "${search}"` : ''}</p>
                        </div>
                    ) : (
                        filtered.map(r => {
                            const open = expandedId === r.id;
                            return (
                                <div key={r.id} className="card overflow-hidden">
                                    <div className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExp(open ? null : r.id)}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: r.user_profiles?.avatar_color || '#6366f1' }}>
                                            {r.user_profiles?.full_name?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <p className="text-sm font-black text-slate-800">{r.user_profiles?.full_name}</p>
                                                {r.teams && (
                                                    <span className="badge text-[9px]" style={{ background: `${r.teams.color}20`, color: r.teams.color, border: `1px solid ${r.teams.color}40` }}>
                                                        {r.teams.name}
                                                    </span>
                                                )}
                                                <span className="badge badge-green text-[9px]"><CheckCircle className="w-2.5 h-2.5" />مُسلَّم</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 line-clamp-1">{r.done_today}</p>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(r.created_at).toLocaleString('ar-EG')}
                                            </span>
                                        </div>
                                        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                    </div>

                                    {open && (
                                        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-3">
                                            {[
                                                { label: '✅ ماذا أنجز اليوم؟', val: r.done_today, cls: 'bg-emerald-50 border-emerald-100' },
                                                r.blockers ? { label: '🚧 المعوقات', val: r.blockers, cls: 'bg-red-50 border-red-100' } : null,
                                                { label: '📅 خطة الغد', val: r.plan_tomorrow, cls: 'bg-brand-50 border-brand-200' },
                                            ].filter(Boolean).map((s: any, i) => (
                                                <div key={i} className={`p-3 ${s.cls} border rounded-xl`}>
                                                    <p className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wide">{s.label}</p>
                                                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{s.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Missing panel */}
                <div>
                    <div className="card overflow-hidden sticky top-6">
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <h3 className="text-sm font-black text-slate-800">لم يُسلّموا بعد</h3>
                            </div>
                            <span className="badge badge-red">{missing.length}</span>
                        </div>
                        <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto scroll-thin">
                            {missing.length === 0 ? (
                                <div className="flex flex-col items-center py-8">
                                    <CheckCircle className="w-10 h-10 text-emerald-300 mb-2" />
                                    <p className="text-sm font-bold text-slate-400">🎉 الجميع سلّم!</p>
                                </div>
                            ) : missing.map(u => (
                                <div key={u.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl border border-slate-100 hover:bg-red-50 transition-colors">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: u.avatar_color || '#94a3b8' }}>
                                        {u.full_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{u.full_name}</p>
                                        <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
                                    </div>
                                    <span className="badge badge-red text-[9px]">غائب</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
    Shield, Plus, Edit2, Trash2, Users, CheckCircle,
    AlertCircle, X, Package, FileText, ShoppingBag,
    Settings, BarChart3, Lock
} from 'lucide-react';

interface Team {
    id: string;
    name: string;
    description?: string;
    color: string;
    is_active: boolean;
    team_members: { user_id: string }[];
    team_permissions: any;
}

interface UserRow {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_color: string;
}

const PERM_LIST = [
    { key: 'can_view_inventory', label: 'عرض المخزون', icon: Package, category: 'المخزون' },
    { key: 'can_edit_inventory', label: 'تعديل المخزون', icon: Package, category: 'المخزون' },
    { key: 'can_view_orders', label: 'عرض الأوردات', icon: ShoppingBag, category: 'الأوردات' },
    { key: 'can_view_reports', label: 'عرض التقارير', icon: FileText, category: 'التقارير' },
    { key: 'can_submit_reports', label: 'رفع التقارير اليومية', icon: BarChart3, category: 'التقارير' },
    { key: 'can_view_settings', label: 'الوصول للإعدادات', icon: Settings, category: 'النظام' },
    { key: 'can_manage_team', label: 'إدارة أعضاء التيم', icon: Users, category: 'النظام' },
];

const TEAM_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function TeamManagement() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setModal] = useState(false);
    const [editTeam, setEditTeam] = useState<Team | null>(null);
    const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

    const [form, setForm] = useState({
        name: '', description: '', color: TEAM_COLORS[0],
        member_ids: [] as string[],
        permissions: {} as Record<string, boolean>,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [tRes, uRes] = await Promise.all([
                api.get('/api/admin/teams'),
                api.get('/api/admin/users'),
            ]);
            setTeams(tRes.data.teams || []);
            setUsers(uRes.data.users || []);
        } finally { setLoading(false); }
    };

    const defaultPerms = () =>
        Object.fromEntries(PERM_LIST.map(p => [p.key, p.key.startsWith('can_view') || p.key === 'can_submit_reports']));

    const openCreate = () => {
        setEditTeam(null);
        setForm({ name: '', description: '', color: TEAM_COLORS[0], member_ids: [], permissions: defaultPerms() });
        setModal(true);
    };

    const openEdit = (t: Team) => {
        setEditTeam(t);
        setForm({
            name: t.name,
            description: t.description || '',
            color: t.color,
            member_ids: t.team_members?.map(m => m.user_id) || [],
            permissions: { ...defaultPerms(), ...(t.team_permissions || {}) },
        });
        setModal(true);
    };

    const toggleMember = (uid: string) =>
        setForm(f => ({
            ...f,
            member_ids: f.member_ids.includes(uid)
                ? f.member_ids.filter(id => id !== uid)
                : [...f.member_ids, uid],
        }));

    const togglePerm = (key: string) =>
        setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));

    const handleSave = async () => {
        if (!form.name) return;
        setSaving(true);
        try {
            if (editTeam) {
                await api.patch(`/api/admin/teams/${editTeam.id}`, {
                    name: form.name, description: form.description,
                    color: form.color, member_ids: form.member_ids, permissions: form.permissions,
                });
            } else {
                await api.post('/api/admin/teams', {
                    name: form.name, description: form.description,
                    color: form.color, member_ids: form.member_ids, permissions: form.permissions,
                });
            }
            setMessage({ type: 'success', text: editTeam ? 'تم تحديث التيم' : 'تم إنشاء التيم بنجاح!' });
            setModal(false);
            fetchAll();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'فشل الحفظ' });
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد حذف هذا التيم؟')) return;
        try {
            await api.delete(`/api/admin/teams/${id}`);
            fetchAll();
        } catch { setMessage({ type: 'error', text: 'فشل الحذف' }); }
    };

    const cats = [...new Set(PERM_LIST.map(p => p.category))];
    const staffUsers = users.filter(u => u.role !== 'admin');

    return (
        <div className="space-y-6 anim-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-brand-500" />
                        <span className="section-label">Team Management</span>
                    </div>
                    <h1 className="page-title">إدارة التيمات</h1>
                    <p className="page-subtitle">إنشاء التيمات وتحديد الصلاحيات لكل عضو</p>
                </div>
                <button onClick={openCreate} className="btn-primary text-xs">
                    <Plus className="w-3.5 h-3.5" />إضافة تيم جديد
                </button>
            </div>

            {message && (
                <div className={`anim-bounce-in ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {message.type === 'success'
                        ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    }
                    <p className="text-sm font-bold flex-1">{message.text}</p>
                    <button className="btn-icon p-1" onClick={() => setMessage(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
            )}

            {/* Teams grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
                </div>
            ) : teams.length === 0 ? (
                <div className="card flex flex-col items-center py-20">
                    <Shield className="w-14 h-14 text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">لا توجد تيمات بعد</p>
                    <p className="text-xs text-slate-300 mt-1 mb-5">أنشئ تيمك الأول وعيّن الأعضاء</p>
                    <button onClick={openCreate} className="btn-primary text-xs">
                        <Plus className="w-3.5 h-3.5" />إضافة تيم
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => {
                        const perms = team.team_permissions || {};
                        const activePerms = PERM_LIST.filter(p => perms[p.key]);
                        return (
                            <div key={team.id} className="card overflow-hidden">
                                <div className="h-1.5 w-full" style={{ background: team.color }} />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
                                                style={{ background: team.color, boxShadow: `0 4px 14px ${team.color}40` }}
                                            >
                                                {team.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-800 leading-none">{team.name}</h3>
                                                {team.description && <p className="text-[11px] text-slate-400 mt-0.5">{team.description}</p>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(team)} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(team.id)} className="btn-icon text-red-400 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>

                                    {/* Members */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500">{team.team_members?.length || 0} أعضاء</span>
                                        <div className="flex -space-x-1.5 mr-1">
                                            {(team.team_members || []).slice(0, 4).map((m, i) => {
                                                const u = users.find(x => x.id === m.user_id);
                                                return u ? (
                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-black" style={{ background: u.avatar_color }} title={u.full_name}>
                                                        {u.full_name?.charAt(0)}
                                                    </div>
                                                ) : null;
                                            })}
                                            {(team.team_members?.length || 0) > 4 && (
                                                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600">
                                                    +{(team.team_members?.length || 0) - 4}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Permissions chips */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {activePerms.slice(0, 5).map(p => (
                                            <span key={p.key} className="badge badge-indigo text-[9px] flex items-center gap-1">
                                                <p.icon className="w-2.5 h-2.5" />{p.label}
                                            </span>
                                        ))}
                                        {activePerms.length === 0 && (
                                            <span className="badge badge-red text-[9px]"><Lock className="w-2.5 h-2.5" />لا صلاحيات</span>
                                        )}
                                        {activePerms.length > 5 && (
                                            <span className="badge badge-gray text-[9px]">+{activePerms.length - 5}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto" dir="rtl">
                    <div className="fixed inset-0 modal-overlay" onClick={() => setModal(false)} />
                    <div className="modal-box w-full max-w-2xl anim-scale-in my-auto overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-black text-slate-900">{editTeam ? 'تعديل التيم' : 'إضافة تيم جديد'}</h3>
                            <button className="btn-icon" onClick={() => setModal(false)}><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Name & Description */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="section-label">اسم التيم *</label>
                                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="مثال: فريق المبيعات" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="section-label">الوصف</label>
                                    <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input" placeholder="وصف اختياري..." />
                                </div>
                            </div>

                            {/* Color */}
                            <div className="space-y-1.5">
                                <label className="section-label">لون التيم</label>
                                <div className="flex gap-2">
                                    {TEAM_COLORS.map(c => (
                                        <button
                                            key={c} type="button"
                                            onClick={() => setForm({ ...form, color: c })}
                                            className="w-8 h-8 rounded-xl transition-all"
                                            style={{ background: c, outline: form.color === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: 2 }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Permissions */}
                            <div className="space-y-2">
                                <label className="section-label flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />الصلاحيات</label>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    {cats.map((cat, ci) => (
                                        <div key={cat} className={ci < cats.length - 1 ? 'border-b border-slate-100' : ''}>
                                            <p className="px-4 py-2 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">{cat}</p>
                                            {PERM_LIST.filter(p => p.category === cat).map(p => (
                                                <div key={p.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 bg-brand-50 border border-brand-100 rounded-lg flex items-center justify-center">
                                                            <p.icon className="w-3.5 h-3.5 text-brand-600" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{p.label}</span>
                                                    </div>
                                                    {/* Toggle switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePerm(p.key)}
                                                        className="relative flex-shrink-0"
                                                        style={{
                                                            width: 40, height: 20,
                                                            borderRadius: 10,
                                                            background: form.permissions[p.key] ? '#6366f1' : '#e2e8f0',
                                                            transition: 'background .2s',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                position: 'absolute',
                                                                top: 2,
                                                                left: form.permissions[p.key] ? undefined : 2,
                                                                right: form.permissions[p.key] ? 2 : undefined,
                                                                width: 16, height: 16,
                                                                borderRadius: 8,
                                                                background: 'white',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                                                                transition: 'left .2s, right .2s',
                                                            }}
                                                        />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Members */}
                            <div className="space-y-2">
                                <label className="section-label flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />اختر الأعضاء ({form.member_ids.length} محدد)
                                </label>
                                <div className="border border-slate-200 rounded-xl divide-y divide-slate-50 max-h-52 overflow-y-auto scroll-thin">
                                    {staffUsers.map(u => (
                                        <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={form.member_ids.includes(u.id)}
                                                onChange={() => toggleMember(u.id)}
                                                className="rounded border-slate-300 text-brand-600"
                                            />
                                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: u.avatar_color }}>
                                                {u.full_name?.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{u.full_name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                            </div>
                                            <span className={`badge text-[9px] ${u.role === 'manager' ? 'badge-blue' : 'badge-gray'}`}>
                                                {u.role === 'manager' ? 'مدير' : 'موظف'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50">
                                    {saving
                                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><CheckCircle className="w-4 h-4" />{editTeam ? 'حفظ التغييرات' : 'إنشاء التيم'}</>
                                    }
                                </button>
                                <button onClick={() => setModal(false)} className="btn-secondary px-5">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

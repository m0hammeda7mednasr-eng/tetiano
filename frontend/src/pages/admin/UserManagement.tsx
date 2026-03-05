import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import {
  UserPlus,
  Search,
  Edit2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  X,
  Mail,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Users,
  Lock,
} from "lucide-react";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  is_active: boolean;
  avatar_color: string;
  created_at: string;
  team_members: {
    team_id: string;
    teams: {
      id: string;
      name: string;
      color: string;
    } | null;
  }[];
}

interface Team {
  id: string;
  name: string;
  color: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: "badge-purple",
  manager: "badge-blue",
  staff: "badge-gray",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "أدمن",
  manager: "مدير",
  staff: "موظف",
};

const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#84cc16",
];

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copying, setCopying] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "admin" as "admin" | "manager" | "staff",
    team_id: "",
    password: "",
    avatar_color: AVATAR_COLORS[0],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, tRes] = await Promise.all([
        api.get("/api/admin/users"),
        api.get("/api/admin/teams"),
      ]);
      setUsers(uRes.data.users || []);
      setTeams(tRes.data.teams || []);
    } catch {
      setMessage({ type: "error", text: "فشل تحميل البيانات" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setCreatedCreds(null);
    setForm({
      full_name: "",
      email: "",
      role: "admin",
      team_id: "",
      password: "",
      avatar_color: AVATAR_COLORS[0],
    });
    setModal(true);
  };

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setCreatedCreds(null);
    setForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      team_id: user.team_members?.[0]?.team_id || "",
      password: "",
      avatar_color: user.avatar_color,
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || (!editUser && !form.email.trim())) {
      setMessage({ type: "error", text: "الاسم والبريد مطلوبان" });
      return;
    }

    setSaving(true);
    try {
      if (editUser) {
        await api.patch(`/api/admin/users/${editUser.id}`, {
          full_name: form.full_name,
          role: form.role,
          team_id: form.team_id || null,
          avatar_color: form.avatar_color,
        });
        setMessage({ type: "success", text: "تم تحديث المستخدم" });
      } else {
        const { data } = await api.post("/api/admin/users", {
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password || undefined,
          team_id: form.team_id || undefined,
          avatar_color: form.avatar_color,
        });
        setCreatedCreds({
          email: form.email,
          password: data.tempPassword || form.password,
        });
        setMessage({ type: "success", text: "تم إنشاء المستخدم بنجاح" });
      }
      await fetchAll();
      if (!editUser) {
        setForm({
          full_name: "",
          email: "",
          role: "admin",
          team_id: "",
          password: "",
          avatar_color: AVATAR_COLORS[0],
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "فشل الحفظ",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api/admin/users/${id}`, { is_active: !isActive });
      await fetchAll();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "فشل تحديث الحالة",
      });
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm("هل تريد إعادة تعيين كلمة المرور؟")) return;
    try {
      const { data } = await api.post(`/api/admin/users/${id}/reset-password`);
      alert(`كلمة المرور الجديدة: ${data.tempPassword}`);
    } catch {
      setMessage({ type: "error", text: "فشل إعادة تعيين كلمة المرور" });
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()),
      ),
    [users, search],
  );

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-brand-500" />
            <span className="section-label">User Management</span>
          </div>
          <h1 className="page-title">إدارة المستخدمين</h1>
          <p className="page-subtitle">إنشاء الحسابات وتحديد صلاحيات الوصول</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs">
          <UserPlus className="w-3.5 h-3.5" />
          إضافة مستخدم جديد
        </button>
      </div>

      {message && (
        <div className={`${message.type === "success" ? "alert-success" : "alert-error"} anim-bounce-in`}>
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <p className="text-sm font-bold flex-1">{message.text}</p>
          <button className="btn-icon p-1" onClick={() => setMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-9 text-sm"
              placeholder="بحث بالاسم أو البريد..."
            />
          </div>
          <span className="text-xs font-bold text-slate-400">{filtered.length} مستخدم</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الدور</th>
                <th>الفريق</th>
                <th style={{ textAlign: "center" }}>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th style={{ textAlign: "left" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <td key={j}>
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-bold">لا توجد نتائج</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                          style={{ background: u.avatar_color }}
                        >
                          {u.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-none">{u.full_name}</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_STYLES[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td>
                      {u.team_members?.[0]?.teams ? (
                        <span className="badge badge-indigo">{u.team_members[0].teams.name}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
                        {u.is_active ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString("ar-EG")}
                      </span>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="btn-icon" title="تعديل">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="btn-icon"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeactivate(u.id, u.is_active)}
                          className={`btn-icon ${u.is_active ? "text-red-400 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                          title={u.is_active ? "تعطيل" : "تفعيل"}
                        >
                          {u.is_active ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" dir="rtl">
          <div className="fixed inset-0 modal-overlay" onClick={() => setModal(false)} />
          <div className="modal-box w-full max-w-lg anim-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-brand-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {createdCreds && (
                <div className="alert-success flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-sm font-black">بيانات الدخول للمستخدم:</p>
                  </div>
                  <div className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-xs font-mono space-y-1">
                    <p>
                      <span className="font-bold">البريد:</span> {createdCreds.email}
                    </p>
                    <p>
                      <span className="font-bold">كلمة المرور:</span> {createdCreds.password}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`,
                      )
                    }
                    className="btn-secondary text-xs self-end"
                  >
                    {copying ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copying ? "تم النسخ" : "نسخ البيانات"}
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="section-label">لون الحساب</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, avatar_color: c })}
                      className="w-8 h-8 rounded-xl transition-all"
                      style={{
                        background: c,
                        outline:
                          form.avatar_color === c ? `3px solid ${c}` : "3px solid transparent",
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="section-label">الاسم الكامل *</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input pr-9"
                    placeholder="أحمد محمد"
                  />
                </div>
              </div>

              {!editUser && (
                <div className="space-y-1.5">
                  <label className="section-label">البريد الإلكتروني *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input pr-9"
                      placeholder="ahmed@example.com"
                    />
                  </div>
                </div>
              )}

              {!editUser && (
                <div className="space-y-1.5">
                  <label className="section-label">كلمة المرور (اختياري)</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="input pr-9"
                      placeholder="اتركها فارغة لإنشاء كلمة عشوائية"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="section-label">الدور</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                    className="input"
                  >
                    <option value="staff">موظف (Staff)</option>
                    <option value="manager">مدير (Manager)</option>
                    <option value="admin">أدمن (Admin)</option>
                  </select>
                </div>
                {teams.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="section-label">الفريق</label>
                    <select
                      value={form.team_id}
                      onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                      className="input"
                    >
                      <option value="">بدون فريق</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {editUser ? "حفظ التغييرات" : "إنشاء الحساب"}
                    </>
                  )}
                </button>
                <button onClick={() => setModal(false)} className="btn-secondary px-5">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

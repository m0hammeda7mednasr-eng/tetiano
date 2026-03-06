import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type StoreRole = "admin" | "manager" | "staff" | "viewer";

interface UserRow {
  membership_id: string;
  user_id: string;
  full_name: string | null;
  store_role: StoreRole;
  membership_status: "active" | "inactive";
  is_active: boolean;
}

const ROLE_LABELS: Record<StoreRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  viewer: "Viewer",
};

const ROLE_BADGES: Record<StoreRole, string> = {
  admin: "badge-blue",
  manager: "badge-cyan",
  staff: "badge-gray",
  viewer: "badge-yellow",
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    store_role: "staff" as StoreRole,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/app/users");
      setUsers(data?.users || []);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "فشل تحميل المستخدمين." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = (u.full_name || "").toLowerCase();
      const id = (u.user_id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [users, search]);

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setMessage({ type: "error", text: "الاسم والبريد وكلمة المرور مطلوبين." });
      return;
    }
    if (form.password.length < 8) {
      setMessage({ type: "error", text: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." });
      return;
    }

    setSaving(true);
    try {
      await api.post("/api/app/users", {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        store_role: form.store_role,
      });
      setMessage({ type: "success", text: "تم إنشاء المستخدم بنجاح." });
      setShowModal(false);
      setForm({ full_name: "", email: "", password: "", store_role: "staff" });
      await loadUsers();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "فشل إنشاء المستخدم." });
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (userId: string, storeRole: StoreRole) => {
    try {
      await api.patch(`/api/app/users/${userId}/role`, { store_role: storeRole });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, store_role: storeRole } : u)),
      );
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "فشل تحديث الدور." });
    }
  };

  const toggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const nextStatus = isActive ? "inactive" : "active";
      await api.patch(`/api/app/users/${userId}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, is_active: !isActive, membership_status: nextStatus }
            : u,
        ),
      );
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.error || "فشل تحديث الحالة." });
    }
  };

  return (
    <div className="space-y-6 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-brand-500" />
            <span className="section-label">Store Team</span>
          </div>
          <h1 className="page-title">إدارة مستخدمي المتجر</h1>
          <p className="page-subtitle">كل المستخدمين هنا تابعين لنفس المتجر فقط</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          إضافة مستخدم
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
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-9 text-sm"
              placeholder="بحث بالاسم أو ID..."
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
                <th style={{ textAlign: "center" }}>الحالة</th>
                <th style={{ textAlign: "left" }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[1, 2, 3, 4].map((j) => (
                      <td key={j}>
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "60px 0" }}>
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-bold">لا توجد نتائج</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.user_id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center text-xs font-black">
                          {(u.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-none">
                            {u.full_name || "—"}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{u.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={u.store_role}
                        onChange={(e) => updateRole(u.user_id, e.target.value as StoreRole)}
                        className={`input text-xs font-bold ${ROLE_BADGES[u.store_role]}`}
                      >
                        <option value="admin">{ROLE_LABELS.admin}</option>
                        <option value="manager">{ROLE_LABELS.manager}</option>
                        <option value="staff">{ROLE_LABELS.staff}</option>
                        <option value="viewer">{ROLE_LABELS.viewer}</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
                        {u.is_active ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <button
                        onClick={() => toggleStatus(u.user_id, u.is_active)}
                        className={`btn-icon ${u.is_active ? "text-red-400 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"}`}
                        title={u.is_active ? "تعطيل" : "تفعيل"}
                      >
                        {u.is_active ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
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
          <div className="fixed inset-0 modal-overlay" onClick={() => setShowModal(false)} />
          <div className="modal-box w-full max-w-md anim-scale-in overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">إضافة مستخدم جديد</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                type="text"
                className="input"
                placeholder="الاسم الكامل"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <input
                type="email"
                className="input"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                dir="ltr"
              />
              <input
                type="password"
                className="input"
                placeholder="كلمة المرور"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                dir="ltr"
              />
              <select
                className="input"
                value={form.store_role}
                onChange={(e) => setForm({ ...form, store_role: e.target.value as StoreRole })}
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                {saving ? "جارٍ الإنشاء..." : "إنشاء المستخدم"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

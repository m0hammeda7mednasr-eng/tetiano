import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import {
  Users,
  Shield,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Settings,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Zap,
  Package,
  ShoppingCart,
  Lock,
  Server,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface Stats {
  total_users: number;
  active_users: number;
  total_teams: number;
  reports_today: number;
  unique_reporters: number;
  total_brands?: number;
  shopify_connected?: number;
  pending_orders?: number;
}

interface ReportRow {
  id: string;
  done_today: string;
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

interface ShopifyStatus {
  total_brands: number;
  connected_brands: number;
  sync_status: "syncing" | "idle" | "error";
  last_sync?: string;
  pending_webhooks: number;
}

export default function AdminDashboard() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatus | null>(
    null,
  );
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [missing, setMissing] = useState<MissingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [refreshing, setRefresh] = useState(false);

  useEffect(() => {
    load();
  }, [selectedDate]);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefresh(true);
    else setLoading(true);
    try {
      const [statsRes, reportsRes, shopifyRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/reports", { params: { date: selectedDate } }),
        api.get("/api/admin/shopify-status").catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data.reports || []);
      setMissing(reportsRes.data.missing || []);
      setShopifyStatus(shopifyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  };

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const submitRate = stats
    ? Math.round(
        (stats.unique_reporters / Math.max(stats.active_users, 1)) * 100,
      )
    : 0;

  const STAT_CARDS = stats
    ? [
        {
          title: "إجمالي المستخدمين",
          val: stats.total_users,
          sub: `${stats.active_users} نشط`,
          icon: Users,
          grad: "from-brand-500 to-brand-600",
          glow: "rgba(99,102,241,.25)",
        },
        {
          title: "التيمات",
          val: stats.total_teams,
          sub: "تيم نشط",
          icon: Shield,
          grad: "from-violet-500 to-violet-600",
          glow: "rgba(139,92,246,.25)",
        },
        {
          title: "تقارير اليوم",
          val: stats.reports_today,
          sub: `من ${stats.unique_reporters} موظف`,
          icon: FileText,
          grad: "from-emerald-500 to-emerald-600",
          glow: "rgba(16,185,129,.25)",
        },
        {
          title: "معدل الالتزام",
          val: `${submitRate}%`,
          sub: "نسبة رفع التقارير",
          icon: TrendingUp,
          grad:
            submitRate >= 80
              ? "from-emerald-500 to-emerald-600"
              : submitRate >= 50
                ? "from-amber-400 to-amber-500"
                : "from-red-500 to-red-600",
          glow: "rgba(99,102,241,.2)",
        },
        ...(stats.total_brands
          ? [
              {
                title: "متاجر Shopify",
                val: stats.shopify_connected || 0,
                sub: `من ${stats.total_brands} متجر`,
                icon: ShoppingCart,
                grad: "from-orange-500 to-orange-600",
                glow: "rgba(249,115,22,.25)",
              },
              {
                title: "أوردرات معلقة",
                val: stats.pending_orders || 0,
                sub: "تحتاج مراجعة",
                icon: Package,
                grad: "from-cyan-500 to-cyan-600",
                glow: "rgba(6,182,212,.25)",
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-brand-500" />
            <span className="section-label">Admin Control Panel</span>
          </div>
          <h1 className="page-title">لوحة تحكم الأدمن</h1>
          <p className="page-subtitle">
            مرحباً {profile?.full_name?.split(" ")[0]} 👋 — {today}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setDate(e.target.value)}
            className="input text-xs font-bold"
            style={{ width: 150 }}
          />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
          <Link to="/admin/users" className="btn-primary text-xs">
            <UserPlus className="w-3.5 h-3.5" />
            إدارة المستخدمين
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((c, i) => (
            <div key={i} className={`stat-card anim-fade-up delay-${i + 1}`}>
              <div
                className={`absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r ${c.grad}`}
              />
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${c.grad}`}
                style={{ boxShadow: `0 4px 14px ${c.glow}` }}
              >
                <c.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-black text-slate-900 leading-none mb-1">
                {c.val}
              </p>
              <p className="text-xs font-semibold text-slate-500">{c.title}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports submitted */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">
                  التقارير المُسلَّمة
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {selectedDate === new Date().toISOString().slice(0, 10)
                    ? "اليوم"
                    : selectedDate}
                </p>
              </div>
            </div>
            <span className="badge badge-green">{reports.length} تقرير</span>
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3">
                  <div className="skeleton w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-36 rounded" />
                    <div className="skeleton h-3 w-56 rounded" />
                  </div>
                </div>
              ))
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <FileText className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">
                  لا توجد تقارير لهذا اليوم
                </p>
              </div>
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-25 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{
                      background: r.user_profiles?.avatar_color || "#6366f1",
                    }}
                  >
                    {r.user_profiles?.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-800 leading-none">
                        {r.user_profiles?.full_name}
                      </p>
                      {r.teams && (
                        <span className="badge badge-indigo text-[9px]">
                          {r.teams.name}
                        </span>
                      )}
                      <span className="badge badge-green text-[9px]">
                        <CheckCircle className="w-2.5 h-2.5" />
                        مُسلَّم
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {r.done_today}
                    </p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(r.created_at).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Missing reports */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-black text-slate-800">
                  لم يُسلّموا بعد
                </h3>
              </div>
              <span className="badge badge-red">{missing.length}</span>
            </div>
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto scroll-thin">
              {missing.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 font-medium">
                  🎉 الجميع سلّم!
                </p>
              ) : (
                missing.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                      style={{ background: u.avatar_color || "#94a3b8" }}
                    >
                      {u.full_name?.charAt(0)}
                    </div>
                    <p className="text-xs font-bold text-slate-700 flex-1 truncate">
                      {u.full_name}
                    </p>
                    <span className="badge badge-red text-[9px]">غائب</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Progress bar */}
          {stats && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800">
                  معدل الالتزام
                </h3>
                <span
                  className="text-lg font-black"
                  style={{
                    color:
                      submitRate >= 80
                        ? "#10b981"
                        : submitRate >= 50
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {submitRate}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${submitRate}%`,
                    background:
                      submitRate >= 80
                        ? "linear-gradient(90deg,#10b981,#059669)"
                        : submitRate >= 50
                          ? "linear-gradient(90deg,#f59e0b,#d97706)"
                          : "linear-gradient(90deg,#ef4444,#dc2626)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-slate-400">
                  {stats.unique_reporters} سلّموا
                </span>
                <span className="text-[10px] text-slate-400">
                  {missing.length} لم يسلّموا
                </span>
              </div>
            </div>
          )}

          {/* Quick nav */}
          <div className="card p-4">
            <p className="section-label mb-3">إدارة النظام</p>
            <div className="space-y-1.5">
              {[
                {
                  label: "إدارة المستخدمين",
                  to: "/admin/users",
                  icon: Users,
                  cls: "text-brand-600 bg-brand-50",
                },
                {
                  label: "إدارة التيمات",
                  to: "/admin/teams",
                  icon: Shield,
                  cls: "text-violet-600 bg-violet-50",
                },
                {
                  label: "صلاحيات الوصول",
                  to: "/admin/teams",
                  icon: Lock,
                  cls: "text-indigo-600 bg-indigo-50",
                },
                {
                  label: "إعدادات Shopify",
                  to: "/admin/shopify",
                  icon: ShoppingCart,
                  cls: "text-orange-600 bg-orange-50",
                },
                {
                  label: "كل التقارير",
                  to: "/admin/reports",
                  icon: FileText,
                  cls: "text-emerald-600 bg-emerald-50",
                },
                {
                  label: "الإعدادات",
                  to: "/settings",
                  icon: Settings,
                  cls: "text-slate-500 bg-slate-100",
                },
              ].map((item, i) => (
                <Link
                  key={i}
                  to={item.to}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.cls}`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 flex-1">
                    {item.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                </Link>
              ))}
            </div>
          </div>

          {/* Shopify Status */}
          {shopifyStatus && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    حالة Shopify
                  </h3>
                  <p className="text-[9px] text-slate-400">
                    {shopifyStatus.last_sync
                      ? new Date(shopifyStatus.last_sync).toLocaleString(
                          "ar-EG",
                        )
                      : "لم يتم المزامجة"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">متاجر مربوطة</span>
                  <span className="text-sm font-black text-emerald-600">
                    {shopifyStatus.connected_brands}/
                    {shopifyStatus.total_brands}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">حالة المزامجة</span>
                  <span
                    className={`badge text-[9px] ${
                      shopifyStatus.sync_status === "syncing"
                        ? "badge-blue animate-pulse"
                        : shopifyStatus.sync_status === "idle"
                          ? "badge-green"
                          : "badge-red"
                    }`}
                  >
                    {shopifyStatus.sync_status === "syncing"
                      ? "⏳ جاري"
                      : shopifyStatus.sync_status === "idle"
                        ? "✓ طبيعي"
                        : "✗ خطأ"}
                  </span>
                </div>
                {shopifyStatus.pending_webhooks > 0 && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-bold">
                      {shopifyStatus.pending_webhooks} webhooks معلقة
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

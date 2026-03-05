import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Bell, Package, FileText, LogOut, LayoutDashboard,
  Menu, X, Settings as SettingsIcon, ShoppingCart,
  ChevronRight, Zap, Activity, Shield, Users,
  ChevronDown
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';

const NAV = [
  { label: 'لوحة التحكم', path: '/', icon: LayoutDashboard, perm: null },
  { label: 'المخزون', path: '/inventory', icon: Package, perm: 'can_view_inventory' },
  { label: 'الأوردات', path: '/orders', icon: ShoppingCart, perm: 'can_view_orders' },
  { label: 'التقارير', path: '/reports', icon: FileText, perm: 'can_submit_reports' },
  { label: 'الإعدادات', path: '/settings', icon: SettingsIcon, perm: null },
];

const ADMIN_NAV = [
  { label: 'Admin Dashboard', path: '/admin/dashboard', icon: Shield },
  { label: 'المستخدمون', path: '/admin/users', icon: Users },
  { label: 'التيمات', path: '/admin/teams', icon: Shield },
  { label: 'Shopify', path: '/admin/shopify', icon: ShoppingCart },
  { label: 'تقارير الفريق', path: '/admin/reports', icon: FileText },
  { label: 'Audit Logs', path: '/admin/audit', icon: Activity },
];

export default function Layout() {
  const { user, profile, signOut, isAdmin, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobile] = useState(false);
  const [userMenuOpen, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setMobile(false); }, [location.pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get('/api/notifications/unread-count');
      setUnread(data.count || 0);
    } catch { /* silent */ }
  };

  const active = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const current = [...NAV, ...ADMIN_NAV].find(n => active(n.path));

  const handleSignOut = async () => { setUserMenu(false); await signOut(); navigate('/login'); };

  const roleLabel = profile?.role === 'admin' ? 'أدمن' : profile?.role === 'manager' ? 'مدير' : 'موظف';
  const roleBadge = profile?.role === 'admin' ? 'badge-purple' : profile?.role === 'manager' ? 'badge-blue' : 'badge-gray';

  /* ── Sidebar content ── */
  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl grad-brand flex items-center justify-center shadow-brand flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-black text-slate-900 leading-none tracking-tight">تيتيانو</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Inventory & CRM System</p>
          </div>
        </div>

        {/* System status pulse */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold text-emerald-700">النظام يعمل بشكل طبيعي</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto scroll-thin space-y-4">
        {/* Main nav */}
        <div>
          <p className="px-3 mb-2 section-label">التنقل</p>
          <div className="space-y-0.5">
            {NAV.filter(n => !n.perm || isAdmin || hasPermission(n.perm)).map(n => (
              <Link key={n.path} to={n.path} className={`nav-item ${active(n.path) ? 'active' : ''}`}>
                <n.icon className="nav-icon w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{n.label}</span>
                {active(n.path) && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
              </Link>
            ))}
          </div>
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div>
            <p className="px-3 mb-2 section-label" style={{ color: '#8b5cf6' }}>⚡ لوحة الأدمن</p>
            <div className="space-y-0.5">
              {ADMIN_NAV.map(n => (
                <Link key={n.path} to={n.path} className={`nav-item ${active(n.path) ? 'active' : ''}`}>
                  <n.icon className="nav-icon w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{n.label}</span>
                  {active(n.path) && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* User card */}
      <div className="p-3">
        <div className="card-flat p-3 rounded-xl">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: profile?.avatar_color || '#6366f1' }}
            >
              {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate leading-none">
                {profile?.full_name || user?.email?.split('@')[0]}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`badge text-[9px] ${roleBadge}`}>{roleLabel}</span>
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-danger w-full justify-center py-2 text-xs">
            <LogOut className="w-3.5 h-3.5" />تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50" dir="rtl">

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col fixed h-full sidebar z-20"
        style={{ width: 'var(--sidebar-w)' }}
      >
        <SidebarInner />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginRight: 'calc(var(--sidebar-w))' }}>

        {/* Top bar */}
        <header className="h-16 top-bar sticky top-0 z-10">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">

            {/* Mobile hamburger + logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setMobile(true)} className="btn-icon">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg grad-brand flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-black text-slate-900">تيتيانو</span>
              </div>
            </div>

            {/* Breadcrumb — desktop */}
            <div className="hidden lg:flex items-center gap-2">
              {current && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <current.icon className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{current.label}</span>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              {/* Live indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Activity className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-[11px] font-bold text-slate-500">Live</span>
              </div>

              {/* Bell */}
              <button className="relative btn-icon">
                <Bell style={{ width: 18, height: 18 }} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {/* User dropdown — desktop */}
              <div className="relative hidden lg:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenu(v => !v)}
                  className="flex items-center gap-2 pl-2 border-r border-slate-150 mr-1 hover:bg-slate-50 rounded-xl px-2 py-1 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: profile?.avatar_color || '#6366f1' }}
                  >
                    {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right hidden xl:block">
                    <p className="text-xs font-bold text-slate-700 leading-none">{profile?.full_name || user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{roleLabel}</p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-card-md overflow-hidden anim-scale-in z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-black text-slate-800 truncate">{profile?.full_name || 'المستخدم'}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      <span className={`badge text-[9px] mt-1 ${roleBadge}`}>{roleLabel}</span>
                    </div>
                    <div className="p-1.5">
                      <Link to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        onClick={() => setUserMenu(false)}>
                        <SettingsIcon className="w-3.5 h-3.5" />الإعدادات
                      </Link>
                      {isAdmin && (
                        <Link to="/admin/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-brand-600 hover:bg-brand-50 transition-colors"
                          onClick={() => setUserMenu(false)}>
                          <Shield className="w-3.5 h-3.5" />لوحة الأدمن
                        </Link>
                      )}
                      <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="w-3.5 h-3.5" />تسجيل الخروج
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">© 2026 تيتيانو — Inventory & CRM System</p>
          <p className="text-[11px] text-slate-300 font-medium">v2.0</p>
        </footer>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 modal-overlay" onClick={() => setMobile(false)} />
          <div
            className="fixed inset-y-0 right-0 sidebar flex flex-col anim-slide-right"
            style={{ width: 260 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl grad-brand flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-black text-slate-900">تيتيانو</span>
              </div>
              <button className="btn-icon" onClick={() => setMobile(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <SidebarInner />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

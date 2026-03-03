import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./store/authStore";
import Layout from "./components/Layout";
import ToastContainer from "./components/ToastContainer";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import DailyReports from "./pages/DailyReports";
import Settings from "./pages/Settings";
import BrandSettings from "./pages/BrandSettings";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import TeamManagement from "./pages/admin/TeamManagement";
import AdminReports from "./pages/admin/AdminReports";
import ShopifySettings from "./pages/admin/ShopifySettings";
import ShopifyGuide from "./pages/ShopifyGuide";
import ShopifyCallbackPage from "./pages/ShopifyCallbackPage";
import NotFound from "./pages/NotFound";
import { Zap } from "lucide-react";

// ── Loading screen ───────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl grad-brand shadow-2xl animate-pulse">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white">نظام الجرد</h1>
          <p className="text-sm font-medium text-slate-400">جاري التحميل...</p>
        </div>
        <div className="w-12 h-1 bg-gradient-to-r from-brand-500 to-shopify-500 rounded-full mx-auto animate-pulse" />
      </div>
    </div>
  );
}

// ── Protected route ──────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

// ── Admin-only route ─────────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// ── Permission guard route ────────────────────────────────
function PermRoute({
  children,
  perm,
}: {
  children: React.ReactNode;
  perm: string;
}) {
  const { user, loading, hasPermission, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(perm)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">
          غير مصرح بالوصول
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          ليس لديك صلاحية لعرض هذه الصفحة.
        </p>
        <a href="/" className="btn-primary text-xs">
          العودة للرئيسية
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { isAdmin } = useAuthStore();
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <div dir="rtl" className="bg-white">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Shopify Callback */}
          <Route path="/shopify/callback" element={<ShopifyCallbackPage />} />

          {/* Main App */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route index element={<HomeRoute />} />

            {/* Inventory */}
            <Route
              path="inventory"
              element={
                <PermRoute perm="can_view_inventory">
                  <Inventory />
                </PermRoute>
              }
            />

            {/* Orders */}
            <Route
              path="orders"
              element={
                <PermRoute perm="can_view_orders">
                  <Orders />
                </PermRoute>
              }
            />

            {/* Reports */}
            <Route
              path="reports"
              element={
                <PermRoute perm="can_submit_reports">
                  <DailyReports />
                </PermRoute>
              }
            />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/brands" element={<BrandSettings />} />

            {/* Help */}
            <Route path="shopify-guide" element={<ShopifyGuide />} />

            {/* Admin Routes */}
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Navigate to="/admin/dashboard" replace />
                </AdminRoute>
              }
            />
            <Route
              path="admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="admin/teams"
              element={
                <AdminRoute>
                  <TeamManagement />
                </AdminRoute>
              }
            />
            <Route
              path="admin/reports"
              element={
                <AdminRoute>
                  <AdminReports />
                </AdminRoute>
              }
            />
            <Route
              path="admin/shopify"
              element={
                <AdminRoute>
                  <ShopifySettings />
                </AdminRoute>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
}

export default App;

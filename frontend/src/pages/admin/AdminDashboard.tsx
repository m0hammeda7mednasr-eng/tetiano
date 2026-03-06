import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileText,
  Package,
  Shield,
  ShoppingCart,
  Users,
} from "lucide-react";
import api from "../../lib/api";

interface Overview {
  products_total: number;
  orders_total: number;
  customers_total: number;
  reports_total: number;
  members_total: number;
  low_stock_total: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/api/app/dashboard/overview");
        setOverview(data?.overview || null);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to load dashboard overview.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <AlertTriangle className="w-4 h-4" />
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 anim-fade-up">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-brand-500" />
          <span className="section-label">Store Admin</span>
        </div>
        <h1 className="page-title">Store Administration</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <Package className="w-5 h-5 text-brand-600 mb-2" />
          <p className="text-2xl font-black">{overview?.products_total || 0}</p>
          <p className="text-xs text-slate-500">Products</p>
        </div>
        <div className="stat-card">
          <ShoppingCart className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-black">{overview?.orders_total || 0}</p>
          <p className="text-xs text-slate-500">Orders</p>
        </div>
        <div className="stat-card">
          <Users className="w-5 h-5 text-cyan-600 mb-2" />
          <p className="text-2xl font-black">{overview?.members_total || 0}</p>
          <p className="text-xs text-slate-500">Store Members</p>
        </div>
        <div className="stat-card">
          <FileText className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-2xl font-black">{overview?.reports_total || 0}</p>
          <p className="text-xs text-slate-500">Reports</p>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-2">
        <Link to="/admin/users" className="btn-primary text-xs">
          Manage Users
        </Link>
        <Link to="/settings" className="btn-secondary text-xs">
          Shopify Settings
        </Link>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, refreshProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, pass);
      await refreshProfile();
      const { isAdmin } = useAuthStore.getState();
      navigate(isAdmin ? "/admin/dashboard" : "/");
    } catch {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page px-4" dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-72 h-72 bg-brand-100/60 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-violet-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-shopify-100/30 rounded-full blur-2xl" />
      </div>

      <div className="w-full max-w-sm relative anim-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl grad-brand shadow-brand-lg mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            مرحبًا بعودتك
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">
            سجل دخولك لإدارة النظام
          </p>
        </div>

        <div className="auth-card p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="alert-error anim-shake text-sm font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="section-label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pr-9"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="section-label">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="input pr-9 pl-9"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  تسجيل الدخول
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 font-medium">
              ليس لديك حساب؟{" "}
              <Link
                to="/signup"
                className="font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                إنشاء حساب جديد
              </Link>
            </p>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
          <p className="text-[11px] text-slate-400 font-medium">
            نظام محمي ومشفر • Tetiano v2
          </p>
        </div>
      </div>
    </div>
  );
}

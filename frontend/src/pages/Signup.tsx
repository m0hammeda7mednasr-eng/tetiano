import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Mail, Lock, User, UserPlus } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, refreshProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp(email, password, fullName);
      await refreshProfile();
      const { user } = useAuthStore.getState();
      if (!user) {
        navigate("/login");
        return;
      }
      navigate("/settings");
    } catch (err: any) {
      setError(err.message || "فشل إنشاء الحساب. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-cairo"
      dir="rtl"
    >
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent inline-block">
            Tetiano
          </h1>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">إنشاء حساب جديد</h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">كل حساب جديد يتم إنشاء متجر مستقل له تلقائيًا، ثم تربطه بـ Shopify وتبدأ إدارة بياناتك.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm font-bold text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="group">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-black text-gray-700 mb-1.5 group-focus-within:text-brand-600 transition-colors"
                >
                  الاسم الكامل
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all"
                    placeholder="أحمد محمد"
                  />
                </div>
              </div>

              <div className="group">
                <label
                  htmlFor="email"
                  className="block text-sm font-black text-gray-700 mb-1.5 group-focus-within:text-brand-600 transition-colors"
                >
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="group">
                <label
                  htmlFor="password"
                  className="block text-sm font-black text-gray-700 mb-1.5 group-focus-within:text-brand-600 transition-colors"
                >
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pr-11 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all"
                    placeholder="8 characters minimum"
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 px-4 bg-brand-600 text-white rounded-2xl text-sm font-black hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 transition-all shadow-lg shadow-brand-100 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>إنشاء الحساب</span>
                  <UserPlus className="w-4 h-4 mr-2" />
                </>
              )}
            </button>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">بعد إنشاء الحساب سنجهز متجرك الفارغ تلقائيًا لتبدأ الربط والمزامنة مباشرة.</p>
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-500 font-medium">
                لديك حساب بالفعل؟{" "}
                <Link
                  to="/login"
                  className="font-black text-brand-600 hover:text-brand-700 transition-colors"
                >
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

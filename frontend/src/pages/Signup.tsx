import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../lib/supabase";
import { Mail, Lock, User, UserPlus, ShieldAlert, CheckCircle } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const { signUp } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const checkBootstrapState = async () => {
      const { count, error: countError } = await supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true });

      if (countError) {
        setError("تعذر التحقق من حالة التسجيل.");
      } else {
        setBootstrapOpen((count || 0) === 0);
      }

      setChecking(false);
    };

    checkBootstrapState();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp(email, password, fullName);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "فشل إنشاء الحساب. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="auth-page px-4" dir="rtl">
        <div className="auth-card p-8 w-full max-w-md text-center">
          <p className="text-sm font-bold text-slate-500">جارٍ التحقق...</p>
        </div>
      </div>
    );
  }

  if (!bootstrapOpen) {
    return (
      <div className="auth-page px-4" dir="rtl">
        <div className="w-full max-w-md relative anim-fade-up">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-100/40 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-brand-100/40 rounded-full blur-3xl" />
          </div>

          <div className="auth-card p-7 sm:p-8 text-center space-y-6 relative">
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7 text-amber-600" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-black text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                التسجيل الذاتي متوقف
              </div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                إنشاء الحسابات من لوحة الأدمن فقط
              </h1>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                تم إعداد النظام بالفعل. إضافة أي حساب جديد تتم عبر لوحة الإدارة مع
                تحديد الدور والصلاحيات.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-right space-y-2.5">
              <p className="text-[11px] font-black tracking-[0.12em] text-slate-400 uppercase">
                خطوات سريعة
              </p>
              <div className="flex items-start gap-2 text-sm font-medium text-slate-700">
                <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                سجّل الدخول بحساب الأدمن.
              </div>
              <div className="flex items-start gap-2 text-sm font-medium text-slate-700">
                <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                افتح إدارة المستخدمين من لوحة التحكم.
              </div>
              <div className="flex items-start gap-2 text-sm font-medium text-slate-700">
                <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                أنشئ الحساب وحدد الفريق والدور المناسب.
              </div>
            </div>

            <div className="space-y-2">
              <Link to="/login" className="btn-primary justify-center w-full py-3">
                الذهاب إلى تسجيل الدخول
              </Link>
              <p className="text-xs text-slate-500 font-medium">
                إذا كنت تحتاج حسابًا جديدًا، تواصل مع مسؤول النظام الحالي.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            إنشاء أول حساب أدمن
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            أول حساب يتم إنشاؤه سيكون مدير النظام بالكامل.
          </p>
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
                    placeholder="6 أحرف على الأقل"
                    minLength={6}
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
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                بعد تسجيل الدخول سيتم تحويلك مباشرة إلى لوحة الأدمن.
              </p>
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

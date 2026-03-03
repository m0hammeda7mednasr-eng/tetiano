import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useToastStore } from "../store/toastStore";
import { CheckCircle, AlertTriangle, Loader } from "lucide-react";

export default function ShopifyCallbackPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("جاري معالجة الربط مع Shopify...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const shop = searchParams.get("shop");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(`خطأ: ${error}`);
          addToast(`خطأ: ${error}`, "error");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        if (!code || !shop) {
          setStatus("error");
          setMessage("بيانات الربط ناقصة");
          addToast("بيانات الربط ناقصة", "error");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        // Send callback to backend
        const response = await api.post("/api/shopify/callback", {
          code,
          shop,
          state,
        });

        setStatus("success");
        setMessage("تم الربط مع Shopify بنجاح! 🎉");
        addToast("تم الربط مع Shopify بنجاح!", "success");

        // Redirect to settings after 2 seconds
        setTimeout(() => navigate("/settings?connected=true"), 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.error || "فشل الربط مع Shopify");
        addToast("فشل الربط مع Shopify", "error");
        setTimeout(() => navigate("/settings"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, addToast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {status === "loading" && (
          <div className="card text-center space-y-6 py-12">
            <Loader className="w-12 h-12 text-brand-500 mx-auto animate-spin" />
            <div>
              <h1 className="text-xl font-black text-slate-900 mb-2">
                جاري الربط مع Shopify
              </h1>
              <p className="text-sm text-slate-500">{message}</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="card text-center space-y-6 py-12">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 mb-2">
                نجحت العملية!
              </h1>
              <p className="text-sm text-slate-500">{message}</p>
              <p className="text-xs text-slate-400 mt-4">
                جاري إعادة التوجيه...
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="card text-center space-y-6 py-12">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 mb-2">
                حدث خطأ
              </h1>
              <p className="text-sm text-slate-500">{message}</p>
              <button
                onClick={() => navigate("/settings")}
                className="mt-6 btn-brand w-full"
              >
                العودة إلى الإعدادات
              </button>
              <p className="text-xs text-slate-400 mt-4">
                جاري إعادة التوجيه تلقائياً...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

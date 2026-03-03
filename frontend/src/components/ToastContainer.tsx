import { useToastStore } from "../store/toastStore";
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const iconColors = {
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-amber-600",
    info: "text-blue-600",
  };

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 space-y-3 max-w-sm"
      dir="rtl"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[t.type]} shadow-lg anim-slide-up`}
        >
          <div className={iconColors[t.type]}>{icons[t.type]}</div>
          <p className="text-sm font-semibold flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

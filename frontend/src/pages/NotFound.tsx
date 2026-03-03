import { Link } from 'react-router-dom';
import { Home, ArrowRight, Frown } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4" dir="rtl">
            <div className="text-center max-w-md anim-fade-up">
                {/* Illustration */}
                <div className="relative mx-auto w-32 h-32 mb-6">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center">
                        <Frown className="w-16 h-16 text-brand-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-100 border-2 border-white flex items-center justify-center">
                        <span className="text-sm font-black text-red-500">!</span>
                    </div>
                </div>

                {/* Code */}
                <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-violet-500 mb-3">404</p>

                {/* Text */}
                <h1 className="text-xl font-black text-slate-800 mb-2">الصفحة غير موجودة</h1>
                <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                    الصفحة التي تبحث عنها لا وجود لها أو تم نقلها.<br />
                    تحقق من الرابط أو عد إلى الصفحة الرئيسية.
                </p>

                {/* CTA */}
                <Link to="/" className="btn-primary inline-flex gap-2">
                    <Home className="w-4 h-4" />العودة للرئيسية
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

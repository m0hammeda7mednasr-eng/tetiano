import { useState } from 'react';
import {
    ShoppingBag, CheckCircle, ChevronDown, ChevronUp,
    ExternalLink, Copy, Check, Shield, Zap,
    ArrowLeft, ArrowRight, Globe, Key, Lock,
    Package, Users, ShoppingCart, BarChart3,
    AlertCircle, Info, BookOpen, HelpCircle, Play
} from 'lucide-react';

const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const FRONTEND_BASE_URL =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
const SHOPIFY_CALLBACK_URL = `${BACKEND_BASE_URL}/api/shopify/callback`;
const SHOPIFY_WEBHOOK_URL = `${BACKEND_BASE_URL}/api/webhooks/shopify`;

/* ── Helpers ──────────────────────────────────────────────── */
function CodeBlock({ code, label }: { code: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    return (
        <div className="rounded-xl overflow-hidden border border-slate-200" dir="ltr">
            {label && (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-[11px] font-mono text-slate-400">{label}</span>
                    <button onClick={copy} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors">
                        {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
                    </button>
                </div>
            )}
            <pre className="px-4 py-3 bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
        </div>
    );
}

type TipType = 'info' | 'warning' | 'success';
function Tip({ children, type = 'info' }: { children: React.ReactNode; type?: TipType }) {
    const map = {
        info: { cls: 'bg-brand-50 border-brand-200 text-brand-700', Icon: Info, icCls: 'text-brand-500' },
        warning: { cls: 'bg-amber-50 border-amber-200 text-amber-800', Icon: AlertCircle, icCls: 'text-amber-500' },
        success: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: CheckCircle, icCls: 'text-emerald-500' },
    };
    const { cls, Icon, icCls } = map[type];
    return (
        <div className={`flex gap-3 p-3 rounded-xl border ${cls}`}>
            <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${icCls}`} />
            <p className="text-xs font-medium leading-relaxed">{children}</p>
        </div>
    );
}

function CheckItem({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2.5 py-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-sm text-slate-700 font-medium leading-relaxed">{children}</span>
        </div>
    );
}

function SubStep({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-black flex items-center justify-center mt-0.5">{num}</div>
            <div className="flex-1 space-y-2">
                <p className="text-sm font-black text-slate-800">{title}</p>
                <div className="space-y-2 text-sm text-slate-600">{children}</div>
            </div>
        </div>
    );
}

function ScopeTable() {
    const scopes = [
        { scope: 'read_orders', reason: 'لقراءة بيانات الطلبات', Icon: Package },
        { scope: 'write_orders', reason: 'لتحديث حالة الطلبات', Icon: Package },
        { scope: 'read_customers', reason: 'لقراءة بيانات العملاء', Icon: Users },
        { scope: 'write_customers', reason: 'لتحديث بيانات العملاء', Icon: Users },
        { scope: 'read_checkouts', reason: 'لقراءة العربات المتروكة', Icon: ShoppingCart },
        { scope: 'read_analytics', reason: 'لعرض الإحصائيات', Icon: BarChart3 },
    ];
    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">الصلاحية</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">السبب</span>
            </div>
            {scopes.map((s, i) => (
                <div key={i} className={`grid grid-cols-2 px-4 py-2.5 items-center gap-2 ${i < scopes.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-brand-50 border border-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <s.Icon className="w-3 h-3 text-brand-600" />
                        </div>
                        <code className="text-[11px] font-mono text-slate-700 font-bold" dir="ltr">{s.scope}</code>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{s.reason}</span>
                </div>
            ))}
        </div>
    );
}

/* ── FAQ Data ─────────────────────────────────────────────── */
const FAQ_ITEMS = [
    { q: 'هل أحتاج إلى خطة Shopify مدفوعة؟', a: 'لا، يمكنك استخدام أي خطة Shopify حتى Trial أو Development Store من Shopify Partners (مجاني تماماً).' },
    { q: 'هل يمكنني ربط أكثر من متجر؟', a: 'نعم! كل فريق في النظام يمكنه ربط متجر Shopify خاص به.' },
    { q: 'هل المزامنة فورية؟', a: 'نعم! باستخدام Webhooks، البيانات تُزامن خلال ثوانٍ من حدوث أي حدث في Shopify.' },
    { q: 'هل بياناتي آمنة؟', a: 'جميع الاتصالات مُشفّرة (HTTPS). Access Tokens مُخزّنة بشكل آمن. نستخدم OAuth 2.0 مع HMAC Signature للـ Webhooks.' },
    { q: 'ماذا يحدث إذا فُصل الربط؟', a: 'البيانات القديمة تبقى في النظام، لكن لن تُزامن الطلبات الجديدة. يمكنك إعادة الربط في أي وقت من الإعدادات.' },
    { q: 'كم يستغرق إعداد التكامل؟', a: '5 دقائق لإنشاء التطبيق + دقيقتان للربط + دقيقة للـ Webhooks = ~10 دقائق فقط.' },
];

/* ── Troubleshooting Data ────────────────────────────────── */
const PROBLEMS = [
    { title: 'Failed to connect to Shopify', causes: ['API Key أو Secret Key خاطئ', 'Shop Domain خاطئ', 'التطبيق غير مُفعّل'], solution: 'تحقق من بيانات الاعتماد في Shopify Partners وتأكد من Shop Domain بدون https://' },
    { title: 'Invalid HMAC signature', causes: ['Webhook Secret غير صحيح أو غير موجود'], solution: 'احصل على Webhook Secret من Shopify Admin وأضفه لـ .env: SHOPIFY_WEBHOOK_SECRET=your_secret' },
    { title: 'الطلبات لا تظهر في النظام', causes: ['Webhooks غير مُنشأة', 'Webhook URL خاطئ', 'الباك إند متوقف'], solution: 'تحقق من Webhooks في Shopify Admin وتأكد من URL الصحيح.' },
    { title: 'Access token expired', causes: ['Access Token انتهت صلاحيته'], solution: 'اذهب للإعدادات → Disconnect من Shopify → ثم Connect مرة أخرى.' },
];

/* ── Steps Content ────────────────────────────────────────── */
interface StepDef {
    id: number;
    title: string;
    subtitle: string;
    Icon: React.ElementType;
    color: string;
    Content: React.FC;
}

const STEPS: StepDef[] = [
    {
        id: 1, title: 'إنشاء تطبيق Shopify', subtitle: 'أنشئ تطبيقاً في Shopify Partners',
        Icon: ShoppingBag, color: '#7aab2e',
        Content: () => (
            <div className="space-y-5">
                <Tip type="info">
                    تحتاج إلى حساب Shopify Partners مجاني.{' '}
                    <a href="https://partners.shopify.com/signup" target="_blank" rel="noreferrer" className="underline font-bold">سجّل هنا</a>.
                </Tip>
                <div className="space-y-4">
                    <SubStep num={1} title="الدخول إلى Shopify Partners">
                        <p>اذهب إلى <a href="https://partners.shopify.com" target="_blank" rel="noreferrer" className="text-brand-600 font-bold underline">partners.shopify.com</a> وسجّل دخولك.</p>
                        <p>من القائمة الجانبية اختر <strong>"Apps"</strong> ثم اضغط <strong>"Create app"</strong>.</p>
                    </SubStep>
                    <SubStep num={2} title='اختر "Create app manually"'>
                        <p>اختر الخيار اليدوي لتتحكم في كل الإعدادات.</p>
                    </SubStep>
                    <SubStep num={3} title="أدخل بيانات التطبيق">
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            {[{ label: 'App name', val: 'CRM Integration' }, { label: 'App URL', val: FRONTEND_BASE_URL }].map((r, i) => (
                                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? 'border-b border-slate-100' : ''}`}>
                                    <span className="text-[11px] font-black text-slate-400 w-24 shrink-0">{r.label}</span>
                                    <code className="text-xs font-mono text-slate-700 flex-1" dir="ltr">{r.val}</code>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">في حقل <strong>Allowed redirection URLs</strong> أضف:</p>
                        <CodeBlock label="Redirect URIs" code={SHOPIFY_CALLBACK_URL} />
                    </SubStep>
                    <SubStep num={4} title='اضغط "Create app"'>
                        <p>سيتم إنشاء التطبيق وستُفتح صفحة إعداداته.</p>
                    </SubStep>
                </div>
            </div>
        ),
    },
    {
        id: 2, title: 'تفعيل الصلاحيات', subtitle: 'حدّد الصلاحيات التي يحتاجها التطبيق',
        Icon: Shield, color: '#6366f1',
        Content: () => (
            <div className="space-y-5">
                <Tip type="info">الصلاحيات تُحدّد ما يمكن للتطبيق فعله في متجرك.</Tip>
                <div className="space-y-4">
                    <SubStep num={1} title='اذهب إلى "Configuration" → "Admin API access scopes"'>
                        <p>في صفحة التطبيق، اضغط على تبويب <strong>"Configuration"</strong>.</p>
                    </SubStep>
                    <SubStep num={2} title="اختر الصلاحيات التالية">
                        <ScopeTable />
                    </SubStep>
                    <SubStep num={3} title='اضغط "Save"'>
                        <Tip type="success">✅ الصلاحيات محفوظة بنجاح</Tip>
                    </SubStep>
                </div>
            </div>
        ),
    },
    {
        id: 3, title: 'الحصول على بيانات الاعتماد', subtitle: 'احصل على API Key و API Secret',
        Icon: Key, color: '#f59e0b',
        Content: () => (
            <div className="space-y-5">
                <SubStep num={1} title='اذهب إلى "Client credentials"'>
                    <p>في صفحة التطبيق، ابحث عن قسم <strong>"Client credentials"</strong>.</p>
                </SubStep>
                <SubStep num={2} title="احفظ بيانات الاعتماد">
                    <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-amber-100 border-b border-amber-200">
                            <p className="text-[11px] font-black text-amber-700">بيانات مطلوبة</p>
                        </div>
                        {[
                            { label: 'Client ID (API Key)', desc: 'معرّف التطبيق' },
                            { label: 'Client Secret (API Secret)', desc: 'المفتاح السري (يظهر مرة واحدة)' },
                            { label: 'Shop Domain', desc: 'مثال: mystore.myshopify.com' },
                        ].map((r, i) => (
                            <div key={i} className={`flex flex-col px-4 py-3 ${i < 2 ? 'border-b border-amber-100' : ''}`}>
                                <p className="text-xs font-black text-amber-800">{r.label}</p>
                                <p className="text-[11px] text-amber-600">{r.desc}</p>
                            </div>
                        ))}
                    </div>
                </SubStep>
                <Tip type="warning">احتفظ بـ Client Secret في مكان آمن — لا يمكن استرجاعه لاحقاً!</Tip>
            </div>
        ),
    },
    {
        id: 4, title: 'ربط المتجر بالنظام', subtitle: 'أدخل البيانات واربط عبر OAuth',
        Icon: Lock, color: '#ec4899',
        Content: () => (
            <div className="space-y-5">
                <div className="bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-xl p-4">
                    <p className="text-xs font-black text-brand-700 mb-2">كيف يعمل OAuth؟</p>
                    {['تضغط "ربط Shopify" في صفحة الإعدادات', 'يُوجّهك النظام إلى Shopify للموافقة', 'Shopify يرسل Access Token للنظام', 'النظام يحفظ التوكن ويبدأ المزامنة'].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 mt-1.5">
                            <div className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</div>
                            <span className="text-xs text-brand-700 font-medium">{s}</span>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <SubStep num={1} title="افتح صفحة الإعدادات">
                        <a href="/settings" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 underline">
                            <Globe className="w-3.5 h-3.5" />اذهب إلى الإعدادات ←
                        </a>
                    </SubStep>
                    <SubStep num={2} title="أدخل بيانات Shopify في قسم الإعدادات">
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            {[
                                { label: 'API Key', ph: 'Client ID من Shopify Partners' },
                                { label: 'API Secret Key', ph: 'Client Secret من Shopify Partners' },
                                { label: 'Shop Domain', ph: 'mystore.myshopify.com (بدون https://)' },
                            ].map((f, i) => (
                                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < 2 ? 'border-b border-slate-100' : ''}`}>
                                    <span className="text-[11px] font-black text-slate-400 w-28 shrink-0">{f.label}</span>
                                    <span className="text-xs text-slate-400 italic">{f.ph}</span>
                                </div>
                            ))}
                        </div>
                    </SubStep>
                    <SubStep num={3} title='اضغط "Save Settings" ثم "Connect to Shopify"'>
                        <p>احفظ الإعدادات أولاً، ثم اضغط على زر الربط وستُوجَّه إلى Shopify.</p>
                        <p>اضغط <strong>"Install app"</strong> للموافقة على الصلاحيات.</p>
                    </SubStep>
                    <SubStep num={4} title="تأكيد الاتصال">
                        <Tip type="success">بعد الموافقة، ستعود للنظام وسيظهر ✅ Connected to Shopify مع بيانات المتجر.</Tip>
                    </SubStep>
                </div>
            </div>
        ),
    },
    {
        id: 5, title: 'إعداد Webhooks', subtitle: 'فعّل المزامنة الفورية مع Shopify',
        Icon: Zap, color: '#06b6d4',
        Content: () => (
            <div className="space-y-5">
                <Tip type="info">Webhooks تُرسل إشعارات فورية من Shopify عند وقوع أحداث مثل طلب جديد أو عربة متروكة.</Tip>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-black text-slate-800 mb-2">الطريقة الأولى: تلقائي (موصى به)</p>
                        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-2">
                            <p className="text-xs text-emerald-800 font-medium">بعد الربط الناجح، اضغط <strong>"Setup Webhooks"</strong> في صفحة الإعدادات:</p>
                            {['Orders/Create', 'Checkouts/Create', 'Checkouts/Update'].map((w, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    <code className="text-xs font-mono text-emerald-700" dir="ltr">{w} Webhook</code>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800 mb-2">الطريقة الثانية: يدوي</p>
                        <div className="space-y-3">
                            {[
                                { event: 'Order creation', url: SHOPIFY_WEBHOOK_URL },
                                { event: 'Checkout creation', url: SHOPIFY_WEBHOOK_URL },
                                { event: 'Checkout update', url: SHOPIFY_WEBHOOK_URL },
                            ].map((w, i) => (
                                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                                        <span className="text-[11px] font-black text-slate-600">Event: {w.event}</span>
                                    </div>
                                    <CodeBlock code={w.url} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 6, title: 'اختبار التكامل', subtitle: 'تحقق من أن كل شيء يعمل بشكل صحيح',
        Icon: Play, color: '#10b981',
        Content: () => (
            <div className="space-y-5">
                <div className="space-y-4">
                    <SubStep num={1} title="اختبار مزامنة الطلبات">
                        <p>أنشئ طلباً تجريبياً في Shopify Admin → Orders → Create order.</p>
                        <p>افتح صفحة Orders في النظام، يجب أن يظهر الطلب خلال ثوانٍ:</p>
                        {['رقم الطلب صحيح', 'اسم العميل صحيح', 'المبلغ الإجمالي صحيح', 'حالة الطلب صحيحة'].map((c, i) => (
                            <CheckItem key={i}>{c}</CheckItem>
                        ))}
                    </SubStep>
                    <SubStep num={2} title="اختبار العربات المتروكة">
                        <p>افتح متجرك في وضع التصفح الخفي، أضف منتجاً للعربة، أدخل بياناتك، ثم أغلق الصفحة.</p>
                        <p>ستظهر العربة في النظام خلال دقائق.</p>
                    </SubStep>
                    <SubStep num={3} title="اختبار Webhooks مباشرة">
                        <p>من Shopify Admin → Settings → Notifications → Webhooks، اضغط "Send test notification":</p>
                        <CodeBlock label="Expected Response" code={`{\n  "message": "Webhook accepted",\n  "mode": "production"\n}`} />
                    </SubStep>
                </div>
            </div>
        ),
    },
];

/* ── Main ─────────────────────────────────────────────────── */
export default function ShopifyGuide() {
    const [activeStep, setActiveStep] = useState<number | null>(0);
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    return (
        <div className="space-y-8 anim-fade-up max-w-3xl mx-auto" dir="rtl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-shopify-500" />
                    <span className="section-label">Shopify Integration Guide</span>
                </div>
                <h1 className="page-title">دليل ربط Shopify</h1>
                <p className="page-subtitle">خطوات واضحة وشاملة لربط متجرك بالنظام في أقل من 10 دقائق</p>
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { Icon: Package, label: 'مزامنة الطلبات', color: '#6366f1' },
                    { Icon: Users, label: 'إدارة العملاء', color: '#8b5cf6' },
                    { Icon: ShoppingCart, label: 'العربات المتروكة', color: '#06b6d4' },
                    { Icon: Zap, label: 'مزامنة فورية', color: '#10b981' },
                ].map((c, i) => (
                    <div key={i} className="card p-4 flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${c.color}18` }}>
                            <c.Icon className="w-5 h-5" style={{ color: c.color }} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">{c.label}</p>
                    </div>
                ))}
            </div>

            {/* CTA banner */}
            <div className="card p-4 flex items-center gap-4 border-brand-200 bg-brand-50">
                <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-black text-brand-800">وقت الإعداد: ~10 دقائق</p>
                    <p className="text-xs text-brand-600">5 د إنشاء التطبيق + 2 د الربط + 1 د Webhooks</p>
                </div>
                <a href="/settings" className="btn-primary text-xs flex-shrink-0">ابدأ الآن →</a>
            </div>

            {/* Steps */}
            <div>
                <p className="section-label mb-4">الخطوات</p>
                <div className="space-y-3">
                    {STEPS.map((step, idx) => {
                        const open = activeStep === idx;
                        const { Content } = step;
                        return (
                            <div key={step.id} className="card overflow-hidden">
                                <button
                                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-right"
                                    onClick={() => setActiveStep(open ? null : idx)}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                                        style={{ background: step.color, boxShadow: `0 4px 12px ${step.color}40` }}>
                                        <step.Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 text-right min-w-0">
                                        <span className="text-[10px] font-black text-slate-300">الخطوة {step.id}</span>
                                        <p className="text-sm font-black text-slate-800 leading-tight">{step.title}</p>
                                        <p className="text-[11px] text-slate-400 font-medium">{step.subtitle}</p>
                                    </div>
                                    {open
                                        ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    }
                                </button>
                                {open && (
                                    <div className="px-5 pb-5 border-t border-slate-100 pt-5">
                                        <Content />
                                        <div className="flex justify-between mt-5 pt-4 border-t border-slate-100">
                                            <button disabled={idx === 0} onClick={() => setActiveStep(idx - 1)} className="btn-secondary text-xs disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowRight className="w-3.5 h-3.5" />السابق
                                            </button>
                                            <button disabled={idx === STEPS.length - 1} onClick={() => setActiveStep(idx + 1)} className="btn-primary text-xs disabled:opacity-30 disabled:cursor-not-allowed">
                                                التالي<ArrowLeft className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Troubleshooting */}
            <div>
                <p className="section-label mb-4">استكشاف الأخطاء</p>
                <div className="space-y-3">
                    {PROBLEMS.map((p, i) => (
                        <div key={i} className="card overflow-hidden">
                            <div className="px-5 py-4 flex items-center gap-3">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <p className="text-sm font-black text-slate-800 flex-1">{p.title}</p>
                            </div>
                            <div className="px-5 pb-4 space-y-2 border-t border-slate-100 pt-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">الأسباب المحتملة</p>
                                    <div className="space-y-1">
                                        {p.causes.map((c, ci) => (
                                            <div key={ci} className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                <p className="text-xs text-slate-600">{c}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">الحل</p>
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{p.solution}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ */}
            <div>
                <p className="section-label mb-4">الأسئلة الشائعة</p>
                <div className="space-y-2">
                    {FAQ_ITEMS.map((f, i) => {
                        const open = activeFaq === i;
                        return (
                            <div key={i} className="card overflow-hidden">
                                <button
                                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-right"
                                    onClick={() => setActiveFaq(open ? null : i)}
                                >
                                    <HelpCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
                                    <span className="flex-1 text-sm font-bold text-slate-800 text-right">{f.q}</span>
                                    {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                </button>
                                {open && (
                                    <div className="px-5 pb-4 border-t border-slate-100 pt-3">
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{f.a}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Links */}
            <div className="card p-5">
                <p className="section-label mb-3">روابط مفيدة</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                        { label: 'Shopify Partners Dashboard', url: 'https://partners.shopify.com' },
                        { label: 'Shopify API Documentation', url: 'https://shopify.dev/docs/api' },
                        { label: 'Backend Health Check', url: `${BACKEND_BASE_URL}/health` },
                        { label: 'Frontend (CRM)', url: FRONTEND_BASE_URL },
                    ].map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-brand-200 transition-colors group">
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500" />
                            <span className="text-xs font-bold text-slate-700 flex-1 truncate">{l.label}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Footer CTA */}
            <div className="rounded-2xl p-6 text-center text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-90" />
                <h3 className="text-lg font-black mb-1">جاهز للربط؟</h3>
                <p className="text-sm text-white/80 mb-4">اتبع الخطوات أعلاه وابدأ في مزامنة بيانات Shopify خلال دقائق.</p>
                <a href="/settings"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-brand-700 rounded-xl text-sm font-black hover:bg-brand-50 transition-colors shadow-lg">
                    <Zap className="w-4 h-4" />اذهب للإعدادات وابدأ
                </a>
            </div>
        </div>
    );
}

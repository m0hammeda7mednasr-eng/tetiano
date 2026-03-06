# 🤝 دليل المساهمة - Contributing Guide

شكراً لاهتمامك بالمساهمة في Tetiano Inventory System! هذا الدليل سيساعدك على البدء.

---

## 📋 جدول المحتويات

- [قواعد السلوك](#-قواعد-السلوك)
- [كيف أساهم؟](#-كيف-أساهم)
- [معايير الكود](#-معايير-الكود)
- [عملية Pull Request](#-عملية-pull-request)
- [البنية المعمارية](#-البنية-المعمارية)
- [الاختبار](#-الاختبار)

---

## 📜 قواعد السلوك

### نتوقع من الجميع:

- ✅ الاحترام المتبادل
- ✅ التواصل البنّاء
- ✅ التركيز على ما هو أفضل للمشروع
- ✅ إظهار التعاطف مع أعضاء المجتمع الآخرين

### غير مقبول:

- ❌ اللغة أو الصور الجنسية
- ❌ التعليقات المسيئة أو الشخصية
- ❌ المضايقة العامة أو الخاصة
- ❌ نشر معلومات خاصة للآخرين

---

## 🚀 كيف أساهم؟

### 1. أنواع المساهمات

#### 🐛 الإبلاغ عن Bugs

قبل إنشاء bug report:
- تحقق من [Issues الموجودة](https://github.com/your-repo/issues)
- تأكد من أنك تستخدم آخر إصدار
- جمع معلومات عن المشكلة

عند إنشاء bug report، أضف:
- **عنوان واضح ووصفي**
- **خطوات إعادة إنتاج المشكلة**
- **السلوك المتوقع**
- **السلوك الفعلي**
- **Screenshots** (إن أمكن)
- **معلومات البيئة** (OS, Browser, Node version)

#### ✨ اقتراح Features

قبل اقتراح feature:
- تحقق من [Roadmap](./CHANGELOG.md#unreleased)
- تأكد من أن الـ feature يتماشى مع أهداف المشروع

عند اقتراح feature، أضف:
- **عنوان واضح ووصفي**
- **وصف تفصيلي للـ feature**
- **لماذا هذا الـ feature مفيد؟**
- **أمثلة على الاستخدام**
- **Mockups أو Wireframes** (إن أمكن)

#### 📝 تحسين Documentation

Documentation دائماً يحتاج تحسين! يمكنك:
- إصلاح أخطاء إملائية
- توضيح تعليمات غامضة
- إضافة أمثلة
- ترجمة Documentation

#### 💻 المساهمة بالكود

راجع [معايير الكود](#-معايير-الكود) أدناه.

---

### 2. إعداد بيئة التطوير

#### المتطلبات:
```bash
- Node.js 18+
- npm أو yarn
- Git
- حساب Supabase (للتطوير المحلي)
```

#### الخطوات:

```bash
# 1. Fork المشروع على GitHub

# 2. Clone الـ fork
git clone https://github.com/YOUR_USERNAME/tetiano.git
cd tetiano

# 3. أضف upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/tetiano.git

# 4. إعداد Backend
cd backend
npm install
cp .env.example .env
# عدّل .env بمعلوماتك
npm run dev

# 5. إعداد Frontend (في terminal جديد)
cd frontend
npm install
cp .env.example .env
# عدّل .env بمعلوماتك
npm run dev
```

---

## 📐 معايير الكود

### TypeScript

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  // Implementation
};

// ❌ Bad
const getUser = async (id: any) => {
  // No return type, using any
};
```

### Naming Conventions

```typescript
// Components: PascalCase
const UserProfile = () => { };

// Functions: camelCase
const getUserById = () => { };

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = "https://api.example.com";

// Interfaces: PascalCase with I prefix (optional)
interface IUserProfile { }

// Types: PascalCase
type UserRole = "admin" | "staff";
```

### File Structure

```
frontend/src/
├── components/       # Reusable components
│   ├── Button.tsx
│   └── Modal.tsx
├── pages/           # Page components
│   ├── Dashboard.tsx
│   └── Login.tsx
├── lib/             # Utilities & helpers
│   ├── api.ts
│   └── utils.ts
├── store/           # State management
│   └── authStore.ts
└── types/           # TypeScript types
    └── index.ts

backend/src/
├── routes/          # API routes
│   ├── admin.ts
│   └── inventory.ts
├── middleware/      # Express middleware
│   ├── auth.ts
│   └── errorHandler.ts
├── services/        # Business logic
│   └── shopify.ts
├── utils/           # Utilities
│   └── logger.ts
└── types/           # TypeScript types
    └── index.ts
```

### Comments

```typescript
// ✅ Good - توضيح WHY، ليس WHAT
// Using exponential backoff to avoid rate limiting
const retryWithBackoff = async () => { };

// ❌ Bad - توضيح الواضح
// This function adds two numbers
const add = (a: number, b: number) => a + b;
```

### Error Handling

```typescript
// ✅ Good
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error("Operation failed", { error, context });
  throw new AppError("User-friendly message", 500);
}

// ❌ Bad
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.log(error); // No proper logging
  throw error; // Re-throwing without context
}
```

### API Responses

```typescript
// ✅ Good - Consistent structure
res.json({
  success: true,
  data: { users },
  message: "Users fetched successfully"
});

res.status(400).json({
  success: false,
  error: "Invalid input",
  details: validationErrors
});

// ❌ Bad - Inconsistent
res.json(users); // No structure
res.json({ error: "Something went wrong" }); // No status code
```

---

## 🔄 عملية Pull Request

### 1. قبل البدء

```bash
# تأكد من أن branch الرئيسي محدث
git checkout main
git pull upstream main

# أنشئ branch جديد
git checkout -b feature/amazing-feature
# أو
git checkout -b fix/bug-description
```

### 2. أثناء التطوير

```bash
# Commit بشكل متكرر مع رسائل واضحة
git add .
git commit -m "feat: add user profile page"

# اتبع Conventional Commits:
# feat: ميزة جديدة
# fix: إصلاح bug
# docs: تحديث documentation
# style: تنسيق الكود (لا يؤثر على الوظيفة)
# refactor: إعادة هيكلة الكود
# test: إضافة أو تحديث tests
# chore: مهام صيانة
```

### 3. قبل إنشاء PR

```bash
# تأكد من أن الكود يعمل
npm run build
npm run lint

# تأكد من عدم وجود conflicts
git fetch upstream
git rebase upstream/main

# Push للـ fork
git push origin feature/amazing-feature
```

### 4. إنشاء Pull Request

في GitHub:

1. اذهب إلى fork الخاص بك
2. اضغط "New Pull Request"
3. اختر base: main ← compare: feature/amazing-feature
4. أضف عنوان واضح ووصف مفصل:

```markdown
## Description
وصف مختصر للتغييرات

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
كيف تم اختبار التغييرات؟

## Screenshots (إن وجدت)

## Checklist
- [ ] الكود يتبع معايير المشروع
- [ ] تم اختبار التغييرات
- [ ] تم تحديث Documentation
- [ ] لا توجد warnings جديدة
```

### 5. بعد إنشاء PR

- انتظر المراجعة
- استجب للتعليقات بسرعة
- قم بالتعديلات المطلوبة
- كن صبوراً ومحترماً

---

## 🏗️ البنية المعمارية

### Frontend Architecture

```
React Component
    ↓
Zustand Store (State Management)
    ↓
API Client (axios)
    ↓
Backend API
```

### Backend Architecture

```
Express Route
    ↓
Middleware (Auth, Validation)
    ↓
Controller/Handler
    ↓
Service Layer (Business Logic)
    ↓
Supabase Client
    ↓
Database
```

### Database Schema

راجع `docs/architecture.md` للتفاصيل الكاملة.

---

## 🧪 الاختبار

### Running Tests

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend
npm run test

# E2E tests
npm run test:e2e
```

### Writing Tests

```typescript
// ✅ Good test
describe("getUserById", () => {
  it("should return user when ID exists", async () => {
    const user = await getUserById("123");
    expect(user).toBeDefined();
    expect(user.id).toBe("123");
  });

  it("should throw error when ID not found", async () => {
    await expect(getUserById("invalid")).rejects.toThrow();
  });
});
```

---

## 📞 الحصول على المساعدة

إذا كنت بحاجة لمساعدة:

1. راجع [Documentation](./docs/)
2. ابحث في [Issues الموجودة](https://github.com/your-repo/issues)
3. اسأل في [Discussions](https://github.com/your-repo/discussions)
4. تواصل مع الفريق

---

## 🎉 شكراً!

مساهمتك تجعل Tetiano أفضل! 🚀

---

**آخر تحديث**: 6 مارس 2026

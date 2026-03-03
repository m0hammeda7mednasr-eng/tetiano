# 🔐 دليل حماية Access Tokens من GitHub

## ⚠️ المشكلة
إذا رفعت الكود على GitHub والـ `.env` files فيها tokens، أي حد يقدر يشوفها ويستخدمها!

## ✅ الحل (3 خطوات)

---

## الخطوة 1: إضافة `.gitignore`

### تأكد إن عندك `.gitignore` في root المشروع:

```gitignore
# Environment variables (IMPORTANT!)
.env
.env.local
.env.development
.env.production
*.env

# Frontend env
frontend/.env
frontend/.env.local
frontend/.env.development
frontend/.env.production

# Backend env
backend/.env
backend/.env.local
backend/.env.development
backend/.env.production

# Dependencies
node_modules/
frontend/node_modules/
backend/node_modules/

# Build outputs
dist/
build/
frontend/dist/
backend/dist/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
.cache/
```

---

## الخطوة 2: إنشاء `.env.example` files

### في `backend/.env.example`:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Server Configuration
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Shopify Configuration (Optional)
SHOPIFY_REDIRECT_URI=http://localhost:3002/api/shopify/callback
```

### في `frontend/.env.example`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration
VITE_API_URL=http://localhost:3002

# Admin Configuration (Optional)
VITE_ADMIN_INVITE_CODE=your-secret-code
VITE_SUPER_ADMIN_EMAIL=admin@example.com
```

---

## الخطوة 3: إزالة الملفات الحساسة من Git

### إذا رفعت `.env` files بالغلط:

```bash
# 1. إزالة الملفات من Git (بدون حذفها من جهازك)
git rm --cached backend/.env
git rm --cached frontend/.env

# 2. Commit التغييرات
git add .gitignore
git commit -m "Remove sensitive .env files and add .gitignore"

# 3. Push للـ GitHub
git push origin main
```

### ⚠️ مهم جداً:
إذا كانت الـ tokens اتسربت بالفعل على GitHub:
1. **غير كل الـ tokens فوراً!**
2. روح Supabase Dashboard → Settings → API
3. اعمل Regenerate للـ keys
4. حدث الـ `.env` files المحلية بالـ keys الجديدة

---

## الخطوة 4: التحقق من الأمان

### تأكد إن الملفات الحساسة مش موجودة:

```bash
# شوف الملفات اللي هتترفع
git status

# تأكد إن .env مش موجود
git ls-files | grep .env
```

إذا ظهر `.env` في النتيجة، معناها لسه موجود في Git!

---

## 🔒 Best Practices

### 1. استخدم Environment Variables في Production

**Vercel (Frontend):**
- Dashboard → Project → Settings → Environment Variables
- أضف كل المتغيرات من `.env.example`

**Render/Fly.io (Backend):**
- Dashboard → Environment → Environment Variables
- أضف كل المتغيرات من `.env.example`

### 2. لا تشارك الـ tokens أبداً

❌ **لا تفعل:**
- ترفع `.env` على GitHub
- تكتب tokens في الكود مباشرة
- تشارك tokens في screenshots
- تكتب tokens في comments

✅ **افعل:**
- استخدم `.env` files محلياً فقط
- استخدم Environment Variables في Production
- شارك `.env.example` بدون قيم حقيقية
- استخدم secrets management tools

### 3. راجع الـ `.gitignore` دائماً

قبل أي commit:
```bash
git status
```

تأكد إن مفيش ملفات حساسة في القائمة!

---

## 🚨 إذا تسربت Tokens

### الخطوات الفورية:

1. **غير الـ tokens فوراً:**
   - Supabase: Regenerate API Keys
   - Shopify: Regenerate Access Tokens
   - أي service تاني

2. **امسح الـ Git History:**
```bash
# استخدم BFG Repo-Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# أو استخدم git filter-branch (صعب)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all
```

3. **Force Push:**
```bash
git push origin --force --all
```

⚠️ **تحذير:** Force push خطير! تأكد إن مفيش حد تاني شغال على الـ repo.

---

## 📋 Checklist قبل Push

- [ ] `.gitignore` موجود وصحيح
- [ ] `.env` files مش في Git
- [ ] `.env.example` موجود بدون قيم حقيقية
- [ ] `git status` مفيهوش ملفات حساسة
- [ ] كل الـ tokens في `.env` فقط
- [ ] مفيش tokens في الكود

---

## 🔧 أدوات مساعدة

### 1. git-secrets
يمنع commit الـ secrets:
```bash
# Install
brew install git-secrets  # Mac
# أو
git clone https://github.com/awslabs/git-secrets

# Setup
git secrets --install
git secrets --register-aws
```

### 2. GitHub Secret Scanning
GitHub بيكشف الـ tokens تلقائياً ويبعتلك تنبيه.

### 3. .env Validator
أضف script في `package.json`:
```json
{
  "scripts": {
    "check-env": "node -e \"require('fs').existsSync('.env') && console.log('⚠️  .env file exists!') || console.log('✅ No .env file')\""
  }
}
```

---

## 📚 موارد إضافية

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git: gitignore documentation](https://git-scm.com/docs/gitignore)
- [Supabase: Security best practices](https://supabase.com/docs/guides/platform/security)

---

## ✅ الخلاصة

1. **دائماً استخدم `.gitignore`**
2. **لا ترفع `.env` files أبداً**
3. **استخدم `.env.example` للمشاركة**
4. **غير الـ tokens فوراً إذا تسربت**
5. **استخدم Environment Variables في Production**

**أمان المشروع مسؤوليتك! 🔐**

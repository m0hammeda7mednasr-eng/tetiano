# 🚀 دليل رفع المشروع على GitHub

هذا الدليل يشرح كيفية رفع المشروع على GitHub بشكل احترافي.

---

## 📋 قبل البدء

### ✅ Checklist

تأكد من:
- [ ] تم تحديث جميع الملفات
- [ ] `.env` files غير موجودة في المشروع (محمية بـ `.gitignore`)
- [ ] `.env.example` files موجودة
- [ ] لا توجد credentials أو secrets في الكود
- [ ] Documentation محدث
- [ ] الكود يعمل محلياً

---

## 🔐 تنظيف Secrets

### 1. تحقق من عدم وجود Secrets

```bash
# ابحث عن أي secrets محتملة
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" . --exclude-dir=node_modules
grep -r "shpat_" . --exclude-dir=node_modules
grep -r "service_role" . --exclude-dir=node_modules

# تأكد من أن .env محمي
cat .gitignore | grep ".env"
```

### 2. نظف Git History (إذا كانت هناك commits سابقة)

```bash
# إذا كنت قد commit secrets سابقاً، استخدم:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# أو استخدم BFG Repo-Cleaner (أسرع):
# https://rtyley.github.io/bfg-repo-cleaner/
```

---

## 📦 إعداد Git Repository

### 1. Initialize Git (إذا لم يكن موجوداً)

```bash
# في مجلد المشروع الرئيسي
git init
```

### 2. تحقق من .gitignore

```bash
# تأكد من أن .gitignore يحتوي على:
cat .gitignore

# يجب أن يحتوي على:
# - .env
# - node_modules/
# - dist/
# - build/
# - secrets/
# - credentials/
```

### 3. Add Files

```bash
# أضف جميع الملفات
git add .

# تحقق من الملفات المضافة
git status

# تأكد من عدم وجود .env files
git status | grep ".env"
# يجب أن يظهر فقط .env.example
```

---

## 💾 Commit Changes

### 1. Initial Commit

```bash
# Commit أول
git commit -m "feat: initial commit - Tetiano Inventory System v1.0.0

- Complete frontend with React + TypeScript + Tailwind
- Complete backend with Node.js + Express + TypeScript
- Supabase integration with RLS policies
- Shopify OAuth integration
- Admin dashboard with full CRUD
- Comprehensive documentation
- Production-ready (95%)

See PRODUCTION_STATUS_REPORT.md for details."
```

### 2. Verify Commit

```bash
# تحقق من الـ commit
git log --oneline

# تحقق من الملفات في الـ commit
git show --name-only
```

---

## 🌐 إنشاء GitHub Repository

### Option 1: عبر GitHub Website

1. اذهب إلى https://github.com/new
2. أدخل:
   - **Repository name**: `tetiano-inventory-system`
   - **Description**: `🏪 Professional inventory management system with Shopify integration`
   - **Visibility**: Private (أو Public حسب الرغبة)
3. **لا تضف** README, .gitignore, أو license (موجودين بالفعل)
4. اضغط "Create repository"

### Option 2: عبر GitHub CLI

```bash
# إذا كان لديك GitHub CLI مثبت
gh repo create tetiano-inventory-system \
  --private \
  --description "🏪 Professional inventory management system with Shopify integration" \
  --source=. \
  --remote=origin
```

---

## 📤 Push إلى GitHub

### 1. Add Remote

```bash
# أضف GitHub repository كـ remote
git remote add origin https://github.com/YOUR_USERNAME/tetiano-inventory-system.git

# أو إذا كنت تستخدم SSH:
git remote add origin git@github.com:YOUR_USERNAME/tetiano-inventory-system.git

# تحقق من الـ remote
git remote -v
```

### 2. Push Main Branch

```bash
# Push الـ main branch
git branch -M main
git push -u origin main

# إذا واجهت مشكلة، استخدم force (فقط في المرة الأولى):
# git push -u origin main --force
```

### 3. Verify Push

```bash
# تحقق من أن الـ push نجح
git log --oneline
git remote show origin
```

---

## 🏷️ إضافة Tags

### 1. Create Version Tag

```bash
# أضف tag للإصدار الأول
git tag -a v1.0.0 -m "Release v1.0.0 - Production Ready (95%)

Features:
- Complete frontend and backend
- Shopify OAuth integration
- Admin dashboard
- Comprehensive documentation

Known Issues:
- SUPABASE_SERVICE_KEY needs update in Railway

See CHANGELOG.md for full details."

# Push الـ tag
git push origin v1.0.0
```

### 2. Create Release on GitHub

1. اذهب إلى repository على GitHub
2. اضغط "Releases" → "Create a new release"
3. اختر tag: `v1.0.0`
4. أضف:
   - **Release title**: `v1.0.0 - Production Ready`
   - **Description**: انسخ من CHANGELOG.md
5. اضغط "Publish release"

---

## 📝 تحديث README على GitHub

### 1. أضف Badges

في أول README.md، أضف:

```markdown
[![Production](https://img.shields.io/badge/Production-Live-green)](https://tetiano.vercel.app)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](https://github.com/YOUR_USERNAME/tetiano-inventory-system/releases)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)
```

### 2. أضف Screenshots

```bash
# أضف مجلد screenshots
mkdir -p docs/screenshots

# أضف screenshots للـ:
# - Login page
# - Dashboard
# - Shopify Settings
# - Admin panel

# Commit
git add docs/screenshots/
git commit -m "docs: add screenshots"
git push
```

---

## 🔒 حماية Branches

### في GitHub Repository Settings:

1. اذهب إلى **Settings** → **Branches**
2. أضف branch protection rule لـ `main`:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

---

## 🚀 Continuous Integration (Optional)

### إضافة GitHub Actions

```bash
# أنشئ workflow file
mkdir -p .github/workflows
```

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Backend Dependencies
      run: cd backend && npm ci
    
    - name: Lint Backend
      run: cd backend && npm run lint
    
    - name: Build Backend
      run: cd backend && npm run build
    
    - name: Install Frontend Dependencies
      run: cd frontend && npm ci
    
    - name: Lint Frontend
      run: cd frontend && npm run lint
    
    - name: Build Frontend
      run: cd frontend && npm run build
```

```bash
# Commit workflow
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
git push
```

---

## 📊 Repository Settings

### في GitHub Repository:

1. **About** (في الصفحة الرئيسية):
   - Description: `🏪 Professional inventory management system with Shopify integration`
   - Website: `https://tetiano.vercel.app`
   - Topics: `inventory`, `shopify`, `react`, `typescript`, `nodejs`, `supabase`

2. **Features**:
   - ✅ Issues
   - ✅ Projects
   - ✅ Wiki (optional)
   - ❌ Sponsorships (unless needed)

3. **Security**:
   - Enable Dependabot alerts
   - Enable Dependabot security updates

---

## 🔄 Future Updates

### للتحديثات المستقبلية:

```bash
# 1. عدّل الملفات

# 2. Stage changes
git add .

# 3. Commit مع رسالة واضحة
git commit -m "feat: add new feature"
# أو
git commit -m "fix: resolve bug in admin panel"

# 4. Push
git push origin main

# 5. إذا كان release جديد، أضف tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

---

## ⚠️ تحذيرات مهمة

### ❌ لا تفعل:

1. **لا ترفع .env files**:
   ```bash
   # تأكد دائماً:
   git status | grep ".env"
   # يجب ألا يظهر .env (فقط .env.example)
   ```

2. **لا ترفع node_modules**:
   ```bash
   # تأكد من .gitignore
   cat .gitignore | grep "node_modules"
   ```

3. **لا ترفع credentials**:
   - Service keys
   - Access tokens
   - API secrets
   - Passwords

4. **لا تستخدم force push** (إلا في حالات خاصة):
   ```bash
   # ❌ تجنب:
   git push --force
   
   # ✅ استخدم بدلاً منه:
   git pull --rebase
   git push
   ```

### ✅ افعل:

1. **Commit بشكل متكرر** مع رسائل واضحة
2. **استخدم branches** للـ features الجديدة
3. **اكتب documentation** جيد
4. **راجع الكود** قبل الـ push
5. **اختبر محلياً** قبل الـ push

---

## 📞 المساعدة

إذا واجهت مشاكل:

1. راجع [Git Documentation](https://git-scm.com/doc)
2. راجع [GitHub Docs](https://docs.github.com)
3. استخدم `git status` لفهم الحالة الحالية
4. استخدم `git log` لرؤية التاريخ

---

## ✅ Checklist النهائي

قبل الـ push النهائي:

- [ ] تم تنظيف جميع secrets
- [ ] .gitignore محدث
- [ ] .env.example موجود
- [ ] README.md محدث
- [ ] CHANGELOG.md محدث
- [ ] Documentation كامل
- [ ] الكود يعمل محلياً
- [ ] لا توجد warnings
- [ ] Commit messages واضحة
- [ ] Remote مضاف بشكل صحيح
- [ ] Push نجح
- [ ] Repository settings محدثة

---

**جاهز للرفع! 🚀**

```bash
# الأوامر النهائية:
git add .
git commit -m "feat: initial commit - Tetiano v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tetiano-inventory-system.git
git push -u origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

**آخر تحديث**: 6 مارس 2026

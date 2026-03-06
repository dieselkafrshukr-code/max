# 🌊 EL TOUFAN — متجر الملابس الكامل

## الهيكل
```
eltoufan/
├── backend/          ← Node.js + Express + SQLite
│   ├── server.js     ← الباك إند الكامل
│   ├── package.json
│   └── uploads/      ← صور المنتجات (يتعمل تلقائي)
└── frontend/
    ├── index.html    ← المتجر الرئيسي
    └── admin.html    ← لوحة التحكم
```

---

## 🚀 تشغيل المشروع

### 1. تثبيت المكتبات
```bash
cd backend
npm install
```

### 2. تشغيل السيرفر
```bash
npm start
# أو للتطوير:
npm run dev
```

السيرفر هيشتغل على: **http://localhost:3001**

### 3. افتح الفرونت إند
افتح `frontend/index.html` في المتصفح.

> **ملحوظة:** لأن الفرونت إند بيكلم localhost مباشرة، لو عايز تحطهم على نفس السيرفر:
```bash
# في server.js أضف:
app.use(express.static('../frontend'));
```

---

## 🔑 بيانات الدخول

### لوحة التحكم (`admin.html`)
| الحساب | كلمة المرور | الصلاحيات |
|--------|-------------|-----------|
| admin@eltoufan.com | admin123 | سوبر أدمن (كل شيء) |
| orders@eltoufan.com | orders123 | الطلبات فقط |
| store@eltoufan.com | store123 | المنتجات + الأقسام + الشحن + الكوبونات |

---

## 🌐 API Endpoints

### Auth
- `POST /api/auth/login` — تسجيل الدخول
- `GET /api/auth/me` — بيانات المستخدم الحالي
- `PUT /api/auth/change-password` — تغيير كلمة المرور

### Categories
- `GET /api/categories` — كل الأقسام
- `POST /api/categories` — إضافة قسم
- `DELETE /api/categories/:id` — حذف قسم وفروعه

### Products
- `GET /api/products?category_id=&search=` — جلب المنتجات
- `POST /api/products` — إضافة منتج
- `PUT /api/products/:id` — تعديل منتج
- `PATCH /api/products/:id/toggle` — إخفاء/إظهار
- `DELETE /api/products/:id` — حذف
- `POST /api/upload` — رفع صورة (بيضغطها Sharp تلقائياً)

### Orders
- `POST /api/orders` — إنشاء طلب جديد
- `GET /api/orders` — جلب الطلبات (admin)
- `GET /api/orders/stats` — إحصائيات
- `PUT /api/orders/:id/status` — تحديث الحالة
- `GET /api/orders/stream` — Server-Sent Events للإشعارات الفورية

### Coupons
- `POST /api/coupons/validate` — التحقق من كوبون
- `GET /api/coupons` — عرض الكوبونات (admin)
- `POST /api/coupons` — إضافة كوبون

### Shipping
- `GET /api/shipping` — أسعار الشحن
- `PUT /api/shipping` — تحديث الأسعار

### Settings
- `GET /api/settings` — إعدادات الموقع
- `PUT /api/settings` — تحديث الإعدادات

---

## 🗄️ قاعدة البيانات (SQLite)

الملف: `backend/eltoufan.db` (بيتعمل تلقائياً)

الجداول:
- `users` — المستخدمين والأدمن
- `categories` — الأقسام (شجرة)
- `products` — المنتجات
- `orders` — الطلبات
- `coupons` — كوبونات الخصم
- `shipping_rates` — أسعار شحن المحافظات
- `settings` — إعدادات الموقع

---

## ✨ المميزات

### الفرونت إند
- ✅ إنترو سينمائي (GSAP + Canvas)
- ✅ شجرة تنقل ديناميكية (قطاعي/جملة → أقسام → منتجات)
- ✅ Lazy Loading للصور والمنتجات
- ✅ Product Caching في الميموري
- ✅ سلة تسوق كاملة مع Drawer
- ✅ نظام كوبونات (نسبة/مبلغ)
- ✅ نموذج طلب كامل مع واتساب
- ✅ مفضلة (localStorage)
- ✅ Chatbot بـ 18 intent
- ✅ Dark/Light Mode
- ✅ Arabic/English (RTL/LTR)
- ✅ PWA ready
- ✅ شريط إعلانات real-time
- ✅ وضع الصيانة
- ✅ تسجيل الدخول

### الداشبورد
- ✅ 3 مستويات صلاحيات
- ✅ إحصائيات مباشرة (يوم/أسبوع/شهر)
- ✅ إدارة طلبات كاملة مع تفاصيل
- ✅ SSE للإشعارات الفورية + صوت
- ✅ إدارة منتجات (add/edit/toggle/delete)
- ✅ رفع صور مع ضغط تلقائي
- ✅ إدارة أقسام (شجرة)
- ✅ أسعار شحن لكل محافظة
- ✅ كوبونات مع عداد استخدام
- ✅ إعدادات الموقع

---

## 🛠️ للنشر على السيرفر

```bash
# 1. على الـ VPS أو Render أو Railway
git clone ...
cd backend && npm install

# 2. تغيير JWT_SECRET
export JWT_SECRET="your-super-secret-key-here"

# 3. تشغيل
node server.js

# أو بـ PM2
pm2 start server.js --name eltoufan
```

# Face Swap AI - Web Application

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
</p>

> تطبيق ويب متقدم لاستبدال الوجوه باستخدام تقنية الذكاء الاصطناعي

## 📋 وصف المشروع

هذا التطبيق يتيح للمستخدمين استبدال وجوههم مع أي شخصية في أي فيديو باستخدام تقنيات الذكاء الاصطناعي المتقدمة. يتميز بواجهة مستخدم سلسة وسهلة الاستخدام.

## ✨ المميزات

- 🎨 واجهة مستخدم عربية أنيقة
- 🤖 تقنية ذكاء اصطناعي متقدمة
- ⚡ معالجة سريعة
- 🔒 خصوصية وأمان
- 📱 تصميم متجاوب يعمل على جميع الأجهزة
- 🎬 دعم صيغ متعددة (MP4, WebM, PNG, JPG)

## 🚀 البدء السريع

### المتطلبات

- Node.js 18 أو أحدث
- npm أو yarn

### التثبيت

```bash
# استنساخ المشروع
git clone <repository-url>
cd face-swap-app

# تثبيت الاعتماديات
npm install

# نسخ ملف البيئة
cp .env.example .env

# تعديل ملف .env وإضافة API key
# افتح .env وأضف مفتاح API الخاص بك
```

### الحصول على API Key

لتفعيل功能 استبدال الوجوه، تحتاج إلى مفتاح API من أحد مزودي الخدمات:

1. **DeepAI** - [https://deepai.org](https://deepai.org)
   - سجّل حساب جديد
   - احصل على API key مجاني
   - أضفه في `.env`:
     ```
     DEEP_AI_API_KEY=your_key_here
     ```

### التشغيل

```bash
# تشغيل في وضع التطوير
npm run dev

# أو تشغيل في وضع الإنتاج
npm start
```

افتح المتصفح على: [http://localhost:3000](http://localhost:3000)

## 📁 هيكل المشروع

```
face-swap-app/
├── public/
│   ├── index.html      # الصفحة الرئيسية
│   ├── styles.css      # الأنماط CSS
│   └── script.js       # JavaScript للواجهة
├── uploads/            # ملفات الرفع المؤقتة
├── outputs/            # ملفات النتائج
├── server.js          # خادم Node.js
├── package.json       # الاعتماديات
├── .env               # متغيرات البيئة
└── README.md          # التوثيق
```

## 🔧 التكوين

### متغيرات البيئة (.env)

| المتغير | الوصف | القيمة الافتراضية |
|---------|-------|-------------------|
| PORT | منفذ الخادم | 3000 |
| DEEP_AI_API_KEY | مفتاح DeepAI API | - |
| MAX_FILE_SIZE | الحد الأقصى لحجم الملف (بايت) | 52428800 (50MB) |

## 🌐 API Endpoints

### GET /api/health
التحقق من حالة الخادم

### POST /api/face-swap
استبدال الوجوه

**البيانات المطلوبة (FormData):**
- `sourceImage`: ملف الصورة (مطلوب)
- `targetVideo`: ملف الفيديو (مطلوب)

**الاستجابة:**
```json
{
  "success": true,
  "message": "Face swap completed successfully",
  "result": {
    "videoUrl": "/outputs/result-xxx.mp4"
  }
}
```

### GET /api/cleanup
حذف الملفات القديمة (يمكن جدولته)

## 🎯 كيفية الاستخدام

1. **ارفع صورتك الشخصية** - اختر صورة واضحة لوجهك
2. **اختر الفيديو المستهدف** - حدد الفيديو الذي تريد استبدال الوجه فيه
3. **اضغط على زر الاستبدال** - انتظر حتى اكتمال المعالجة
4. **حمّل النتيجة** - شاهد الفيديو الجديد وقم بتحميله

## 🔐 الأمان والخصوصية

- جميع الملفات المرفوعة يتم حذفها تلقائياً بعد المعالجة
- لا يتم مشاركة أي بيانات مع أطراف ثالثة
- استخدام HTTPS للاتصال الآمن

## 🛠️ التطوير

### إضافة مزود جديد لـ Face Swap API

لتغيير مزود API، عدّل دالة `performFaceSwap` في `server.js`:

```javascript
async function performFaceSwap(sourceImagePath, targetVideoPath) {
    // استخدم أي مزود API هنا
    // مثل: MyButtons, FaceSwap API, إلخ
}
```

## 📝 الترخيص

MIT License

## 👨‍💻 المطور

MiniMax Agent

---

Made with ❤️ for amazing face swap experiences

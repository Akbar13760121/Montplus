// Service Worker — سیستم صدور فیش A5 (MONT+)
// نکته: هر بار نسخه جدیدی از سایت منتشر کردی، شماره نسخه پایین را یکی زیاد کن
// (مثلاً fish-a5-v3) تا مرورگر کاربران نسخه تازه را بگیرد.
const CACHE = 'fish-a5-v24';

// فایل‌های اصلی خود سایت — نبود هرکدام یعنی نصب انجام نشود
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// کتابخانه‌های خارجی (ساخت PDF) — اگر موقع نصب در دسترس نبودند، نصب سرویس‌ورکر
// نباید fail شود؛ بعداً با اولین اجرای آنلاین به‌صورت خودکار کش می‌شوند.
const CDN_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(CORE_FILES);
      // کش CDNها به‌صورت best-effort: خطای یکی، بقیه و کل نصب را خراب نمی‌کند
      await Promise.allSettled(CDN_FILES.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((response) => {
          // هر فایل موفقی که آنلاین گرفته شد (فونت، کتابخانه و...) برای استفاده آفلاین کش می‌شود
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return response;
        })
        .catch(() => {
          // آفلاین و بدون کش: برای باز کردن صفحه، نسخه کش‌شده index تحویل داده می‌شود
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
    })
  );
});

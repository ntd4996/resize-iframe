# Embed React - Auto Iframe Component

Dự án Next.js với component iframe tự động điều chỉnh chiều cao theo nội dung.

## 🚀 Tính năng

- ✅ Component `AutoIframe` tự động điều chỉnh chiều cao theo nội dung
- ✅ Hỗ trợ cross-domain với API proxy
- ✅ Transition mượt mà khi thay đổi chiều cao
- ✅ TypeScript support
- ✅ Tự động detect thay đổi DOM với MutationObserver

## 📦 Cài đặt

```bash
npm install
```

## 🏃 Chạy dự án

```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

## 📁 Cấu trúc

```
├── components/
│   └── AutoIframe.tsx      # Component iframe tự động
├── pages/
│   ├── api/
│   │   └── embed.ts        # API proxy server-side
│   ├── index.tsx           # Trang demo
│   └── _app.tsx            # App wrapper
├── styles/
│   └── globals.css         # Global styles
└── package.json
```

## 🧩 Cách sử dụng

```tsx
import AutoIframe from '@/components/AutoIframe';

<AutoIframe src="https://example.com/embed" />
```

## 🔧 Công nghệ

- Next.js 14
- React 18
- TypeScript
- Cheerio (HTML parsing)


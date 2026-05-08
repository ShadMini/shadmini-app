'use client';

import { useSession } from 'next-auth/react';
// ... باقي الاستيرادات كما هي

export default function Home() {
  const { data: session, status } = useSession();
  const [chats, setChats] = useState<Record<string, Chat>>({});
  // ... باقي الحالات

  // ✅ عرض مؤشر تحميل أثناء فحص الجلسة
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#212121]">
        <div className="text-center text-gray-400">
          <div className="mb-4 animate-spin text-4xl">⏳</div>
          <p>جارٍ تحميل الجلسة...</p>
        </div>
      </div>
    );
  }

  // 🔴 لا تظهر شاشة تسجيل الدخول إلا بعد التأكد من عدم وجود جلسة
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#212121] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-[#7c5cfc] to-[#e879f9] bg-clip-text text-transparent">
            ShadMini AI
          </h1>
          <p className="mt-4 text-gray-400">يرجى تسجيل الدخول للمتابعة</p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-lg bg-[#10a37f] px-6 py-3 font-semibold text-white transition hover:bg-[#0d8f6e]"
          >
            تسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  // ... باقي الواجهة للتطبيق (بعد تسجيل الدخول)
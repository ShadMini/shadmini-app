'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function LoginButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt="الصورة الشخصية"
              className="h-8 w-8 rounded-full"
            />
          )}
          <span className="text-sm text-white">{session.user?.name}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          تسجيل خروج
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="rounded-lg bg-[#10a37f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d8f6e]"
    >
      تسجيل الدخول
    </button>
  );
}
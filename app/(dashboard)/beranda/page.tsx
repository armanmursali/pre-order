// app/(dashboard)/beranda/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function BerandaPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Memeriksa sesi pengguna aktif saat halaman dimuat
  useEffect(() => {
    const supabase = createClient();

    async function checkUserSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email || 'Pengguna');
        setLoading(false);
      }
    }

    checkUserSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Memuat data sesi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kartu Sambutan */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          Selamat Datang di Beranda Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Anda masuk menggunakan akun: <span className="font-semibold text-blue-600">{userEmail}</span>
        </p>
      </div>

      {/* Grid Informasi / Statistik Singkat */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Status Sistem</h3>
          <p className="mt-2 text-2xl font-semibold text-green-600">Aktif & Aman</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Autentikasi</h3>
          <p className="mt-2 text-2xl font-semibold text-blue-600">Google OAuth</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Framework</h3>
          <p className="mt-2 text-2xl font-semibold text-purple-600">Next.js & Supabase</p>
        </div>
      </div>
    </div>
  );
}
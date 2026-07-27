'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';


function LoginForm() {
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/beranda';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      const redirectOrigin = window.location.origin;
      const callbackUrl = `${redirectOrigin}/api/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        throw new Error(error.message || 'Terjadi kesalahan saat login dengan Google.');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4 relative overflow-hidden">
      
     
      <div className="absolute w-96 h-96 bg-orange-200/40 rounded-full blur-3xl -top-20 -left-20 -z-0"></div>
      <div className="absolute w-96 h-96 bg-amber-200/40 rounded-full blur-3xl -bottom-20 -right-20 -z-0"></div>

      <div className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-2xl border border-gray-100 z-10 space-y-6">
        
       
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-800 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
            M
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-950 tracking-tight">
            Selamat Datang
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Masuk ke akun Pre-Order PT Mances Anda
          </p>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-700 flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation text-base flex-shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white py-3.5 px-4 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-amber-800 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{loading ? 'Memproses...' : 'Masuk dengan Google'}</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs font-semibold text-amber-800 hover:text-amber-950 transition-colors">
            <i className="fa-solid fa-arrow-left mr-1"></i> Kembali ke Beranda
          </Link>
        </div>

      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-white px-4">
        <div className="flex flex-col items-center gap-3">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-amber-800"></i>
          <p className="text-gray-500 text-xs font-medium">Memuat halaman masuk...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
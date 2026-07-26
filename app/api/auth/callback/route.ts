// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers'; // Mengimpor cookies untuk diberikan sebagai argumen

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    // Mengirimkan cookies() sebagai argumen agar sesuai dengan parameter createClient di utils/supabase/server.ts
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Menukar authorization code dengan sesi pengguna yang aktif
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!sessionError && sessionData.user) {
      const user = sessionData.user;
      const userEmail = user.email || '';
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0];

      // Memeriksa apakah pengguna sudah ada di tabel public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // Jika belum ada, lakukan penyimpanan data pengguna baru secara manual sebagai cadangan
      if (!existingUser) {
        await supabase.from('users').insert({
          id: user.id,
          email: userEmail,
          nama: userName,
          updated_at: new Date().toISOString(),
        });
      }

      // Jika sukses, arahkan pengguna ke halaman /beranda tanpa mengubah logika lain
      return NextResponse.redirect(`${origin}/beranda`);
    }
  }

  // Jika gagal atau tidak ada kode, arahkan kembali ke halaman login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
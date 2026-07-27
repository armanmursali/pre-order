// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  const cookieStore = await cookies();
  
  const queryNext = requestUrl.searchParams.get('next');
  const redirectToCookie = cookieStore.get('redirectTo')?.value;
  
  const next = queryNext ? decodeURIComponent(queryNext) : (redirectToCookie ? decodeURIComponent(redirectToCookie) : '/beranda');
  
  const origin = requestUrl.origin;

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Diabaikan jika dipanggil dari Server Component
            }
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && sessionData?.user) {
      const authUser = sessionData.user;

      // [LOGIKA TAMBAHAN]: Memeriksa dan mengisi password string acak jika belum ada pada tabel kustom users
      try {
        const { data: existingUser, error: fetchUserError } = await supabase
          .from('users')
          .select('id, password, nama')
          .eq('id', authUser.id)
          .maybeSingle();

        if (!fetchUserError) {
          // [PERBAIKAN SINTAKS]: Menghasilkan string acak dengan sintaks substring yang benar
          const generateRandomPassword = () => {
            return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
          };

          if (!existingUser) {
            // Jika baris user di tabel kustom belum ada sama sekali, buat baru dengan password acak
            await supabase.from('users').insert({
              id: authUser.id,
              nama: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Pengguna',
              email: authUser.email || '',
              password: generateRandomPassword(),
              updated_at: new Date().toISOString(),
            });
          } else if (!existingUser.password) {
            // Jika baris sudah ada tetapi kolom password masih kosong/null, perbarui dengan password acak
            await supabase.from('users').update({
              password: generateRandomPassword(),
              updated_at: new Date().toISOString(),
            }).eq('id', authUser.id);
          }
        }
      } catch (dbErr) {
        console.error('Gagal memproses pembuatan password acak user:', dbErr);
      }

      const targetUrl = next.startsWith('http') ? next : `${origin}${next}`;
      const response = NextResponse.redirect(targetUrl);
      response.cookies.delete('redirectTo');
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Gagal melakukan autentikasi dengan Google.`);
}
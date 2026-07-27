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

      
      try {
        const generateRandomPassword = () => {
          return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Date.now().toString(36);
        };

      
        const { data: existingUser, error: fetchErr } = await supabase
          .from('users')
          .select('password')
          .eq('id', authUser.id)
          .maybeSingle();

      
        if (fetchErr || !existingUser || !existingUser.password) {
          const randomPassword = generateRandomPassword();
          const userNama = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Pengguna';
          const userEmail = authUser.email || '';

         
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: authUser.id,
              nama: userNama,
              email: userEmail,
              password: randomPassword,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

          if (upsertError) {
            console.error('Gagal melakukan upsert password users:', upsertError.message);
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

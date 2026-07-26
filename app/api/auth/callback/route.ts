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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
     
      const targetUrl = next.startsWith('http') ? next : `${origin}${next}`;
      const response = NextResponse.redirect(targetUrl);
      response.cookies.delete('redirectTo');
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Gagal melakukan autentikasi dengan Google.`);
}
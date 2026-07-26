import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const hasAuthCode = request.nextUrl.searchParams.has('code');

  const isPublicRoute = path === '/login' || path === '/' || hasAuthCode;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    

    supabaseResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.set('redirectTo', path, { path: '/', httpOnly: true });
    return supabaseResponse;
  }

  if (user && path === '/login' && !hasAuthCode) {
    const nextUrl = request.nextUrl.searchParams.get('next') || request.cookies.get('redirectTo')?.value || '/beranda';
    const url = request.nextUrl.clone();
    url.pathname = nextUrl;
    url.searchParams.delete('next');
    
    supabaseResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.delete('redirectTo');
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // If user is not signed in and the current path is in the protected routes array,
  // redirect the user to /login
  if (!session && (req.nextUrl.pathname.startsWith('/chat') || req.nextUrl.pathname.startsWith('/profile'))) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/chat/:path*', '/profile/:path*']
}; 
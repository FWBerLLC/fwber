import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock middleware to unblock UI testing securely
export function middleware(request: NextRequest) {
  // Only allow test mode if specifically configured via server-side environment variables
  // Never trust client-provided headers or cookies for authentication bypass
  const isTestMode = process.env.E2E_TEST_MODE === 'true';

  const protectedRoutes = ['/dashboard', '/achievements', '/messages', '/settings'];

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    if (isTestMode) {
      console.log(`[Middleware] Test mode bypassing auth for: ${request.nextUrl.pathname}`);

      // We mutate the request headers so downstream Server Components and API routes
      // can detect the mocked auth state securely during E2E tests.
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-mock-auth', 'true');

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // In production/normal mode, if the user doesn't have a valid token (e.g. cookie), redirect to login
    const hasToken = request.cookies.has('token') || request.cookies.has('fwber_auth');
    if (!hasToken) {
       return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/achievements/:path*',
    '/messages/:path*',
    '/settings/:path*',
  ],
};

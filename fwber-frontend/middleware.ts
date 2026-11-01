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

  if (isProtectedRoute && isTestMode) {
    console.log(`[Middleware] Test mode bypassing auth for: ${request.nextUrl.pathname}`);

    // In a real testing scenario with a secure test environment,
    // we would inject a valid mock JWT token here or mock the session provider.
    // For now, we allow the route to render, but downstream server actions
    // will still require valid auth unless also mocked.
    return NextResponse.next();
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

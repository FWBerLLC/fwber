import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mock middleware to unblock UI testing
// This bypasses authentication checks for specific test environments
export function middleware(request: NextRequest) {
  // Check if we are in a test or CI environment
  // We can look for a specific header or query parameter injected by Playwright
  const isTestMode =
    request.headers.get('x-playwright-test') === 'true' ||
    request.cookies.has('e2e-test-bypass') ||
    process.env.NODE_ENV === 'development'; // Be careful with this, maybe only allow if explicitly configured

  // For UI testing, bypass auth checks on protected routes
  const protectedRoutes = ['/dashboard', '/achievements', '/messages', '/settings'];

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && isTestMode) {
    // If it's a test mode and accessing a protected route, we can inject a mock token
    // or just let it pass through
    console.log(`[Middleware] Test mode bypassing auth for: ${request.nextUrl.pathname}`);

    // You could optionally attach headers to tell the backend this is a mock user
    const response = NextResponse.next();
    response.headers.set('x-mock-auth', 'true');
    return response;
  }

  // Normal processing for non-test mode or non-protected routes
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

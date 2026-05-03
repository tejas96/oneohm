import { NextResponse, type NextRequest } from 'next/server';

import { AUTH_ROUTES, PUBLIC_ROUTES, ROUTES } from '@/lib/config/routes';

/**
 * Check if the path matches any of the given routes (prefix match)
 */
function matchesRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Check if the path is a static file or API route
 */
function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.') // Static files like .ico, .png, etc.
  );
}

function shouldRedirectAuthenticatedAuthRoute(request: NextRequest, isAuthRoute: boolean): boolean {
  if (!isAuthRoute) return false;

  const { pathname, searchParams } = request.nextUrl;
  const isOtpVerifyWithPhone =
    pathname === ROUTES.AUTH.OTP_VERIFY && Boolean(searchParams.get('phone'));

  return !isOtpVerifyWithPhone;
}

/**
 * Next.js Middleware
 * Handles server-side authentication routing:
 * - Redirects unauthenticated users from protected routes to /login
 * - Redirects authenticated users from auth routes to /
 */
export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (isStaticOrApi(pathname)) {
    return NextResponse.next();
  }

  // Skip middleware for public routes
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // Get tokens from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const hasAccessToken = Boolean(accessToken);
  const hasRefreshToken = Boolean(refreshToken);

  // Check if it's an auth route (login, otp-verify, etc.)
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);

  // Authenticated user trying to access auth routes -> redirect to home
  if (hasAccessToken && shouldRedirectAuthenticatedAuthRoute(request, isAuthRoute)) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect');
    const destination = redirectUrl || ROUTES.HOME;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Unauthenticated user trying to access protected routes -> redirect to login
  // BUT: If refresh token exists, let the request through so client can refresh
  // The client-side interceptor will handle token refresh on 401
  if (!hasAccessToken && !hasRefreshToken && !isAuthRoute) {
    const loginUrl = new URL(ROUTES.AUTH.LOGIN, request.url);
    // Preserve the original URL for redirect after login
    if (pathname !== ROUTES.HOME) {
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Middleware Configuration
 * Apply middleware to all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};

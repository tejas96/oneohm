import { NextResponse, type NextRequest } from 'next/server';

/**
 * Route Configuration
 * Defines which routes require authentication and which are public auth routes
 */
const AUTH_ROUTES = ['/login', '/otp-verify', '/forgot-password', '/reset-password'];
const PUBLIC_ROUTES = ['/not-found', '/favicon.ico'];

/**
 * Check if the path matches any of the given routes (prefix match)
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Check if the path is a static file or API route
 */
function isStaticOrApi(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files like .ico, .png, etc.
  );
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

  // Get access token from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const hasToken = Boolean(accessToken);

  // Check if it's an auth route (login, otp-verify, etc.)
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);

  // Authenticated user trying to access auth routes -> redirect to home
  if (hasToken && isAuthRoute) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect');
    const destination = redirectUrl || '/';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Unauthenticated user trying to access protected routes -> redirect to login
  if (!hasToken && !isAuthRoute) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the original URL for redirect after login
    if (pathname !== '/') {
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

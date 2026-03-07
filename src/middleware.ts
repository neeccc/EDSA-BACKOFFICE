import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

const publicPages = ["/login"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Run intl middleware first to handle locale routing
  const intlResponse = intlMiddleware(request);

  // Check if this is a public page (strip locale prefix for comparison)
  const pathnameWithoutLocale = routing.locales.reduce(
    (path, locale) =>
      path.startsWith(`/${locale}/`) || path === `/${locale}`
        ? path.replace(`/${locale}`, "") || "/"
        : path,
    pathname
  );

  const isPublicPage = publicPages.some(
    (page) =>
      pathnameWithoutLocale === page ||
      pathnameWithoutLocale.startsWith(`${page}/`)
  );

  if (isPublicPage) {
    return intlResponse;
  }

  // Protected pages — check for session cookie (lightweight edge check)
  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionToken) {
    const locale =
      routing.locales.find((l) => pathname.startsWith(`/${l}`)) ||
      routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

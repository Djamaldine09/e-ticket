import { NextRequest, NextResponse } from "next/server";

const PRIVATE_ROUTES = ["/tickets", "/dashboard", "/events/new"];
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isEventEdit = /^\/events\/[^/]+\/edit(?:\/|$)/.test(pathname);\n  const isPrivate = PRIVATE_ROUTES.some((r) => pathname.startsWith(r)) || isEventEdit;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isPrivate && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/events", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tickets/:path*", "/dashboard/:path*", "/events/new", "/events/:id/edit", "/login", "/register"],
};

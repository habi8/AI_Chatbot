import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth pages
  if (pathname === "/") {
    return NextResponse.next();
  }

  // For protected routes, the server component will handle auth
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*"],
};

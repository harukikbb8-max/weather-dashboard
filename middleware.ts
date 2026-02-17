import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export function middleware(request: NextRequest) {
  const basicAuth = request.headers.get("authorization");

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    if (authValue) {
      try {
        const [user, pass] = atob(authValue).split(":");
        if (user === "admin" && pass === "admin") {
          return NextResponse.next();
        }
      } catch {}
    }
  }

  return new NextResponse("Authentication Required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}

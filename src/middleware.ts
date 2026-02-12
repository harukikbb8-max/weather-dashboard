/**
 * middleware.ts
 * ─────────────
 * 責任: 全ページへのアクセスにパスワード認証を要求する
 *
 * 設計意図:
 *  - Next.js Middleware（Edge Runtime）でリクエストをインターセプト
 *  - 認証済みクッキーがない場合は /login へリダイレクト
 *  - /login と /api/auth はミドルウェアの対象外（無限ループ防止）
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get("wd-auth")?.value === "true";

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * /login と /api/auth と静的ファイルを除外
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

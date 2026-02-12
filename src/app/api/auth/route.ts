/**
 * api/auth/route.ts
 * ─────────────────
 * 責任: パスワード認証エンドポイント
 *
 * POST でパスワードを受け取り、一致すれば認証クッキーをセット
 */

import { NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD || "admin";

export async function POST(request: Request) {
  const body = await request.json();

  if (body.password === SITE_PASSWORD) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("wd-auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7日間
    });
    return response;
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}

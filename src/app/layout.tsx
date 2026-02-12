/**
 * app/layout.tsx
 * ──────────────
 * 責任: アプリケーション全体のHTMLシェルとメタデータ定義
 *
 * 設計意図:
 *  - Next.js App Router のルートレイアウト（全ページ共通のラッパー）
 *  - <html lang="ja"> で日本語コンテンツであることをスクリーンリーダーに通知
 *  - Geist フォント（Vercel制作）を採用: 可読性とモダンさのバランスが良い
 *  - メタデータ（title, description）をここで一元管理
 */

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather Dashboard | 天気ダッシュボード",
  description:
    "都市と指標を選択して時系列の天気情報をチャート表示するダッシュボード。Open-Meteo Forecast API を使用。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

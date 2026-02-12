/**
 * components/Header.tsx
 * ─────────────────────
 * 責任: アプリケーションのヘッダー表示
 *
 * 設計意図:
 *  - ブランディングとアプリのアイデンティティを一箇所に集約
 *  - 状態を持たない純粋な表示コンポーネント（Presentational Component）
 *  - Liquid Glass デザインの最初の印象を決めるコンポーネントとして、
 *    backdrop-filter と微細なボーダーで質感を表現
 */

import { CloudSun } from "lucide-react";

export function Header() {
  return (
    <header className="glass-card px-6 py-4 flex items-center gap-3">
      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
        <CloudSun className="w-7 h-7 text-blue-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          Weather Dashboard
        </h1>
        <p className="text-xs text-white/70">
          Open-Meteo Forecast API
        </p>
      </div>
    </header>
  );
}

/**
 * components/ErrorDisplay.tsx
 * ───────────────────────────
 * 責任: APIエラー時のユーザーフレンドリーなエラー表示
 *
 * 設計意図:
 *  - エラーメッセージをそのまま表示するのではなく、
 *    ユーザーが「次に何をすべきか」を伝えるUIを提供
 *  - リトライボタンで再取得を促す（ネットワーク一時障害への対応）
 */

"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
      <div className="p-3 rounded-full bg-red-500/10 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-white font-medium mb-2">データの取得に失敗しました</h3>
      <p className="text-white/70 text-sm mb-6 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                   bg-white/10 border border-white/20 text-white text-sm font-medium
                   hover:bg-white/15 transition-all cursor-pointer active:scale-95"
      >
        <RefreshCw className="w-4 h-4" />
        再取得
      </button>
    </div>
  );
}

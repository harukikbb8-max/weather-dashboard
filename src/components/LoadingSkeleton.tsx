/**
 * components/LoadingSkeleton.tsx
 * ──────────────────────────────
 * 責任: データ取得中のローディングUIを提供する
 *
 * 設計意図:
 *  - スピナーではなくスケルトンUIを採用
 *    理由: スケルトンは最終的なレイアウトと同じ形状を表示するため、
 *    ユーザーに「何が表示されるか」を予告でき、知覚的な待ち時間を短縮する
 *  - Tailwind の animate-pulse でパルスアニメーションを適用
 *  - チャート部分とカード部分のスケルトンを分けて提供
 */

export function ChartSkeleton() {
  return (
    <div className="glass-card p-6 min-h-[400px]">
      <div className="h-4 w-32 bg-white/10 rounded-lg animate-pulse mb-6" />
      <div className="space-y-3 pt-4">
        {/* グラフ風のスケルトンライン */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-10 bg-white/5 rounded animate-pulse" />
            <div
              className="h-[2px] bg-white/10 rounded animate-pulse"
              style={{ width: `${60 + Math.sin(i) * 25}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CurrentWeatherSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-12 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse" />
      </div>
      <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-16 bg-white/10 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
            <div className="space-y-1">
              <div className="h-2.5 w-8 bg-white/10 rounded animate-pulse" />
              <div className="h-3.5 w-14 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

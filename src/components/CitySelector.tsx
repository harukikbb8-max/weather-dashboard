/**
 * components/CitySelector.tsx
 * ───────────────────────────
 * 責任: 都市の選択UIを提供する
 *
 * 設計意図:
 *  - Controlled Component パターン: 状態は親が管理し、このコンポーネントは
 *    現在の値の表示と変更通知のみを担当する
 *  - CITIES 定数から選択肢を生成するため、都市の追加・削除時に
 *    このコンポーネントの修正は不要（OCP: 開放閉鎖原則）
 *  - <select> 要素を使用しネイティブのアクセシビリティを活用
 *    （カスタムドロップダウンはキーボード操作の再実装が必要になるため避ける）
 */

"use client";

import { MapPin } from "lucide-react";
import { CITIES, type CityId } from "@/types";

interface CitySelectorProps {
  value: CityId;
  onChange: (cityId: CityId) => void;
}

export function CitySelector({ value, onChange }: CitySelectorProps) {
  return (
    <div className="glass-card p-4">
      <label
        htmlFor="city-select"
        className="flex items-center gap-2 text-sm font-medium text-white/90 mb-2"
      >
        <MapPin className="w-4 h-4" />
        都市
      </label>
      <select
        id="city-select"
        value={value}
        onChange={(e) => onChange(e.target.value as CityId)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                   text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50
                   focus:border-blue-500/50 transition-all cursor-pointer
                   appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.7)%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
                   bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
        aria-label="都市を選択"
      >
        {CITIES.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}（{city.nameEn}）
          </option>
        ))}
      </select>
    </div>
  );
}

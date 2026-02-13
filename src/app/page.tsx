/**
 * app/page.tsx
 * ────────────
 * 責任: メインページ — 全コンポーネントの組み立てと状態のリフトアップ先
 *
 * 設計意図:
 *  - このファイルが「アプリケーションの司令塔」
 *    各コンポーネントを配置し、状態を接続する役割のみ持つ
 *  - ビジネスロジック → useWeatherData（フック）
 *    永続化ロジック → useLocalStorage（フック）
 *    API通信 → lib/api.ts
 *    型定義 → types/index.ts
 *    各UIの描画 → components/
 *    …と、責任を各層に委譲している
 *
 *  - 状態のリフトアップ（Lifting State Up）:
 *    city, metrics, viewMode, unitSystem の4つの状態をここで管理し、
 *    子コンポーネントには props で配布する
 *    理由: 複数の子コンポーネントが同じ状態に依存するため
 *
 *  - SkyBackground に weatherCode を渡すことで、
 *    天気連動の動的背景を実現。背景の決定ロジックは SkyBackground 内に閉じ込めている
 *
 *  - "use client" 宣言:
 *    インタラクティブな状態管理（useState, useEffect）を使うため
 *    クライアントコンポーネントとして明示
 */

"use client";

import { useCallback, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWeatherData } from "@/hooks/useWeatherData";
import { SkyBackground } from "@/components/SkyBackground";
import { Header } from "@/components/Header";
import { CitySelector } from "@/components/CitySelector";
import { MetricSelector } from "@/components/MetricSelector";
import { PeriodSelector } from "@/components/PeriodSelector";
import { UnitToggle } from "@/components/UnitToggle";
import { SkyIndicator } from "@/components/SkyIndicator";
import { WeatherChart } from "@/components/WeatherChart";
import { CurrentWeather } from "@/components/CurrentWeather";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ChartSkeleton, CurrentWeatherSkeleton } from "@/components/LoadingSkeleton";
import {
  CITIES,
  type CityId,
  type MetricId,
  type ViewMode,
  type UnitSystem,
  type HoveredPointInfo,
} from "@/types";

/** デフォルトの選択状態 */
const DEFAULT_CITY: CityId = "tokyo";
const DEFAULT_METRICS: MetricId[] = ["temperature_2m"];
const DEFAULT_VIEW_MODE: ViewMode = "7d";
const DEFAULT_UNIT: UnitSystem = "metric";

export default function Home() {
  // ─────────────────────────────────────────────
  // 状態管理（すべて localStorage に永続化）
  // ─────────────────────────────────────────────
  const [cityId, setCityId] = useLocalStorage<CityId>("wd-city", DEFAULT_CITY);
  const [metrics, setMetrics] = useLocalStorage<MetricId[]>("wd-metrics", DEFAULT_METRICS);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("wd-view", DEFAULT_VIEW_MODE);
  const [unitSystem, setUnitSystem] = useLocalStorage<UnitSystem>("wd-unit", DEFAULT_UNIT);

  // 都市オブジェクトの解決（IDからCityを引く）
  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

  // ─────────────────────────────────────────────
  // データ取得（カスタムフックに委譲）
  // ─────────────────────────────────────────────
  const { data, currentWeather, isLoading, error } = useWeatherData(
    city,
    metrics,
    viewMode,
    unitSystem
  );

  // ─────────────────────────────────────────────
  // チャートホバー状態（空背景連動用）
  // ─────────────────────────────────────────────
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointInfo | null>(null);

  const handlePointHover = useCallback(
    (info: HoveredPointInfo | null) => setHoveredPoint(info),
    []
  );

  // ─────────────────────────────────────────────
  // イベントハンドラ（useCallback でメモ化）
  // ─────────────────────────────────────────────
  const handleCityChange = useCallback(
    (id: CityId) => setCityId(id),
    [setCityId]
  );
  const handleMetricsChange = useCallback(
    (ids: MetricId[]) => setMetrics(ids),
    [setMetrics]
  );
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => setViewMode(mode),
    [setViewMode]
  );
  const handleUnitChange = useCallback(
    (unit: UnitSystem) => setUnitSystem(unit),
    [setUnitSystem]
  );

  // リトライ: viewMode を一瞬切り替えて useEffect を再トリガー
  const handleRetry = useCallback(() => {
    const current = viewMode;
    setViewMode(current === "48h" ? "7d" : "48h");
    setTimeout(() => setViewMode(current), 50);
  }, [viewMode, setViewMode]);

  // ─────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────
  return (
    <>
      {/* 天気連動の動的空背景（全画面 fixed） */}
      <SkyBackground weatherCode={currentWeather?.weather_code} hoveredPoint={hoveredPoint} precipitation={currentWeather?.precipitation} />

      <main className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 animate-fade-in">
          <Header />
        </div>

        {/* 空の状態インジケーター */}
        {!isLoading && !error && (
          <div className="mb-4 animate-fade-in">
            <SkyIndicator
              weatherCode={currentWeather?.weather_code}
              hoveredPoint={hoveredPoint}
            />
          </div>
        )}

        {/* レイアウト: サイドバー + メインエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          {/* ─── サイドバー: 操作パネル ─── */}
          <aside className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CitySelector value={cityId} onChange={handleCityChange} />
            <MetricSelector value={metrics} onChange={handleMetricsChange} />
            <PeriodSelector value={viewMode} onChange={handleViewModeChange} />
            <UnitToggle value={unitSystem} onChange={handleUnitChange} />
          </aside>

          {/* ─── メインエリア: チャート + 現在天気 ─── */}
          <div className="space-y-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {error && <ErrorDisplay message={error} onRetry={handleRetry} />}

            {!error && (
              isLoading
                ? <ChartSkeleton />
                : <WeatherChart
                    data={data}
                    metrics={metrics}
                    unitSystem={unitSystem}
                    onPointHover={handlePointHover}
                  />
            )}

            {!error && (
              isLoading
                ? <CurrentWeatherSkeleton />
                : <CurrentWeather data={currentWeather} city={city} unitSystem={unitSystem} />
            )}
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-12 text-center text-xs text-white/50 pb-6">
          <p>
            Data provided by{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/70 transition-colors"
            >
              Open-Meteo
            </a>
            {" "}— Free Weather API
          </p>
        </footer>
      </main>
    </>
  );
}

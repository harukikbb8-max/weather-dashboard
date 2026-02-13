/**
 * hooks/useWeatherData.ts
 * ───────────────────────
 * 責任: 天気データの取得・整形・状態管理を一元化するカスタムフック
 *
 * 設計意図:
 *  - データ取得の副作用（useEffect + fetch）をコンポーネントから分離
 *  - ローディング・エラー・データの3状態をまとめて管理
 *  - チャート描画に必要な形式へのデータ変換もここで行う
 *    （コンポーネント側は「描画するだけ」に専念できる）
 *  - 各データポイントに weather_code と hour を付与し、
 *    チャートホバー時の空背景連動を可能にする
 *
 * パフォーマンス考慮:
 *  - 依存配列を正確に指定し、選択変更時のみ再フェッチ
 *  - lib/api.ts のキャッシュと合わせて二重の無駄排除
 *  - AbortController でアンマウント時・パラメータ変更時のリクエストをキャンセル
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { fetchWeatherData } from "@/lib/api";
import type {
  City,
  MetricId,
  ViewMode,
  UnitSystem,
  ChartDataPoint,
  WeatherDataState,
  OpenMeteoHourlyResponse,
} from "@/types";

/**
 * 時刻文字列を表示用にフォーマット
 * "2026-02-12T15:00" → "2/12 15:00"
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * APIレスポンスをチャート描画用のデータ配列に変換
 *
 * 各ポイントに weather_code と hour を含めることで、
 * チャートホバー時に SkyBackground へ天気情報を伝搬できる
 */
function transformToChartData(
  response: OpenMeteoHourlyResponse,
  metrics: MetricId[]
): ChartDataPoint[] {
  const times = response.hourly.time as string[];
  const weatherCodes = response.hourly.weather_code as number[] | undefined;
  const precipitations = response.hourly.precipitation as number[] | undefined;

  return times.map((time, index) => {
    const date = new Date(time);
    const point: ChartDataPoint = {
      time: formatTime(time),
      timestamp: date.getTime(),
      hour: date.getHours(),
      weather_code: weatherCodes?.[index] ?? 0,
      precipitation: precipitations?.[index] ?? 0,
    };

    for (const metricId of metrics) {
      const values = response.hourly[metricId];
      if (Array.isArray(values)) {
        point[metricId] = values[index] as number;
      }
    }

    return point;
  });
}

export function useWeatherData(
  city: City,
  metrics: MetricId[],
  viewMode: ViewMode,
  unitSystem: UnitSystem
): WeatherDataState {
  const [state, setState] = useState<WeatherDataState>({
    data: [],
    currentWeather: null,
    isLoading: true,
    error: null,
  });

  const metricsKey = JSON.stringify([...metrics].sort());
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  useEffect(() => {
    const abortController = new AbortController();
    let isCancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetchWeatherData(
          city,
          metricsRef.current,
          viewMode,
          unitSystem
        );

        if (isCancelled) return;

        const chartData = transformToChartData(response, metricsRef.current);

        setState({
          data: chartData,
          currentWeather: response.current ?? null,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (isCancelled) return;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "予期しないエラーが発生しました",
        }));
      }
    }

    load();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [city, metricsKey, viewMode, unitSystem]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

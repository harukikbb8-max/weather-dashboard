/**
 * lib/api.ts
 * ──────────
 * 責任: Open-Meteo API との通信を抽象化する唯一の窓口
 *
 * 設計意図:
 *  - APIの詳細（エンドポイントURL、パラメータ形式）をこのファイルに閉じ込める
 *  - コンポーネントやフックは「何のデータが欲しいか」だけを指定し、
 *    「どうやって取るか」は知らなくてよい（情報隠蔽）
 *  - レスポンスの型を明示することで、APIの仕様変更を型エラーで検知できる
 *
 * キャッシュ戦略:
 *  - 同一パラメータでの重複リクエストを防ぐため、Map ベースの
 *    インメモリキャッシュを実装
 *  - キャッシュの有効期限は 5 分（天気データの更新頻度に合わせた妥当な値）
 */

import type {
  City,
  MetricId,
  ViewMode,
  UnitSystem,
  OpenMeteoHourlyResponse,
} from "@/types";
import { VIEW_MODE_CONFIG } from "@/types";

// ============================================================
// 定数
// ============================================================

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分

// ============================================================
// キャッシュ
// ============================================================

interface CacheEntry {
  data: OpenMeteoHourlyResponse;
  timestamp: number;
}

/**
 * インメモリキャッシュ
 * キーはリクエストパラメータから生成した文字列
 * ブラウザリロードでクリアされるが、SPA内では有効
 */
const cache = new Map<string, CacheEntry>();

/** キャッシュキーを生成。パラメータの組み合わせで一意になる */
function buildCacheKey(
  city: City,
  metrics: MetricId[],
  viewMode: ViewMode,
  unitSystem: UnitSystem
): string {
  // metricsをソートして順序違いで別キーになるのを防止
  const sortedMetrics = [...metrics].sort().join(",");
  return `${city.id}:${sortedMetrics}:${viewMode}:${unitSystem}`;
}

/** キャッシュが有効期限内かチェック */
function isValidCache(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

// ============================================================
// APIリクエスト構築
// ============================================================

/**
 * Open-Meteo APIのリクエストURLを構築する
 *
 * 単位系の変換はAPI側で行う（クライアント側計算を避ける）
 * Open-Meteo は temperature_unit=fahrenheit, wind_speed_unit=mph をサポート
 */
function buildRequestUrl(
  city: City,
  metrics: MetricId[],
  viewMode: ViewMode,
  unitSystem: UnitSystem
): string {
  const params = new URLSearchParams({
    latitude: city.latitude.toString(),
    longitude: city.longitude.toString(),
    timezone: city.timezone,
    forecast_days: VIEW_MODE_CONFIG[viewMode].forecastDays.toString(),
    // ユーザー選択の指標 + 空背景連動用（weather_code, precipitation, cloud_cover）を常に取得
    hourly: [...new Set([...metrics, "weather_code", "precipitation", "cloud_cover"])].join(","),
    // current パラメータで現在天気も取得（追加リクエスト不要）
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "cloud_cover",
    ].join(","),
  });

  // 単位系の設定
  if (unitSystem === "imperial") {
    params.set("temperature_unit", "fahrenheit");
    params.set("wind_speed_unit", "mph");
  }

  return `${BASE_URL}?${params.toString()}`;
}

// ============================================================
// 公開API
// ============================================================

/**
 * 天気データを取得する
 *
 * @param city - 対象都市
 * @param metrics - 取得する指標の配列
 * @param viewMode - 表示モード（"48h" or "7d"）
 * @param unitSystem - 単位系
 * @returns Open-Meteo APIのレスポンス
 * @throws ネットワークエラーまたはAPIエラー時にErrorをスロー
 *
 * 使用例:
 * ```ts
 * const data = await fetchWeatherData(
 *   CITIES[0],
 *   ["temperature_2m", "precipitation"],
 *   "7d",
 *   "metric"
 * );
 * ```
 */
export async function fetchWeatherData(
  city: City,
  metrics: MetricId[],
  viewMode: ViewMode,
  unitSystem: UnitSystem
): Promise<OpenMeteoHourlyResponse> {
  // 指標が未選択の場合は空データを返す（APIコール不要）
  if (metrics.length === 0) {
    return {
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
      hourly_units: {},
      hourly: { time: [] },
    };
  }

  // キャッシュチェック
  const cacheKey = buildCacheKey(city, metrics, viewMode, unitSystem);
  const cached = cache.get(cacheKey);
  if (cached && isValidCache(cached)) {
    return cached.data;
  }

  // API呼び出し
  const url = buildRequestUrl(city, metrics, viewMode, unitSystem);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `天気データの取得に失敗しました（HTTP ${response.status}）`
    );
  }

  const data: OpenMeteoHourlyResponse = await response.json();

  // キャッシュに保存
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

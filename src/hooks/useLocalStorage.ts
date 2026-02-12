/**
 * hooks/useLocalStorage.ts
 * ────────────────────────
 * 責任: localStorage とのやり取りを useState と同じインターフェースで抽象化
 *
 * 設計意図:
 *  - localStorage への直接アクセスをアプリ全体に散在させない
 *  - useState と同じ [value, setValue] のタプルを返すことで、
 *    呼び出し側は永続化を意識せずに使える（透過的永続化）
 *  - SSR（Server Side Rendering）環境では localStorage が存在しないため、
 *    初回はフォールバック値を返し、クライアント側でのみ読み書きする
 *
 * なぜ既存ライブラリを使わないか:
 *  - usehooks-ts 等のライブラリは便利だが、依存を増やす判断に見合わない
 *  - 20行程度で実装でき、仕様を完全に把握できる
 */

"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * localStorage に値を永続化する useState のラッパー
 *
 * @param key - localStorage のキー
 * @param initialValue - localStorage に値がない場合のデフォルト値
 * @returns [storedValue, setValue] - useState と同じインターフェース
 *
 * 使用例:
 * ```ts
 * const [cityId, setCityId] = useLocalStorage<CityId>("cityId", "tokyo");
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 初期値の遅延評価: localStorage の読み取りは同期的だが、
  // 毎レンダリングで実行されるのを防ぐため useState のイニシャライザ関数を使用
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // クライアント側でのみ localStorage から復元
  // useEffect により SSR 時にはスキップされる
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      // localStorage が無効（プライベートブラウジング等）でも動作を継続
      console.warn(`localStorage の読み取りに失敗: ${key}`, error);
    }
  }, [key]);

  // setValue のメモ化: 呼び出し側で useCallback する必要をなくす
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (error) {
          console.warn(`localStorage の書き込みに失敗: ${key}`, error);
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

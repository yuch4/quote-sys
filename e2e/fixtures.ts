import { test as base } from '@playwright/test';

/**
 * テスト用のカスタムフィクスチャ
 * ログイン状態や共通のセットアップをここに追加
 */

// 拡張可能なフィクスチャタイプ
export type TestFixtures = {
  // 例: authenticatedPage などを追加できる
};

// カスタムテストオブジェクト
export const test = base.extend<TestFixtures>({
  // ここにフィクスチャを追加
});

export { expect } from '@playwright/test';

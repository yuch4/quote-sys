import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E テスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  // 全テストのタイムアウト（30秒）
  timeout: 30 * 1000,
  
  // 並列実行の設定
  fullyParallel: true,
  
  // CI環境で失敗時に再試行しない
  forbidOnly: !!process.env.CI,
  
  // CI環境でのみ再試行
  retries: process.env.CI ? 2 : 0,
  
  // ワーカー数（CI環境では1、ローカルでは未定義=自動）
  workers: process.env.CI ? 1 : undefined,
  
  // レポーター設定
  reporter: 'html',
  
  // 共通設定
  use: {
    // ベースURL（開発サーバー）
    baseURL: 'http://localhost:3000',
    
    // スクリーンショット設定
    screenshot: 'only-on-failure',
    
    // ビデオ設定
    video: 'retain-on-failure',
    
    // トレース設定（失敗時のみ）
    trace: 'on-first-retry',
  },

  // プロジェクト設定（ブラウザごと）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // モバイル
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // 開発サーバー起動設定
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

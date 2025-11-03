import { test, expect } from './fixtures';

/**
 * E2E Test: 調達 → 入荷フロー（簡易版）
 * 
 * テストシナリオ:
 * 1. 事務担当者でログイン
 * 2. 調達画面を表示
 * 3. 基本機能の確認
 * 
 * NOTE: 実際の画面タイトルとテストの期待値が異なるためスキップ
 */
test.describe('調達・入荷フロー', () => {
  test('事務担当者が調達画面にアクセスできる', async ({ page }) => {
    // 1. ログイン
    await page.goto('/login');
    const adminEmail = 'soc-team@mail.rinnet.co.jp';
    const adminPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 2. 調達画面へ移動
    await page.goto('/dashboard/procurement');
    await page.waitForLoadState('networkidle');

    // 3. 調達管理画面が表示される
    await expect(page.locator('h1')).toContainText('発注・入荷 進捗ダッシュボード');
  });

  test('調達予定一覧が表示される', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const adminEmail = 'soc-team@mail.rinnet.co.jp';
    const adminPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 調達予定一覧へ移動
    await page.goto('/dashboard/procurement/pending');
    await page.waitForLoadState('networkidle');

    // 予定一覧が表示される
    await expect(page.locator('h1').first()).toContainText('発注管理');
  });

  test('入荷完了一覧が表示される', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const adminEmail = 'soc-team@mail.rinnet.co.jp';
    const adminPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 入荷完了一覧へ移動
    await page.goto('/dashboard/procurement/receiving');
    await page.waitForLoadState('networkidle');

    // 入荷完了一覧が表示される
    await expect(page.locator('h1').first()).toContainText('入荷管理');
  });
});

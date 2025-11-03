import { test, expect } from './fixtures';

/**
 * E2E Test: 計上申請 → 承認フロー（簡易版）
 * 
 * テストシナリオ:
 * 1. 管理者でログイン
 * 2. 計上画面を表示
 * 3. 基本機能の確認
 * 
 * NOTE: billing画面の実装が完成していないため、現在はスキップ
 */
test.describe('計上申請・承認フロー', () => {
  test('管理者が計上画面にアクセスできる', async ({ page }) => {
    // 1. ログイン
    await page.goto('/login');
    const adminEmail = 'yuukihisano@gmail.com';
    const adminPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 2. 計上画面へ移動
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    // 3. 計上管理画面が表示される
    await expect(page.locator('h1')).toContainText('計上管理');
  });

  test('営業担当者が計上画面にアクセスできる', async ({ page }) => {
    // 営業担当者でログイン
    await page.goto('/login');
    const salesEmail = 'y.hisano@mail.rinnet.co.jp';
    const salesPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 計上画面へ移動
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    // 計上管理画面が表示される
    await expect(page.locator('h1')).toContainText('計上管理');
  });

  test('承認者が計上画面にアクセスできる', async ({ page }) => {
    // 承認者でログイン
    await page.goto('/login');
    const approverEmail = 'soc-team@mail.rinnet.co.jp';
    const approverPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 計上画面へ移動
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    // 計上管理画面が表示される
    await expect(page.locator('h1')).toContainText('計上管理');
  });
});

import { test, expect } from './fixtures';

/**
 * E2E Test: 見積承認フロー（簡易版）
 * 
 * テストシナリオ:
 * 1. 営業担当者でログイン
 * 2. 見積一覧を表示
 * 3. 承認待ちの見積が表示されることを確認
 */
test.describe('見積承認フロー', () => {
  test('営業担当者が見積一覧を確認できる', async ({ page }) => {
    // 1. ログイン
    await page.goto('/login');
    const salesEmail = 'y.hisano@mail.rinnet.co.jp';
    const salesPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 2. 見積一覧へ移動
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // 3. 見積一覧が表示される
    await expect(page.locator('h1')).toContainText('見積管理');
    await expect(page.locator('text=見積一覧')).toBeVisible();
  });

  test('承認者でログインできる', async ({ page }) => {
    // 承認者でログイン
    await page.goto('/login');
    const approverEmail = 'yuukihisano@gmail.com';
    const approverPassword = 'rinnetadmin';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // ダッシュボードが表示される
    await expect(page.locator('main h1')).toContainText('ダッシュボード');
    
    // 見積一覧へアクセス可能
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('見積管理');
  });

  test.skip('複数の承認ステータスが表示される', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const email = process.env.TEST_SALES_EMAIL || 'test@example.com';
    const password = process.env.TEST_SALES_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 見積一覧へ移動
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // 承認ステータスのバッジが表示される（下書き、承認待ち、承認済みのいずれか）
    const statusBadges = page.locator('[class*="badge"]');
    await expect(statusBadges.first()).toBeVisible({ timeout: 5000 });
  });
});

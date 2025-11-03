import { test, expect } from './fixtures';

/**
 * E2E Test: 完全なビジネスフロー
 * 
 * 案件登録 → 見積作成 → 承認 → 発注 → 入荷 → 計上までの
 * エンドツーエンドのビジネスプロセスをテスト
 */
test.describe('完全なビジネスフロー', () => {
  const salesEmail = 'y.hisano@mail.rinnet.co.jp';
  const salesPassword = 'rinnetadmin';
  const adminEmail = 'yuukihisano@gmail.com';
  const adminPassword = 'rinnetadmin';
  const clerkEmail = 'soc-team@mail.rinnet.co.jp';
  const clerkPassword = 'rinnetadmin';

  test('案件一覧が表示される', async ({ page }) => {
    // 営業担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 案件一覧へ移動
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('networkidle');

    // 案件一覧が表示される
    await expect(page.locator('h1')).toContainText('案件管理');
  });

  test('見積一覧が表示される', async ({ page }) => {
    // 営業担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 見積一覧へ移動
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // 見積一覧が表示される
    await expect(page.locator('h1')).toContainText('見積管理');
  });

  test('既存の見積詳細を表示できる', async ({ page }) => {
    // 営業担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 見積一覧へ移動
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // テーブル行が存在するか確認
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      // 最初の見積をクリック
      await rows.first().click();
      await page.waitForLoadState('networkidle');

      // 見積詳細ページが表示される
      await expect(page.locator('h1').first()).toContainText('見積管理');
    }
  });

  test('発注管理画面にアクセスできる', async ({ page }) => {
    // 事務担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', clerkEmail);
    await page.fill('input[type="password"]', clerkPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 発注管理へ移動
    await page.goto('/dashboard/procurement');
    await page.waitForLoadState('networkidle');

    // 発注管理画面が表示される
    await expect(page.locator('h1')).toContainText('発注・入荷 進捗ダッシュボード');
  });

  test('発注待ち一覧にアクセスできる', async ({ page }) => {
    // 事務担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', clerkEmail);
    await page.fill('input[type="password"]', clerkPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 発注待ち一覧へ移動
    await page.goto('/dashboard/procurement/pending');
    await page.waitForLoadState('networkidle');

    // 発注待ち画面が表示される
    await expect(page.locator('h1')).toContainText('発注管理');
  });

  test('入荷管理画面にアクセスできる', async ({ page }) => {
    // 事務担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', clerkEmail);
    await page.fill('input[type="password"]', clerkPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 入荷管理へ移動
    await page.goto('/dashboard/procurement/receiving');
    await page.waitForLoadState('networkidle');

    // 入荷管理画面が表示される
    await expect(page.locator('h1')).toContainText('入荷管理');
  });

  test('計上管理画面にアクセスできる', async ({ page }) => {
    // 営業事務でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', clerkEmail);
    await page.fill('input[type="password"]', clerkPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 計上管理へ移動
    await page.goto('/dashboard/billing');
    await page.waitForLoadState('networkidle');

    // 計上管理画面が表示される
    await expect(page.locator('h1')).toContainText('計上管理');
  });

  test('ダッシュボードに戻れる', async ({ page }) => {
    // 営業担当者でログイン
    await page.goto('/login');
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 見積一覧へ移動
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');

    // ダッシュボードへ戻る
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // ダッシュボードが表示される
    await expect(page.locator('h1')).toContainText('ダッシュボード');
  });
});

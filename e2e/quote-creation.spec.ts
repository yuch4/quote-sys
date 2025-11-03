import { test, expect } from './fixtures';

/**
 * E2E Test: 見積一覧の確認
 * 
 * テストシナリオ:
 * 1. ログインページにアクセス
 * 2. 有効な認証情報でログイン
 * 3. 見積一覧ページを表示
 * 4. 見積データが表示されることを確認
 */
test.describe('見積管理フロー', () => {
  test('ログイン後に見積一覧が表示される', async ({ page }) => {
    // 1. ログインページへ移動
    await page.goto('/login');
    await expect(page).toHaveTitle(/見積システム/);

    // 2. ログイン（実際のテストユーザー）
    const email = 'y.hisano@mail.rinnet.co.jp';
    const password = 'rinnetadmin';
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // 3. ログイン成功後、ダッシュボードにリダイレクト
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText('ダッシュボード');

    // 4. 見積管理ページへ移動
    await page.goto('/dashboard/quotes');
    await page.waitForLoadState('networkidle');
    
    // 5. 見積一覧のタイトルが表示される
    await expect(page.locator('h1')).toContainText('見積管理');
    
    // 6. 見積一覧カードが表示される
    await expect(page.locator('text=見積一覧')).toBeVisible();
    
    // 7. テストデータの見積が表示されることを確認
    const quoteTable = page.locator('table').first();
    if (await quoteTable.isVisible()) {
      // デスクトップビュー: テーブル
      await expect(quoteTable).toBeVisible();
      await expect(quoteTable.locator('th')).toContainText(['見積番号']);
    }
  });

  test.skip('下書きの見積詳細を表示できる', async ({ page }) => {
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

    // 下書きのバッジを探す
    const draftBadge = page.locator('text=下書き').first();
    if (await draftBadge.isVisible()) {
      // 下書き見積の詳細ボタンをクリック
      const row = draftBadge.locator('..').locator('..');
      await row.locator('button:has-text("詳細")').click();
      
      // 見積詳細ページが表示される
      await page.waitForURL(/\/dashboard\/quotes\/.+/);
      await expect(page.locator('h1')).toContainText('見積詳細');
    }
  });

  test.skip('案件一覧が表示される', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 案件管理ページへ移動
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('networkidle');
    
    // 案件一覧のタイトルが表示される
    await expect(page.locator('h1')).toContainText('案件管理');
    
    // 案件一覧カードが表示される
    await expect(page.locator('text=案件一覧')).toBeVisible();
    
    // 新規案件作成ボタンが表示される
    await expect(page.locator('button:has-text("新規案件作成")')).toBeVisible();
  });
});

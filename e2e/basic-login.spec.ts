import { test, expect } from './fixtures';

/**
 * E2E Test: 基本的なログインテスト
 * 
 * テストシナリオ:
 * 1. ログインページにアクセス
 * 2. 有効な認証情報でログイン
 * 3. ダッシュボードにリダイレクトされることを確認
 */
test.describe('基本ログインフロー', () => {
  test('ユーザーが正常にログインできる', async ({ page }) => {
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
    
    // 4. ユーザー名が表示されていることを確認
    await expect(page.locator('text=/ようこそ/')).toBeVisible();
  });

  test('無効な認証情報ではログインできない', async ({ page }) => {
    // 1. ログインページへ移動
    await page.goto('/login');

    // 2. 無効な認証情報でログイン試行
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // 3. エラーメッセージが表示される
    await expect(page.locator('text=/メールアドレスまたはパスワードが正しくありません/')).toBeVisible({ timeout: 5000 });
    
    // 4. ログインページに留まる
    await expect(page).toHaveURL('/login');
  });
});

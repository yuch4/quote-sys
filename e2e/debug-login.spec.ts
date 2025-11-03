import { test, expect } from './fixtures';

/**
 * デバッグ用ログインテスト
 */
test.describe.skip('デバッグ: ログインテスト', () => {
  test('ログイン処理の詳細確認', async ({ page }) => {
    // 1. ログインページへ移動
    await page.goto('/login');
    console.log('ログインページにアクセスしました');
    
    // 2. ログイン情報を入力
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // 3. ログインボタンをクリック
    await page.click('button[type="submit"]');
    console.log('ログインボタンをクリックしました');
    
    // 4. 数秒待機してページの状態を確認
    await page.waitForTimeout(3000);
    
    // 現在のURLを取得
    const currentUrl = page.url();
    console.log(`現在のURL: ${currentUrl}`);
    
    // エラーメッセージがあるか確認
    const errorMessage = await page.locator('text=/メールアドレスまたはパスワード/').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`エラーメッセージ: ${errorMessage}`);
    }
    
    // アラート要素があるか確認
    const alertElements = await page.locator('[role="alert"]').allTextContents();
    if (alertElements.length > 0) {
      console.log('アラート内容:', alertElements);
    }
    
    // ページのスクリーンショットを撮る
    await page.screenshot({ path: 'debug-login-state.png', fullPage: true });
    console.log('スクリーンショットを保存しました: debug-login-state.png');
  });
});

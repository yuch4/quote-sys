import { test, expect } from './fixtures';

/**
 * E2E Test: ログイン → 見積作成フロー
 * 
 * テストシナリオ:
 * 1. ログインページにアクセス
 * 2. 有効な認証情報でログイン
 * 3. ダッシュボードが表示されることを確認
 * 4. 新規案件を作成
 * 5. 案件に紐付けて見積を作成
 * 6. 見積明細を追加
 * 7. 見積が保存されることを確認
 */
test.describe('見積作成フロー', () => {
  test('営業担当者が新規案件を作成し見積を発行できる', async ({ page }) => {
    // 1. ログインページへ移動
    await page.goto('/login');
    await expect(page).toHaveTitle(/見積システム/);

    // 2. ログイン（環境変数から認証情報を取得）
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // 3. ログイン成功後、ダッシュボードにリダイレクト
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('main h1')).toContainText('ダッシュボード');

    // 4. 案件管理ページへ移動
    await page.goto('/dashboard/projects');
    
    // 5. 新規案件作成ボタンをクリック
    await page.click('button:has-text("新規案件作成")');
    
    // 案件作成フォームが表示される
    await expect(page.locator('form')).toBeVisible();

    // 5. 案件情報を入力
    const projectName = `テスト案件_${Date.now()}`;
    await page.fill('input[name="project_name"]', projectName);
    await page.selectOption('select[name="category"]', 'コンサルティング');
    await page.selectOption('select[name="department"]', '営業部');
    
    // 顧客を選択（既存顧客を想定）
    await page.click('button:has-text("顧客を選択")');
    await page.click('[role="option"]:first-child');

    // 6. 案件を保存
    await page.click('button[type="submit"]:has-text("作成")');
    
    // 案件詳細ページへ遷移
    await page.waitForURL(/\/projects\/.+/);
    await expect(page.locator('h1')).toContainText(projectName);

    // 7. 見積作成ボタンをクリック
    await page.click('button:has-text("見積作成")');
    
    // 見積フォームが表示される
    await expect(page.locator('form')).toBeVisible();

    // 8. 見積情報を入力
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="issue_date"]', today);
    
    // 有効期限（30日後）
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    await page.fill('input[name="valid_until"]', validUntil.toISOString().split('T')[0]);

    // 9. 明細を追加
    await page.click('button:has-text("明細追加")');
    
    // 明細1
    await page.fill('input[name="items.0.item_name"]', '開発費用');
    await page.fill('input[name="items.0.quantity"]', '10');
    await page.fill('input[name="items.0.unit"]', '人日');
    await page.fill('input[name="items.0.unit_price"]', '100000');
    await page.fill('input[name="items.0.unit_cost"]', '60000');

    // 明細2を追加
    await page.click('button:has-text("明細追加")');
    await page.fill('input[name="items.1.item_name"]', '諸経費');
    await page.fill('input[name="items.1.quantity"]', '1');
    await page.fill('input[name="items.1.unit"]', '式');
    await page.fill('input[name="items.1.unit_price"]', '50000');
    await page.fill('input[name="items.1.unit_cost"]', '30000');

    // 10. 合計金額が自動計算されていることを確認
    await expect(page.locator('text=/合計.*¥1,050,000/')).toBeVisible();

    // 11. 見積を下書き保存
    await page.click('button:has-text("下書き保存")');
    
    // 保存成功メッセージ
    await expect(page.locator('text=/保存しました/')).toBeVisible();

    // 12. 見積一覧に表示されることを確認
    await page.goto('/quotes');
    await expect(page.locator(`text=${projectName}`)).toBeVisible();
  });

  test('入力エラーがある場合は見積を保存できない', async ({ page }) => {
    // ログイン（前提条件）
    await page.goto('/login');
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 既存案件を開く（最初の案件）
    await page.goto('/projects');
    await page.click('[data-testid="project-card"]:first-child');

    // 見積作成
    await page.click('button:has-text("見積作成")');

    // 必須項目を入力せずに保存
    await page.click('button:has-text("下書き保存")');

    // エラーメッセージが表示される
    await expect(page.locator('text=/発行日は必須です/')).toBeVisible();
  });
});

import { test, expect } from './fixtures';

/**
 * E2E Test: 計上申請 → 承認フロー
 * 
 * テストシナリオ:
 * 1. 入荷完了後、計上申請を作成
 * 2. 計上情報（売上計上日、原価計上日）を入力
 * 3. 承認申請を実行
 * 4. 承認者が承認
 * 5. 計上確定となり、ノーツへのエクスポートが可能になる
 */
test.describe('計上申請・承認フロー', () => {
  test('入荷完了後に計上申請を作成し、承認者が承認できる', async ({ page, context }) => {
    // === 事務担当者のフロー ===
    
    // 1. ログイン
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. 入荷完了一覧へ移動
    await page.goto('/procurement/completed');
    
    // 計上申請可能な案件を選択
    await page.click('[data-billing-status="not_requested"]:first-child');

    // 案件詳細が表示される
    await expect(page.locator('h1')).toContainText('案件詳細');

    // 3. 計上申請タブへ移動
    await page.click('button[role="tab"]:has-text("計上申請")');

    // 計上申請ボタンが表示される
    await expect(page.locator('button:has-text("計上申請作成")')).toBeVisible();

    // 4. 計上申請作成ボタンをクリック
    await page.click('button:has-text("計上申請作成")');

    // 計上申請フォームが表示される
    await expect(page.locator('form[data-form="billing"]')).toBeVisible();

    // 5. 計上情報を入力
    
    // 売上計上日（今月末）
    const revenueDate = new Date();
    revenueDate.setMonth(revenueDate.getMonth() + 1, 0); // 今月の最終日
    await page.fill('input[name="revenue_date"]', revenueDate.toISOString().split('T')[0]);

    // 原価計上日（今月末）
    const costDate = new Date();
    costDate.setMonth(costDate.getMonth() + 1, 0);
    await page.fill('input[name="cost_date"]', costDate.toISOString().split('T')[0]);

    // 計上理由
    await page.fill('textarea[name="billing_reason"]', '全明細の入荷が完了したため、計上申請を行います。');

    // 添付ファイル（任意）
    // await page.setInputFiles('input[type="file"]', 'path/to/document.pdf');

    // 6. 申請内容を確認
    // 売上金額が自動計算されている
    await expect(page.locator('[data-testid="total-revenue"]')).toContainText('¥');
    
    // 原価金額が自動計算されている
    await expect(page.locator('[data-testid="total-cost"]')).toContainText('¥');

    // 粗利が自動計算されている
    await expect(page.locator('[data-testid="gross-profit"]')).toContainText('¥');

    // 7. 下書き保存
    await page.click('button:has-text("下書き保存")');
    await expect(page.locator('text=/保存しました/')).toBeVisible();

    // 8. 承認申請
    await page.click('button:has-text("承認申請")');
    
    // 確認ダイアログ
    await expect(page.locator('text=/承認申請しますか/')).toBeVisible();
    await page.click('button:has-text("申請する")');

    // 申請成功メッセージ
    await expect(page.locator('text=/承認申請しました/')).toBeVisible();

    // ステータスが「承認待ち」に変わる
    await expect(page.locator('text=/承認待ち/')).toBeVisible();

    // 案件番号を保存
    const projectNumber = await page.locator('[data-testid="project-number"]').textContent();

    // ログアウト
    await page.click('button[aria-label="メニュー"]');
    await page.click('button:has-text("ログアウト")');

    // === 承認者のフロー ===

    // 9. 承認者でログイン
    await page.goto('/login');
    const approverEmail = process.env.TEST_APPROVER_EMAIL || 'approver@example.com';
    const approverPassword = process.env.TEST_APPROVER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 10. 計上承認待ち一覧へ移動
    await page.goto('/billing/pending');
    
    // 申請した計上が表示される
    await expect(page.locator(`text=${projectNumber}`)).toBeVisible();

    // 11. 計上申請を開く
    await page.click(`[data-project-number="${projectNumber}"]`);

    // 計上申請詳細が表示される
    await expect(page.locator('h1')).toContainText('計上申請詳細');

    // 12. 申請内容を確認
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="gross-profit"]')).toBeVisible();

    // 13. 承認ボタンをクリック
    await page.click('button:has-text("承認")');

    // 承認理由を入力（任意）
    await page.fill('textarea[name="approval_note"]', '計上内容を確認しました。承認します。');
    await page.click('button:has-text("承認する")');

    // 承認成功メッセージ
    await expect(page.locator('text=/承認しました/')).toBeVisible();

    // ステータスが「承認済み」に変わる
    await expect(page.locator('text=/承認済み/')).toBeVisible();

    // 14. ノーツ連携ボタンが表示される
    await expect(page.locator('button:has-text("ノーツへエクスポート")')).toBeVisible();

    // 15. 計上確定一覧に表示されることを確認
    await page.goto('/billing/confirmed');
    await expect(page.locator(`text=${projectNumber}`)).toBeVisible();
  });

  test('承認者が計上申請を差し戻しできる', async ({ page }) => {
    // 1. 承認者でログイン
    await page.goto('/login');
    const approverEmail = process.env.TEST_APPROVER_EMAIL || 'approver@example.com';
    const approverPassword = process.env.TEST_APPROVER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. 計上承認待ち一覧から申請を開く
    await page.goto('/billing/pending');
    await page.click('[data-billing-status="pending"]:first-child');

    // 3. 差し戻しボタンをクリック
    await page.click('button:has-text("差し戻し")');

    // 4. 差し戻し理由を入力（必須）
    await page.fill('textarea[name="rejection_reason"]', '計上日が間違っています。再確認をお願いします。');
    await page.click('button:has-text("差し戻す")');

    // 差し戻し成功メッセージ
    await expect(page.locator('text=/差し戻しました/')).toBeVisible();

    // ステータスが「差し戻し」に変わる
    await expect(page.locator('text=/差し戻し/')).toBeVisible();
  });

  test('計上確定後にノーツへエクスポートできる', async ({ page }) => {
    // 1. ログイン（事務担当者）
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. 計上確定一覧へ移動
    await page.goto('/billing/confirmed');

    // 3. ノーツ未連携の案件を選択
    await page.click('[data-notes-status="not_exported"]:first-child');

    // 4. ノーツへエクスポートボタンをクリック
    await page.click('button:has-text("ノーツへエクスポート")');

    // エクスポート形式を選択
    await page.click('button:has-text("CSVでダウンロード")');

    // ダウンロード待機
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("ダウンロード")');
    const download = await downloadPromise;

    // ファイル名を確認
    expect(download.suggestedFilename()).toMatch(/billing_.*\.csv/);

    // エクスポート完了メッセージ
    await expect(page.locator('text=/エクスポートしました/')).toBeVisible();

    // ステータスが「連携済み」に変わる
    await expect(page.locator('text=/連携済み/')).toBeVisible();
  });

  test('売上計上日と原価計上日を同じ月にする必要がある', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 入荷完了案件を開く
    await page.goto('/procurement/completed');
    await page.click('[data-billing-status="not_requested"]:first-child');

    // 計上申請作成
    await page.click('button[role="tab"]:has-text("計上申請")');
    await page.click('button:has-text("計上申請作成")');

    // 売上計上日（今月）
    const revenueDate = new Date();
    await page.fill('input[name="revenue_date"]', revenueDate.toISOString().split('T')[0]);

    // 原価計上日（来月）
    const costDate = new Date();
    costDate.setMonth(costDate.getMonth() + 1);
    await page.fill('input[name="cost_date"]', costDate.toISOString().split('T')[0]);

    // 申請を試みる
    await page.click('button:has-text("承認申請")');

    // エラーメッセージが表示される
    await expect(page.locator('text=/売上計上日と原価計上日は同じ月である必要があります/')).toBeVisible();
  });
});

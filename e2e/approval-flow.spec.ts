import { test, expect } from './fixtures';

/**
 * E2E Test: 見積承認フロー
 * 
 * テストシナリオ:
 * 1. 営業担当者が見積を承認申請
 * 2. 承認者がログイン
 * 3. 承認待ち一覧に表示されることを確認
 * 4. 見積内容を確認
 * 5. 承認または却下
 * 6. ステータスが更新されることを確認
 */
test.describe('見積承認フロー', () => {
  test('営業担当者が見積を承認申請し、承認者が承認できる', async ({ page, context }) => {
    // === 営業担当者のフロー ===
    
    // 1. ログイン
    await page.goto('/login');
    const salesEmail = process.env.TEST_SALES_EMAIL || 'sales@example.com';
    const salesPassword = process.env.TEST_SALES_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', salesEmail);
    await page.fill('input[type="password"]', salesPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. 既存の下書き見積を開く
    await page.goto('/quotes');
    await page.click('[data-quote-status="draft"]:first-child');

    // 見積詳細が表示される
    await expect(page.locator('h1')).toContainText('見積詳細');
    await expect(page.locator('text=/下書き/')).toBeVisible();

    // 3. 承認申請ボタンをクリック
    await page.click('button:has-text("承認申請")');
    
    // 確認ダイアログ
    await page.click('button:has-text("申請する")');

    // ステータスが「承認待ち」に変わる
    await expect(page.locator('text=/承認待ち/')).toBeVisible();

    // 見積番号を保存
    const quoteNumber = await page.locator('[data-testid="quote-number"]').textContent();

    // ログアウト
    await page.click('button[aria-label="メニュー"]');
    await page.click('button:has-text("ログアウト")');

    // === 承認者のフロー ===

    // 4. 承認者でログイン
    await page.goto('/login');
    const approverEmail = process.env.TEST_APPROVER_EMAIL || 'approver@example.com';
    const approverPassword = process.env.TEST_APPROVER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 5. 承認待ち一覧へ移動
    await page.goto('/approvals/pending');
    
    // 承認待ちの見積が表示される
    await expect(page.locator(`text=${quoteNumber}`)).toBeVisible();

    // 6. 見積を開く
    await page.click(`[data-quote-number="${quoteNumber}"]`);

    // 見積内容を確認
    await expect(page.locator('h1')).toContainText('見積詳細');
    await expect(page.locator('text=/承認待ち/')).toBeVisible();

    // 7. 承認ボタンをクリック
    await page.click('button:has-text("承認")');
    
    // 承認理由を入力（任意）
    await page.fill('textarea[name="approval_note"]', '内容を確認しました。承認します。');
    await page.click('button:has-text("承認する")');

    // 承認成功メッセージ
    await expect(page.locator('text=/承認しました/')).toBeVisible();

    // ステータスが「承認済み」に変わる
    await expect(page.locator('text=/承認済み/')).toBeVisible();

    // 8. 承認待ち一覧から削除されることを確認
    await page.goto('/approvals/pending');
    await expect(page.locator(`text=${quoteNumber}`)).not.toBeVisible();

    // 9. 承認済み一覧に表示されることを確認
    await page.goto('/approvals/approved');
    await expect(page.locator(`text=${quoteNumber}`)).toBeVisible();
  });

  test('承認者が見積を却下できる', async ({ page }) => {
    // 1. 承認者でログイン
    await page.goto('/login');
    const approverEmail = process.env.TEST_APPROVER_EMAIL || 'approver@example.com';
    const approverPassword = process.env.TEST_APPROVER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. 承認待ち一覧から見積を開く
    await page.goto('/approvals/pending');
    await page.click('[data-quote-status="pending"]:first-child');

    // 3. 却下ボタンをクリック
    await page.click('button:has-text("却下")');

    // 4. 却下理由を入力（必須）
    await page.fill('textarea[name="rejection_reason"]', '金額が予算を超えています。再見積をお願いします。');
    await page.click('button:has-text("却下する")');

    // 却下成功メッセージ
    await expect(page.locator('text=/却下しました/')).toBeVisible();

    // ステータスが「却下」に変わる
    await expect(page.locator('text=/却下/')).toBeVisible();
  });

  test('承認者が同時に複数の見積を承認できる', async ({ page }) => {
    // 1. 承認者でログイン
    await page.goto('/login');
    const approverEmail = process.env.TEST_APPROVER_EMAIL || 'approver@example.com';
    const approverPassword = process.env.TEST_APPROVER_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', approverEmail);
    await page.fill('input[type="password"]', approverPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. 承認待ち一覧へ移動
    await page.goto('/approvals/pending');

    // 3. 複数の見積を選択（チェックボックス）
    await page.click('[data-testid="quote-checkbox"]:nth-child(1)');
    await page.click('[data-testid="quote-checkbox"]:nth-child(2)');
    await page.click('[data-testid="quote-checkbox"]:nth-child(3)');

    // 4. 一括承認ボタンをクリック
    await page.click('button:has-text("一括承認")');

    // 確認ダイアログ
    await expect(page.locator('text=/3件の見積を承認しますか/')).toBeVisible();
    await page.click('button:has-text("承認する")');

    // 承認成功メッセージ
    await expect(page.locator('text=/3件承認しました/')).toBeVisible();
  });
});

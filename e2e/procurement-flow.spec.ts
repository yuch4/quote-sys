import { test, expect } from './fixtures';

/**
 * E2E Test: 調達 → 入荷フロー
 * 
 * テストシナリオ:
 * 1. 承認済み見積から発注登録
 * 2. 発注情報（発注日、納期、仕入先）を入力
 * 3. 入荷予定一覧に表示されることを確認
 * 4. 入荷登録を実行
 * 5. 入荷完了ステータスになることを確認
 */
test.describe('調達・入荷フロー', () => {
  test('承認済み見積から発注登録し、入荷確認まで完了できる', async ({ page }) => {
    // 1. ログイン（事務担当者）
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 2. 承認済み見積一覧へ移動
    await page.goto('/quotes?status=approved');
    
    // 最初の承認済み見積を開く
    await page.click('[data-quote-status="approved"]:first-child');

    // 見積番号を保存
    const quoteNumber = await page.locator('[data-testid="quote-number"]').textContent();

    // 3. 発注タブへ移動
    await page.click('button[role="tab"]:has-text("発注管理")');

    // 明細ごとに発注登録ボタンが表示される
    await expect(page.locator('button:has-text("発注登録")')).toBeVisible();

    // 4. 最初の明細の発注登録ボタンをクリック
    await page.click('[data-item-row="0"] button:has-text("発注登録")');

    // 発注フォームが表示される
    await expect(page.locator('form[data-form="procurement"]')).toBeVisible();

    // 5. 発注情報を入力
    const orderDate = new Date().toISOString().split('T')[0];
    await page.fill('input[name="order_date"]', orderDate);

    // 納期（14日後）
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 14);
    await page.fill('input[name="expected_delivery"]', deliveryDate.toISOString().split('T')[0]);

    // 仕入先を選択
    await page.click('button:has-text("仕入先を選択")');
    await page.click('[role="option"]:first-child');

    // 発注数量（デフォルトは見積数量）
    const quantity = await page.inputValue('input[name="quantity"]');
    expect(parseInt(quantity)).toBeGreaterThan(0);

    // 6. 発注を確定
    await page.click('button[type="submit"]:has-text("発注確定")');

    // 発注成功メッセージ
    await expect(page.locator('text=/発注しました/')).toBeVisible();

    // ステータスが「発注済み」に変わる
    await expect(page.locator('[data-item-row="0"] text=/発注済み/')).toBeVisible();

    // 7. 入荷予定一覧へ移動
    await page.goto('/procurement/pending');

    // 発注した明細が表示される
    await expect(page.locator(`text=${quoteNumber}`)).toBeVisible();

    // 8. 入荷登録ボタンをクリック
    await page.click(`[data-quote-number="${quoteNumber}"] button:has-text("入荷登録")`);

    // 入荷フォームが表示される
    await expect(page.locator('form[data-form="receiving"]')).toBeVisible();

    // 9. 入荷情報を入力
    const receivingDate = new Date().toISOString().split('T')[0];
    await page.fill('input[name="receiving_date"]', receivingDate);

    // 入荷数量（デフォルトは発注数量）
    const receivingQuantity = await page.inputValue('input[name="receiving_quantity"]');
    expect(parseInt(receivingQuantity)).toBeGreaterThan(0);

    // 備考（任意）
    await page.fill('textarea[name="notes"]', '検品完了。問題なし。');

    // 10. 入荷を確定
    await page.click('button[type="submit"]:has-text("入荷確定")');

    // 入荷成功メッセージ
    await expect(page.locator('text=/入荷しました/')).toBeVisible();

    // 11. 入荷完了一覧に表示されることを確認
    await page.goto('/procurement/completed');
    await expect(page.locator(`text=${quoteNumber}`)).toBeVisible();

    // 12. 案件詳細で入荷状態を確認
    await page.click(`[data-quote-number="${quoteNumber}"]`);
    await expect(page.locator('text=/入荷完了/')).toBeVisible();
  });

  test('発注時に納期を過去日にできない', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 承認済み見積を開く
    await page.goto('/quotes?status=approved');
    await page.click('[data-quote-status="approved"]:first-child');

    // 発注登録
    await page.click('button[role="tab"]:has-text("発注管理")');
    await page.click('button:has-text("発注登録")');

    // 過去の納期を入力
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    await page.fill('input[name="expected_delivery"]', pastDate.toISOString().split('T')[0]);

    // 発注確定を試みる
    await page.click('button[type="submit"]:has-text("発注確定")');

    // エラーメッセージが表示される
    await expect(page.locator('text=/納期は本日以降の日付を指定してください/')).toBeVisible();
  });

  test('入荷時に発注数量を超える数量を入力できない', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 入荷予定一覧へ移動
    await page.goto('/procurement/pending');
    
    // 入荷登録
    await page.click('button:has-text("入荷登録"):first-child');

    // 発注数量を取得
    const orderQuantity = await page.locator('[data-testid="order-quantity"]').textContent();
    const orderQty = parseInt(orderQuantity || '0');

    // 発注数量を超える数量を入力
    await page.fill('input[name="receiving_quantity"]', String(orderQty + 1));

    // 入荷確定を試みる
    await page.click('button[type="submit"]:has-text("入荷確定")');

    // エラーメッセージが表示される
    await expect(page.locator('text=/発注数量を超える数量は入荷できません/')).toBeVisible();
  });

  test('複数の明細を一括で発注できる', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'password123';
    
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 承認済み見積を開く
    await page.goto('/quotes?status=approved');
    await page.click('[data-quote-status="approved"]:first-child');

    // 発注タブへ移動
    await page.click('button[role="tab"]:has-text("発注管理")');

    // 複数の明細を選択
    await page.click('[data-testid="item-checkbox"]:nth-child(1)');
    await page.click('[data-testid="item-checkbox"]:nth-child(2)');

    // 一括発注ボタンをクリック
    await page.click('button:has-text("一括発注")');

    // 共通の発注情報を入力
    const orderDate = new Date().toISOString().split('T')[0];
    await page.fill('input[name="order_date"]', orderDate);

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 14);
    await page.fill('input[name="expected_delivery"]', deliveryDate.toISOString().split('T')[0]);

    // 仕入先を選択
    await page.click('button:has-text("仕入先を選択")');
    await page.click('[role="option"]:first-child');

    // 発注確定
    await page.click('button[type="submit"]:has-text("一括発注確定")');

    // 成功メッセージ
    await expect(page.locator('text=/2件発注しました/')).toBeVisible();
  });
});

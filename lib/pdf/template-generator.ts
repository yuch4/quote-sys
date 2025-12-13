/**
 * 設定からHTML/CSSを生成するジェネレーター
 */

import type { TemplateSettings } from '@/types/template-settings'

/**
 * 設定からCSSを生成
 */
export function generateCSSFromSettings(settings: TemplateSettings): string {
  const { page, header, customer, company, summary, table, notes, footer, style } = settings

  return `
@page {
  size: ${page.size} ${page.orientation};
  margin: ${page.marginTop}mm ${page.marginRight}mm ${page.marginBottom}mm ${page.marginLeft}mm;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ${style.fontFamily};
  font-size: ${style.baseFontSize}px;
  color: ${style.textColor};
  line-height: 1.5;
}

.document {
  width: 100%;
  max-width: 210mm;
  margin: 0 auto;
  padding: 0;
}

/* ヘッダー */
.header {
  margin-bottom: 20px;
  text-align: ${header.titlePosition};
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.logo-area {
  ${!header.showLogo ? 'display: none;' : ''}
  text-align: ${header.logoPosition};
  flex: 1;
}

.logo-area img {
  max-height: ${header.logoMaxHeight}px;
  width: auto;
}

.document-title {
  font-size: ${header.titleFontSize}px;
  font-weight: bold;
  text-align: ${header.titlePosition};
  margin: 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid ${style.primaryColor};
}

.meta-info {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  font-size: 11px;
  ${!header.showQuoteNumber && !header.showIssueDate && !header.showValidDate ? 'display: none;' : ''}
}

.meta-info .label {
  color: #666;
}

/* 当事者情報エリア */
.parties {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  gap: 30px;
}

.customer-section {
  ${!customer.show ? 'display: none;' : ''}
  order: ${customer.position === 'left' ? 0 : 1};
  flex: 1;
  font-size: ${customer.fontSize}px;
}

.customer-name {
  font-size: ${customer.fontSize + 4}px;
  font-weight: bold;
  border-bottom: 1px solid ${style.textColor};
  padding-bottom: 5px;
  margin-bottom: 8px;
}

.customer-name .honorific {
  ${!customer.showHonorific ? 'display: none;' : ''}
  font-weight: normal;
  margin-left: 10px;
}

.company-section {
  ${!company.show ? 'display: none;' : ''}
  order: ${company.position === 'left' ? 0 : 1};
  text-align: ${company.position === 'right' ? 'right' : 'left'};
  flex: 1;
  font-size: ${company.fontSize}px;
}

.company-name {
  font-size: ${company.fontSize + 2}px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stamp-area {
  ${!company.showStampArea ? 'display: none;' : ''}
  display: inline-flex;
  gap: 5px;
  margin-top: 10px;
}

.stamp-area .stamp {
  width: ${company.stampSize}px;
  height: ${company.stampSize}px;
  border: 1px dashed #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #999;
}

/* 金額サマリー */
.summary-section {
  ${!summary.show ? 'display: none;' : ''}
  margin-bottom: 20px;
  ${summary.position === 'bottom' ? 'margin-top: 20px; margin-bottom: 0;' : ''}
}

.summary-top {
  ${summary.position === 'bottom' ? 'display: none;' : ''}
}

.summary-bottom {
  ${summary.position === 'top' ? 'display: none;' : ''}
}

.total-box {
  ${summary.highlightTotal ? `
    background: linear-gradient(135deg, ${style.primaryColor}10, ${style.primaryColor}05);
    border: 2px solid ${style.primaryColor};
    border-radius: ${style.borderRadius}px;
    padding: 15px 20px;
  ` : ''}
  display: inline-block;
}

.total-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
}

.total-amount {
  font-size: ${summary.totalFontSize}px;
  font-weight: bold;
  color: ${style.primaryColor};
}

.summary-details {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  font-size: 11px;
}

.summary-details .item {
  display: flex;
  gap: 10px;
}

.summary-details .label {
  color: #666;
}

/* 明細テーブル */
.items-section {
  margin: 20px 0;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: ${table.fontSize}px;
}

.items-table th {
  background-color: ${table.headerBgColor};
  color: ${table.headerTextColor};
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  border: ${table.borderWidth}px solid ${table.borderColor};
}

.items-table td {
  padding: 8px;
  border: ${table.borderWidth}px solid ${table.borderColor};
  vertical-align: top;
}

${table.alternateRowColor ? `
.items-table tbody tr:nth-child(even) {
  background-color: ${table.alternateRowBgColor};
}
` : ''}

.items-table .col-no {
  ${!table.showRowNumber ? 'display: none;' : ''}
  width: 40px;
  text-align: center;
}

.items-table .col-name {
  ${!table.showItemName ? 'display: none;' : ''}
  min-width: 150px;
}

.items-table .col-description {
  ${!table.showDescription ? 'display: none;' : ''}
}

.items-table .col-quantity {
  ${!table.showQuantity ? 'display: none;' : ''}
  width: 60px;
  text-align: right;
}

.items-table .col-unit {
  ${!table.showUnit ? 'display: none;' : ''}
  width: 50px;
  text-align: center;
}

.items-table .col-unit-price {
  ${!table.showUnitPrice ? 'display: none;' : ''}
  width: 100px;
  text-align: right;
}

.items-table .col-amount {
  ${!table.showAmount ? 'display: none;' : ''}
  width: 110px;
  text-align: right;
}

.items-table .col-supplier {
  ${!table.showSupplier ? 'display: none;' : ''}
  width: 100px;
}

/* 備考 */
.notes-section {
  ${!notes.show ? 'display: none;' : ''}
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid ${table.borderColor};
  font-size: ${notes.fontSize}px;
}

.notes-section h3 {
  font-size: ${notes.fontSize + 2}px;
  margin-bottom: 8px;
  color: #666;
}

.notes-content {
  white-space: pre-wrap;
  max-height: ${notes.maxLines * 1.5}em;
  overflow: hidden;
}

/* フッター */
.footer {
  ${!footer.show ? 'display: none;' : ''}
  margin-top: 30px;
  padding-top: 10px;
  border-top: 1px solid ${table.borderColor};
  font-size: ${footer.fontSize}px;
  color: #666;
  display: flex;
  justify-content: space-between;
}

.page-number {
  ${!footer.showPageNumber ? 'display: none;' : ''}
}
`.trim()
}

/**
 * 設定からHTMLを生成
 */
export function generateHTMLFromSettings(settings: TemplateSettings): string {
  const { header, customer, company, summary, table, notes, footer } = settings

  // 表示する列のヘッダー生成
  const tableHeaders: string[] = []
  if (table.showRowNumber) tableHeaders.push('<th class="col-no">No.</th>')
  if (table.showItemName) tableHeaders.push('<th class="col-name">品名</th>')
  if (table.showDescription) tableHeaders.push('<th class="col-description">仕様・説明</th>')
  if (table.showQuantity) tableHeaders.push('<th class="col-quantity">数量</th>')
  if (table.showUnit) tableHeaders.push('<th class="col-unit">単位</th>')
  if (table.showUnitPrice) tableHeaders.push('<th class="col-unit-price">単価</th>')
  if (table.showAmount) tableHeaders.push('<th class="col-amount">金額</th>')
  if (table.showSupplier) tableHeaders.push('<th class="col-supplier">仕入先</th>')

  // 表示する列のデータセル生成
  const tableCells: string[] = []
  if (table.showRowNumber) tableCells.push('<td class="col-no">{{@index}}</td>')
  if (table.showItemName) tableCells.push('<td class="col-name">{{item_name}}</td>')
  if (table.showDescription) tableCells.push('<td class="col-description">{{description}}</td>')
  if (table.showQuantity) tableCells.push('<td class="col-quantity">{{quantity}}</td>')
  if (table.showUnit) tableCells.push('<td class="col-unit">{{unit}}</td>')
  if (table.showUnitPrice) tableCells.push('<td class="col-unit-price">{{formatCurrency unit_price}}</td>')
  if (table.showAmount) tableCells.push('<td class="col-amount">{{formatCurrency amount}}</td>')
  if (table.showSupplier) tableCells.push('<td class="col-supplier">{{supplier_name}}</td>')

  const summarySection = `
    <div class="summary-section">
      <div class="total-box">
        <div class="total-label">合計金額（税込）</div>
        <div class="total-amount">{{formatCurrency totalWithTax}}</div>
      </div>
      ${summary.showSubtotal || summary.showTax ? `
      <div class="summary-details">
        ${summary.showSubtotal ? '<div class="item"><span class="label">小計:</span><span>{{formatCurrency subtotal}}</span></div>' : ''}
        ${summary.showTax ? '<div class="item"><span class="label">消費税:</span><span>{{formatCurrency taxAmount}}</span></div>' : ''}
      </div>
      ` : ''}
    </div>`

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${header.titleText}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="document">
    <!-- ヘッダー -->
    <header class="header">
      ${header.showLogo ? `
      <div class="logo-area">
        {{#if companyLogo}}<img src="{{companyLogo}}" alt="会社ロゴ">{{/if}}
      </div>
      ` : ''}
      <h1 class="document-title">${header.titleText}</h1>
      <div class="meta-info">
        ${header.showQuoteNumber ? '<div><span class="label">見積番号:</span> {{quoteNumber}}</div>' : ''}
        ${header.showIssueDate ? '<div><span class="label">発行日:</span> {{formatDate issueDate}}</div>' : ''}
        ${header.showValidDate ? '<div><span class="label">有効期限:</span> {{formatDate validUntil}}</div>' : ''}
      </div>
    </header>

    <!-- 当事者情報 -->
    <section class="parties">
      ${customer.show ? `
      <div class="customer-section">
        ${customer.showCustomerName ? `
        <div class="customer-name">
          {{customerName}}
          ${customer.showHonorific ? '<span class="honorific">御中</span>' : ''}
        </div>
        ` : ''}
        ${customer.showAddress ? '<div class="customer-address">{{nl2br customerAddress}}</div>' : ''}
        ${customer.showContactPerson ? '{{#if customerContact}}<div class="customer-contact">{{customerContact}} 様</div>{{/if}}' : ''}
      </div>
      ` : ''}

      ${company.show ? `
      <div class="company-section">
        ${company.showCompanyName ? '<div class="company-name">{{companyName}}</div>' : ''}
        ${company.showAddress ? '<div class="company-address">{{nl2br companyAddress}}</div>' : ''}
        ${company.showRepName ? '{{#if salesRepName}}<div class="company-rep">担当: {{salesRepName}}</div>{{/if}}' : ''}
        ${company.showStampArea ? `
        <div class="stamp-area">
          <div class="stamp">承認</div>
          <div class="stamp">確認</div>
          <div class="stamp">担当</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </section>

    ${summary.position === 'top' || summary.position === 'both' ? `<div class="summary-top">${summarySection}</div>` : ''}

    <!-- 明細テーブル -->
    <section class="items-section">
      <table class="items-table">
        <thead>
          <tr>
            ${tableHeaders.join('\n            ')}
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            ${tableCells.join('\n            ')}
          </tr>
          {{/each}}
        </tbody>
      </table>
    </section>

    ${summary.position === 'bottom' || summary.position === 'both' ? `<div class="summary-bottom">${summarySection}</div>` : ''}

    ${notes.show ? `
    <!-- 備考 -->
    <section class="notes-section">
      <h3>備考</h3>
      <div class="notes-content">{{nl2br notes}}</div>
    </section>
    ` : ''}

    ${footer.show ? `
    <!-- フッター -->
    <footer class="footer">
      <div class="custom-text">${footer.customText}</div>
      ${footer.showPageNumber ? '<div class="page-number">Page 1</div>' : ''}
    </footer>
    ` : ''}
  </div>
</body>
</html>`
}

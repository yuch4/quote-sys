/**
 * デフォルト見積書テンプレート
 * HTML/CSS形式で日本式見積書レイアウトを定義
 */

export const DEFAULT_QUOTE_TEMPLATE_HTML = `
<div class="quote-document">
  <!-- ヘッダー: タイトル + 見積番号 -->
  <div class="header">
    <h1 class="title">御 見 積 書</h1>
    <div class="document-info">
      <p>見積No. {{quoteNo}}</p>
      <p>発行日 {{issuedAt}}</p>
    </div>
  </div>

  <!-- 宛先と会社情報 -->
  <div class="parties-section">
    <div class="customer-section">
      <div class="customer-name">
        <span class="name">{{customerName}}</span>
        <span class="honorific">御中</span>
      </div>
      {{#if customerAddress}}
      <p class="customer-address">{{customerAddress}}</p>
      {{/if}}
    </div>
    
    <div class="company-section">
      {{#if companyLogoUrl}}
      <img src="{{companyLogoUrl}}" alt="会社ロゴ" class="company-logo">
      {{/if}}
      <p class="company-name">{{companyName}}</p>
      <p class="company-address">{{{addressBr companyAddress}}}</p>
      
      <!-- 印鑑エリア -->
      <div class="stamp-area">
        <div class="stamp-box">
          {{#if stamps.slot2}}
          <img src="{{stamps.slot2.image_url}}" alt="承認印" class="stamp-image">
          {{else}}
          <span class="stamp-label">承認</span>
          {{/if}}
        </div>
        <div class="stamp-box">
          {{#if stamps.slot1}}
          <img src="{{stamps.slot1.image_url}}" alt="担当印" class="stamp-image">
          {{else}}
          <span class="stamp-label">担当</span>
          {{/if}}
        </div>
      </div>
    </div>
  </div>

  <!-- 挨拶文 -->
  <div class="greeting">
    <p>ご照会の件、下記の通りお見積り申し上げます。</p>
  </div>

  <!-- 概要ボックス -->
  <div class="summary-box">
    <table class="summary-table">
      <tr>
        <th>件　　名</th>
        <td class="subject">{{#if subject}}{{subject}}{{else}}{{projectName}}{{/if}}</td>
      </tr>
      <tr>
        <th>金　　額</th>
        <td class="amount">
          <span class="total-amount">{{formatCurrency total}}-</span>
          <span class="tax-note">（税抜き価格）</span>
        </td>
      </tr>
      <tr>
        <th>納　　期</th>
        <td>別途お打合せ</td>
      </tr>
      <tr>
        <th>取引条件</th>
        <td>従来通り</td>
      </tr>
      <tr>
        <th>有効期限</th>
        <td>発行日より1ヶ月</td>
      </tr>
    </table>
    <p class="tax-notice">※ご請求時には別途、法令所定の消費税等を合わせてご請求させて頂きます。</p>
  </div>

  <!-- 明細テーブル -->
  <div class="items-section">
    <h2 class="section-title">明細</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-name">品名・仕様</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単価</th>
          <th class="col-amount">金額</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td class="col-no">{{lineNumber}}</td>
          <td class="col-name">
            <span class="product-name">{{productName}}</span>
            {{#if description}}
            <span class="description">{{description}}</span>
            {{/if}}
          </td>
          <td class="col-qty">{{quantity}}</td>
          <td class="col-unit">{{formatCurrency unitPrice}}</td>
          <td class="col-amount">{{formatCurrency amount}}</td>
        </tr>
        {{/each}}
      </tbody>
      <tfoot>
        <tr class="subtotal-row">
          <td colspan="4" class="label">小計</td>
          <td class="col-amount">{{formatCurrency subtotal}}</td>
        </tr>
        {{#if taxAmount}}
        <tr class="tax-row">
          <td colspan="4" class="label">消費税</td>
          <td class="col-amount">{{formatCurrency taxAmount}}</td>
        </tr>
        {{/if}}
        <tr class="total-row">
          <td colspan="4" class="label">合計金額</td>
          <td class="col-amount">{{formatCurrency total}}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  {{#if notes}}
  <!-- 備考 -->
  <div class="notes-section">
    <h2 class="section-title">備考</h2>
    <div class="notes-content">
      {{{nl2br notes}}}
    </div>
  </div>
  {{/if}}

  <!-- 角印エリア（右下） -->
  {{#if stamps.companySeal}}
  <div class="company-seal-area">
    <img src="{{stamps.companySeal.image_url}}" alt="角印" class="company-seal">
  </div>
  {{/if}}
</div>
`

export const DEFAULT_QUOTE_TEMPLATE_CSS = `
/* 見積書全体 */
.quote-document {
  padding: 20px 30px;
  font-size: 10pt;
  position: relative;
}

/* ヘッダー */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  border-bottom: 2px solid #333;
  padding-bottom: 15px;
}

.title {
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  letter-spacing: 8px;
}

.document-info {
  text-align: right;
  font-size: 10pt;
}

.document-info p {
  margin: 3px 0;
}

/* 宛先と会社情報 */
.parties-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
}

.customer-section {
  flex: 1;
}

.customer-name {
  font-size: 14pt;
  margin-bottom: 8px;
}

.customer-name .name {
  font-weight: bold;
  border-bottom: 1px solid #333;
  padding-bottom: 2px;
}

.customer-name .honorific {
  margin-left: 10px;
  font-size: 10pt;
}

.customer-address {
  font-size: 9pt;
  color: #555;
  margin: 5px 0 0 0;
}

.company-section {
  text-align: right;
  flex: 0 0 45%;
}

.company-logo {
  max-width: 120px;
  max-height: 50px;
  margin-bottom: 8px;
}

.company-name {
  font-weight: bold;
  font-size: 12pt;
  margin: 0 0 5px 0;
}

.company-address {
  font-size: 9pt;
  margin: 0 0 10px 0;
  line-height: 1.4;
}

/* 印鑑エリア */
.stamp-area {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.stamp-box {
  width: 50px;
  height: 50px;
  border: 1px solid #999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.stamp-label {
  font-size: 8pt;
  color: #999;
}

.stamp-image {
  width: 45px;
  height: 45px;
  object-fit: contain;
}

/* 挨拶文 */
.greeting {
  margin-bottom: 20px;
}

.greeting p {
  margin: 0;
}

/* 概要ボックス */
.summary-box {
  border: 1px solid #333;
  margin-bottom: 25px;
  padding: 15px;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th {
  width: 100px;
  text-align: left;
  font-weight: bold;
  padding: 8px 10px;
  border-bottom: 1px solid #ddd;
  background-color: #f5f5f5;
}

.summary-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #ddd;
}

.summary-table tr:last-child th,
.summary-table tr:last-child td {
  border-bottom: none;
}

.summary-table .subject {
  font-weight: bold;
}

.summary-table .amount {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.total-amount {
  font-size: 16pt;
  font-weight: bold;
  color: #000;
}

.tax-note {
  font-size: 9pt;
  color: #c00;
}

.tax-notice {
  font-size: 9pt;
  color: #c00;
  margin: 10px 0 0 0;
}

/* セクションタイトル */
.section-title {
  font-size: 11pt;
  font-weight: bold;
  border-bottom: 2px solid #333;
  padding-bottom: 5px;
  margin: 0 0 10px 0;
}

/* 明細テーブル */
.items-section {
  margin-bottom: 25px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
}

.items-table th {
  background-color: #f0f0f0;
  border: 1px solid #333;
  padding: 8px;
  text-align: center;
  font-weight: bold;
}

.items-table td {
  border: 1px solid #333;
  padding: 8px;
}

.items-table .col-no {
  width: 40px;
  text-align: center;
}

.items-table .col-name {
  text-align: left;
}

.items-table .col-qty {
  width: 60px;
  text-align: right;
}

.items-table .col-unit,
.items-table .col-amount {
  width: 100px;
  text-align: right;
}

.product-name {
  display: block;
  font-weight: bold;
}

.description {
  display: block;
  font-size: 8pt;
  color: #666;
  margin-top: 3px;
}

/* フッター行 */
.items-table tfoot td {
  background-color: #f9f9f9;
}

.items-table tfoot .label {
  text-align: right;
  font-weight: bold;
}

.total-row td {
  background-color: #e8e8e8 !important;
  font-size: 11pt;
  font-weight: bold;
}

/* 備考 */
.notes-section {
  margin-bottom: 25px;
}

.notes-content {
  padding: 10px;
  background-color: #fafafa;
  border: 1px solid #ddd;
  font-size: 9pt;
  line-height: 1.6;
}

/* 角印エリア */
.company-seal-area {
  position: absolute;
  bottom: 100px;
  right: 80px;
}

.company-seal {
  width: 80px;
  height: 80px;
  object-fit: contain;
  opacity: 0.9;
}

/* 印刷設定 */
@media print {
  .quote-document {
    padding: 0;
  }
  
  .items-table {
    break-inside: auto;
  }
  
  .items-table tr {
    break-inside: avoid;
  }
}
`

// テンプレートで使用可能な変数のスキーマ
export const QUOTE_TEMPLATE_VARIABLES = [
  { key: 'quoteNo', type: 'string', label: '見積番号', required: true },
  { key: 'issuedAt', type: 'date', label: '発行日', required: true },
  { key: 'validUntil', type: 'date', label: '有効期限' },
  { key: 'subject', type: 'string', label: '件名' },
  { key: 'customerName', type: 'string', label: '顧客名', required: true },
  { key: 'customerPostalCode', type: 'string', label: '顧客郵便番号' },
  { key: 'customerAddress', type: 'string', label: '顧客住所' },
  { key: 'customerPhone', type: 'string', label: '顧客電話番号' },
  { key: 'projectNumber', type: 'string', label: '案件番号' },
  { key: 'projectName', type: 'string', label: '案件名' },
  { key: 'salesRepName', type: 'string', label: '営業担当者名' },
  { 
    key: 'items', 
    type: 'array', 
    label: '明細', 
    description: '明細配列: lineNumber, productName, description, quantity, unitPrice, amount' 
  },
  { key: 'subtotal', type: 'currency', label: '小計', required: true },
  { key: 'taxAmount', type: 'currency', label: '消費税額' },
  { key: 'total', type: 'currency', label: '合計金額', required: true },
  { key: 'notes', type: 'string', label: '備考' },
  { key: 'companyName', type: 'string', label: '自社名', required: true },
  { key: 'companyAddress', type: 'string', label: '自社住所' },
  { key: 'companyLogoUrl', type: 'string', label: '自社ロゴURL' },
  { 
    key: 'stamps', 
    type: 'object', 
    label: '押印情報', 
    description: 'slot1, slot2, slot3（担当印）, companySeal（角印）' 
  },
]

// 発注書デフォルトテンプレート
export const DEFAULT_PURCHASE_ORDER_TEMPLATE_HTML = `
<div class="purchase-order-document">
  <!-- ヘッダー: タイトル + 発注番号 -->
  <div class="header">
    <h1 class="title">発 注 書</h1>
    <div class="document-info">
      <p>発注No. {{purchaseOrderNo}}</p>
      <p>発行日 {{orderDate}}</p>
    </div>
  </div>

  <!-- 仕入先と会社情報 -->
  <div class="parties-section">
    <div class="supplier-section">
      <div class="supplier-name">
        <span class="name">{{supplierName}}</span>
        <span class="honorific">御中</span>
      </div>
      {{#if supplierAddress}}
      <p class="supplier-address">{{{addressBr supplierAddress}}}</p>
      {{/if}}
    </div>
    
    <div class="company-section">
      <p class="company-name">{{companyName}}</p>
      <p class="company-address">{{{addressBr companyAddress}}}</p>
      
      <!-- 印鑑エリア -->
      <div class="stamp-area">
        <div class="stamp-box">
          {{#if stamps.slot2}}
          <img src="{{stamps.slot2.image_url}}" alt="承認印" class="stamp-image">
          {{else}}
          <span class="stamp-label">承認</span>
          {{/if}}
        </div>
        <div class="stamp-box">
          {{#if stamps.slot1}}
          <img src="{{stamps.slot1.image_url}}" alt="担当印" class="stamp-image">
          {{else}}
          <span class="stamp-label">担当</span>
          {{/if}}
        </div>
      </div>
    </div>
  </div>

  <!-- 挨拶文 -->
  <div class="greeting">
    <p>下記の通り発注いたします。</p>
  </div>

  <!-- 概要ボックス -->
  <div class="summary-box">
    <table class="summary-table">
      <tr>
        <th>関連見積</th>
        <td>{{quoteNumber}}</td>
      </tr>
      <tr>
        <th>案件名</th>
        <td>{{projectName}}</td>
      </tr>
      <tr>
        <th>金　額</th>
        <td class="amount">
          <span class="total-amount">{{formatCurrency total}}-</span>
          <span class="tax-note">（税抜き価格）</span>
        </td>
      </tr>
      <tr>
        <th>納　期</th>
        <td>別途ご連絡</td>
      </tr>
      <tr>
        <th>納入場所</th>
        <td>指定場所</td>
      </tr>
    </table>
  </div>

  <!-- 明細テーブル -->
  <div class="items-section">
    <h2 class="section-title">明細</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-no">No.</th>
          <th class="col-name">品名・仕様</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単価</th>
          <th class="col-amount">金額</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td class="col-no">{{lineNumber}}</td>
          <td class="col-name">
            <span class="product-name">{{productName}}</span>
            {{#if description}}
            <span class="description">{{description}}</span>
            {{/if}}
          </td>
          <td class="col-qty">{{quantity}}</td>
          <td class="col-unit">{{formatCurrency unitCost}}</td>
          <td class="col-amount">{{formatCurrency amount}}</td>
        </tr>
        {{/each}}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" class="label">合計金額</td>
          <td class="col-amount">{{formatCurrency total}}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  {{#if notes}}
  <!-- 備考 -->
  <div class="notes-section">
    <h2 class="section-title">備考</h2>
    <div class="notes-content">
      {{{nl2br notes}}}
    </div>
  </div>
  {{/if}}

  <!-- 角印エリア（右下） -->
  {{#if stamps.companySeal}}
  <div class="company-seal-area">
    <img src="{{stamps.companySeal.image_url}}" alt="角印" class="company-seal">
  </div>
  {{/if}}
</div>
`

export const DEFAULT_PURCHASE_ORDER_TEMPLATE_CSS = `
/* 発注書全体 */
.purchase-order-document {
  padding: 20px 30px;
  font-size: 10pt;
  position: relative;
}

/* ヘッダー */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  border-bottom: 2px solid #333;
  padding-bottom: 15px;
}

.title {
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  letter-spacing: 8px;
}

.document-info {
  text-align: right;
  font-size: 10pt;
}

.document-info p {
  margin: 3px 0;
}

/* 仕入先と会社情報 */
.parties-section {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
}

.supplier-section {
  flex: 1;
}

.supplier-name {
  font-size: 14pt;
  border-bottom: 2px solid #333;
  padding-bottom: 5px;
  display: inline-block;
}

.supplier-name .name {
  font-weight: bold;
}

.supplier-name .honorific {
  margin-left: 20px;
}

.supplier-address {
  margin-top: 8px;
  font-size: 9pt;
  color: #666;
}

.company-section {
  text-align: right;
  width: 250px;
}

.company-name {
  font-size: 12pt;
  font-weight: bold;
  margin-bottom: 5px;
}

.company-address {
  font-size: 9pt;
  color: #666;
  margin-bottom: 10px;
}

/* 印鑑エリア */
.stamp-area {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 10px;
}

.stamp-box {
  width: 50px;
  height: 50px;
  border: 1px solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stamp-label {
  font-size: 8pt;
  color: #999;
}

.stamp-image {
  width: 45px;
  height: 45px;
  object-fit: contain;
}

/* 挨拶文 */
.greeting {
  margin-bottom: 20px;
  padding: 10px 0;
}

/* 概要ボックス */
.summary-box {
  border: 1px solid #333;
  padding: 15px;
  margin-bottom: 25px;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th {
  width: 100px;
  text-align: left;
  padding: 8px;
  vertical-align: top;
  font-weight: normal;
}

.summary-table td {
  padding: 8px;
}

.total-amount {
  font-size: 16pt;
  font-weight: bold;
}

.tax-note {
  font-size: 8pt;
  color: #666;
  margin-left: 10px;
}

/* 明細セクション */
.items-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 11pt;
  font-weight: bold;
  margin-bottom: 10px;
  padding-left: 5px;
  border-left: 3px solid #333;
}

/* 明細テーブル */
.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  border: 1px solid #ccc;
  padding: 8px;
}

.items-table th {
  background-color: #f5f5f5;
  font-weight: bold;
  text-align: center;
}

.items-table td {
  vertical-align: top;
}

.col-no {
  width: 40px;
  text-align: center;
}

.col-name {
  min-width: 200px;
}

.col-qty {
  width: 60px;
  text-align: right;
}

.col-unit {
  width: 100px;
  text-align: right;
}

.col-amount {
  width: 120px;
  text-align: right;
}

.product-name {
  display: block;
  font-weight: bold;
}

.description {
  display: block;
  font-size: 9pt;
  color: #666;
  margin-top: 3px;
}

/* フッター行 */
.items-table tfoot td {
  font-weight: bold;
}

.total-row td {
  background-color: #f0f0f0;
}

.label {
  text-align: right;
}

/* 備考セクション */
.notes-section {
  margin-top: 20px;
}

.notes-content {
  border: 1px solid #ccc;
  padding: 10px;
  background-color: #fafafa;
  font-size: 9pt;
  min-height: 50px;
}

/* 角印エリア */
.company-seal-area {
  position: absolute;
  bottom: 100px;
  right: 50px;
}

.company-seal {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

/* 印刷設定 */
@media print {
  .purchase-order-document {
    padding: 0;
  }
  
  .items-table {
    break-inside: auto;
  }
  
  .items-table tr {
    break-inside: avoid;
  }
}
`

// 発注書テンプレート変数
export const PURCHASE_ORDER_TEMPLATE_VARIABLES = [
  { key: 'purchaseOrderNo', type: 'string', label: '発注番号', required: true },
  { key: 'orderDate', type: 'date', label: '発行日', required: true },
  { key: 'supplierName', type: 'string', label: '仕入先名', required: true },
  { key: 'supplierAddress', type: 'string', label: '仕入先住所' },
  { key: 'quoteNumber', type: 'string', label: '関連見積番号' },
  { key: 'projectName', type: 'string', label: '案件名' },
  { 
    key: 'items', 
    type: 'array', 
    label: '明細', 
    description: '明細配列: lineNumber, productName, description, quantity, unitCost, amount' 
  },
  { key: 'total', type: 'currency', label: '合計金額', required: true },
  { key: 'notes', type: 'string', label: '備考' },
  { key: 'companyName', type: 'string', label: '自社名', required: true },
  { key: 'companyAddress', type: 'string', label: '自社住所' },
  { 
    key: 'stamps', 
    type: 'object', 
    label: '押印情報', 
    description: 'slot1, slot2（担当印）, companySeal（角印）' 
  },
]

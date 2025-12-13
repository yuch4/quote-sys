/**
 * Puppeteer PDF生成モジュール
 * HTML/CSSからPDFを生成（Headless Chromium使用）
 */

import puppeteer, { Browser, PDFOptions } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

let browserInstance: Browser | null = null

/**
 * ブラウザインスタンスを取得（シングルトン）
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  // Vercel/Lambda環境かローカル環境かで分岐
  const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

  if (isVercel) {
    // Vercel/Lambda環境: @sparticuz/chromiumを使用
    browserInstance = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    // ローカル環境: システムにインストールされたChromeを使用
    const executablePath = process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome'

    browserInstance = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })
  }

  return browserInstance
}

/**
 * ブラウザを閉じる
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

export interface PDFGenerationOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal'
  landscape?: boolean
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  printBackground?: boolean
  preferCSSPageSize?: boolean
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

const DEFAULT_OPTIONS: PDFGenerationOptions = {
  format: 'A4',
  landscape: false,
  margin: {
    top: '15mm',
    right: '10mm',
    bottom: '15mm',
    left: '10mm',
  },
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
}

/**
 * HTMLからPDFを生成
 * @param html 完全なHTMLドキュメント
 * @param options PDF生成オプション
 * @returns PDFのBuffer
 */
export async function generatePDFFromHTML(
  html: string,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // HTMLをセット
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    })

    // フォントの読み込みを待つ
    await page.evaluateHandle('document.fonts.ready')

    // マージ済みオプション
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

    // PDF生成
    const pdfOptions: PDFOptions = {
      format: mergedOptions.format,
      landscape: mergedOptions.landscape,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      preferCSSPageSize: mergedOptions.preferCSSPageSize,
      displayHeaderFooter: mergedOptions.displayHeaderFooter,
    }

    if (mergedOptions.displayHeaderFooter) {
      pdfOptions.headerTemplate = mergedOptions.headerTemplate || '<div></div>'
      pdfOptions.footerTemplate = mergedOptions.footerTemplate || `
        <div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    }

    const pdfBuffer = await page.pdf(pdfOptions)

    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
  }
}

/**
 * HTMLプレビュー用のスクリーンショットを生成
 * @param html 完全なHTMLドキュメント
 * @returns PNGのBuffer
 */
export async function generatePreviewFromHTML(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // A4サイズのビューポート設定（96dpi基準）
    await page.setViewport({
      width: 794, // A4幅 210mm ≈ 794px at 96dpi
      height: 1123, // A4高さ 297mm ≈ 1123px at 96dpi
      deviceScaleFactor: 2, // Retinaディスプレイ対応
    })

    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    })

    await page.evaluateHandle('document.fonts.ready')

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
    })

    return Buffer.from(screenshot)
  } finally {
    await page.close()
  }
}

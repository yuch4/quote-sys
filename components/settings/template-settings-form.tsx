'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { TemplateSettings } from '@/types/template-settings'

interface TemplateSettingsFormProps {
  settings: TemplateSettings
  onChange: (settings: TemplateSettings) => void
}

export function TemplateSettingsForm({ settings, onChange }: TemplateSettingsFormProps) {
  const updateSettings = <K extends keyof TemplateSettings>(
    section: K,
    updates: Partial<TemplateSettings[K]>
  ) => {
    onChange({
      ...settings,
      [section]: { ...settings[section], ...updates },
    })
  }

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={['page', 'header', 'customer']} className="w-full">
        {/* ページ設定 */}
        <AccordionItem value="page">
          <AccordionTrigger>📄 ページ設定</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>用紙サイズ</Label>
                <Select
                  value={settings.page.size}
                  onValueChange={(v) => updateSettings('page', { size: v as 'A4' | 'A3' | 'B4' | 'B5' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                    <SelectItem value="B4">B4</SelectItem>
                    <SelectItem value="B5">B5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>向き</Label>
                <Select
                  value={settings.page.orientation}
                  onValueChange={(v) => updateSettings('page', { orientation: v as 'portrait' | 'landscape' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">縦</SelectItem>
                    <SelectItem value="landscape">横</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>余白 (mm)</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">上</Label>
                    <Input
                      type="number"
                      value={settings.page.marginTop}
                      onChange={(e) => updateSettings('page', { marginTop: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">下</Label>
                    <Input
                      type="number"
                      value={settings.page.marginBottom}
                      onChange={(e) => updateSettings('page', { marginBottom: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">左</Label>
                    <Input
                      type="number"
                      value={settings.page.marginLeft}
                      onChange={(e) => updateSettings('page', { marginLeft: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">右</Label>
                    <Input
                      type="number"
                      value={settings.page.marginRight}
                      onChange={(e) => updateSettings('page', { marginRight: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ヘッダー設定 */}
        <AccordionItem value="header">
          <AccordionTrigger>📝 ヘッダー・タイトル</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>タイトル文字</Label>
                  <Input
                    value={settings.header.titleText}
                    onChange={(e) => updateSettings('header', { titleText: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>タイトル位置</Label>
                  <Select
                    value={settings.header.titlePosition}
                    onValueChange={(v) => updateSettings('header', { titlePosition: v as 'left' | 'center' | 'right' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">左寄せ</SelectItem>
                      <SelectItem value="center">中央</SelectItem>
                      <SelectItem value="right">右寄せ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>タイトル文字サイズ: {settings.header.titleFontSize}px</Label>
                <Slider
                  value={[settings.header.titleFontSize]}
                  onValueChange={([v]) => updateSettings('header', { titleFontSize: v })}
                  min={16}
                  max={36}
                  step={1}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.header.showQuoteNumber}
                    onCheckedChange={(v) => updateSettings('header', { showQuoteNumber: v })}
                  />
                  <Label>見積番号</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.header.showIssueDate}
                    onCheckedChange={(v) => updateSettings('header', { showIssueDate: v })}
                  />
                  <Label>発行日</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.header.showValidDate}
                    onCheckedChange={(v) => updateSettings('header', { showValidDate: v })}
                  />
                  <Label>有効期限</Label>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.header.showLogo}
                  onCheckedChange={(v) => updateSettings('header', { showLogo: v })}
                />
                <Label>会社ロゴを表示</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 顧客情報設定 */}
        <AccordionItem value="customer">
          <AccordionTrigger>👤 顧客情報</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.customer.show}
                  onCheckedChange={(v) => updateSettings('customer', { show: v })}
                />
                <Label>顧客情報を表示</Label>
              </div>
              {settings.customer.show && (
                <>
                  <div className="space-y-2">
                    <Label>表示位置</Label>
                    <Select
                      value={settings.customer.position}
                      onValueChange={(v) => updateSettings('customer', { position: v as 'left' | 'right' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">左側</SelectItem>
                        <SelectItem value="right">右側</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.customer.showCustomerName}
                        onCheckedChange={(v) => updateSettings('customer', { showCustomerName: v })}
                      />
                      <Label>顧客名</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.customer.showHonorific}
                        onCheckedChange={(v) => updateSettings('customer', { showHonorific: v })}
                      />
                      <Label>「御中」を表示</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.customer.showAddress}
                        onCheckedChange={(v) => updateSettings('customer', { showAddress: v })}
                      />
                      <Label>住所</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.customer.showContactPerson}
                        onCheckedChange={(v) => updateSettings('customer', { showContactPerson: v })}
                      />
                      <Label>担当者名</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>文字サイズ: {settings.customer.fontSize}px</Label>
                    <Slider
                      value={[settings.customer.fontSize]}
                      onValueChange={([v]) => updateSettings('customer', { fontSize: v })}
                      min={10}
                      max={18}
                      step={1}
                    />
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 自社情報設定 */}
        <AccordionItem value="company">
          <AccordionTrigger>🏢 自社情報</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.company.show}
                  onCheckedChange={(v) => updateSettings('company', { show: v })}
                />
                <Label>自社情報を表示</Label>
              </div>
              {settings.company.show && (
                <>
                  <div className="space-y-2">
                    <Label>表示位置</Label>
                    <Select
                      value={settings.company.position}
                      onValueChange={(v) => updateSettings('company', { position: v as 'left' | 'right' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">左側</SelectItem>
                        <SelectItem value="right">右側</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.company.showCompanyName}
                        onCheckedChange={(v) => updateSettings('company', { showCompanyName: v })}
                      />
                      <Label>会社名</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.company.showAddress}
                        onCheckedChange={(v) => updateSettings('company', { showAddress: v })}
                      />
                      <Label>住所</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.company.showRepName}
                        onCheckedChange={(v) => updateSettings('company', { showRepName: v })}
                      />
                      <Label>担当者名</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.company.showStampArea}
                        onCheckedChange={(v) => updateSettings('company', { showStampArea: v })}
                      />
                      <Label>印鑑エリア</Label>
                    </div>
                  </div>
                  {settings.company.showStampArea && (
                    <div className="space-y-2">
                      <Label>印鑑サイズ: {settings.company.stampSize}px</Label>
                      <Slider
                        value={[settings.company.stampSize]}
                        onValueChange={([v]) => updateSettings('company', { stampSize: v })}
                        min={40}
                        max={80}
                        step={5}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 金額サマリー設定 */}
        <AccordionItem value="summary">
          <AccordionTrigger>💰 金額表示</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.summary.show}
                  onCheckedChange={(v) => updateSettings('summary', { show: v })}
                />
                <Label>金額サマリーを表示</Label>
              </div>
              {settings.summary.show && (
                <>
                  <div className="space-y-2">
                    <Label>表示位置</Label>
                    <Select
                      value={settings.summary.position}
                      onValueChange={(v) => updateSettings('summary', { position: v as 'top' | 'bottom' | 'both' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">明細の上</SelectItem>
                        <SelectItem value="bottom">明細の下</SelectItem>
                        <SelectItem value="both">両方</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.summary.showSubtotal}
                        onCheckedChange={(v) => updateSettings('summary', { showSubtotal: v })}
                      />
                      <Label>小計</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.summary.showTax}
                        onCheckedChange={(v) => updateSettings('summary', { showTax: v })}
                      />
                      <Label>消費税</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.summary.highlightTotal}
                        onCheckedChange={(v) => updateSettings('summary', { highlightTotal: v })}
                      />
                      <Label>合計を強調</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>合計金額の文字サイズ: {settings.summary.totalFontSize}px</Label>
                    <Slider
                      value={[settings.summary.totalFontSize]}
                      onValueChange={([v]) => updateSettings('summary', { totalFontSize: v })}
                      min={14}
                      max={28}
                      step={1}
                    />
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 明細テーブル設定 */}
        <AccordionItem value="table">
          <AccordionTrigger>📋 明細テーブル</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>表示する列</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showRowNumber}
                      onCheckedChange={(v) => updateSettings('table', { showRowNumber: v })}
                    />
                    <Label className="text-sm">No.</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showItemName}
                      onCheckedChange={(v) => updateSettings('table', { showItemName: v })}
                    />
                    <Label className="text-sm">品名</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showDescription}
                      onCheckedChange={(v) => updateSettings('table', { showDescription: v })}
                    />
                    <Label className="text-sm">仕様</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showQuantity}
                      onCheckedChange={(v) => updateSettings('table', { showQuantity: v })}
                    />
                    <Label className="text-sm">数量</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showUnit}
                      onCheckedChange={(v) => updateSettings('table', { showUnit: v })}
                    />
                    <Label className="text-sm">単位</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showUnitPrice}
                      onCheckedChange={(v) => updateSettings('table', { showUnitPrice: v })}
                    />
                    <Label className="text-sm">単価</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showAmount}
                      onCheckedChange={(v) => updateSettings('table', { showAmount: v })}
                    />
                    <Label className="text-sm">金額</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.table.showSupplier}
                      onCheckedChange={(v) => updateSettings('table', { showSupplier: v })}
                    />
                    <Label className="text-sm">仕入先</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>文字サイズ: {settings.table.fontSize}px</Label>
                <Slider
                  value={[settings.table.fontSize]}
                  onValueChange={([v]) => updateSettings('table', { fontSize: v })}
                  min={8}
                  max={14}
                  step={1}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ヘッダー背景色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.table.headerBgColor}
                      onChange={(e) => updateSettings('table', { headerBgColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={settings.table.headerBgColor}
                      onChange={(e) => updateSettings('table', { headerBgColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ヘッダー文字色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.table.headerTextColor}
                      onChange={(e) => updateSettings('table', { headerTextColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={settings.table.headerTextColor}
                      onChange={(e) => updateSettings('table', { headerTextColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.table.alternateRowColor}
                  onCheckedChange={(v) => updateSettings('table', { alternateRowColor: v })}
                />
                <Label>行の背景を交互に変える</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 備考設定 */}
        <AccordionItem value="notes">
          <AccordionTrigger>📝 備考欄</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.notes.show}
                  onCheckedChange={(v) => updateSettings('notes', { show: v })}
                />
                <Label>備考欄を表示</Label>
              </div>
              {settings.notes.show && (
                <div className="space-y-2">
                  <Label>文字サイズ: {settings.notes.fontSize}px</Label>
                  <Slider
                    value={[settings.notes.fontSize]}
                    onValueChange={([v]) => updateSettings('notes', { fontSize: v })}
                    min={8}
                    max={14}
                    step={1}
                  />
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* スタイル設定 */}
        <AccordionItem value="style">
          <AccordionTrigger>🎨 スタイル・色</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>メインカラー</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.style.primaryColor}
                      onChange={(e) => updateSettings('style', { primaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={settings.style.primaryColor}
                      onChange={(e) => updateSettings('style', { primaryColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>文字色</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={settings.style.textColor}
                      onChange={(e) => updateSettings('style', { textColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={settings.style.textColor}
                      onChange={(e) => updateSettings('style', { textColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>基本文字サイズ: {settings.style.baseFontSize}px</Label>
                <Slider
                  value={[settings.style.baseFontSize]}
                  onValueChange={([v]) => updateSettings('style', { baseFontSize: v })}
                  min={9}
                  max={14}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>角丸: {settings.style.borderRadius}px</Label>
                <Slider
                  value={[settings.style.borderRadius]}
                  onValueChange={([v]) => updateSettings('style', { borderRadius: v })}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* フッター設定 */}
        <AccordionItem value="footer">
          <AccordionTrigger>📎 フッター</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.footer.show}
                  onCheckedChange={(v) => updateSettings('footer', { show: v })}
                />
                <Label>フッターを表示</Label>
              </div>
              {settings.footer.show && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.footer.showPageNumber}
                      onCheckedChange={(v) => updateSettings('footer', { showPageNumber: v })}
                    />
                    <Label>ページ番号</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>カスタムテキスト</Label>
                    <Input
                      value={settings.footer.customText}
                      onChange={(e) => updateSettings('footer', { customText: e.target.value })}
                      placeholder="例：本見積書の有効期限は発行日より30日間です"
                    />
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

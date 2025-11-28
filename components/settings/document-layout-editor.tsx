'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentLayoutTableColumnConfig,
  DocumentPageConfig,
  DocumentStyleConfig,
  DocumentTableStyleConfig,
  DocumentSectionKey,
  DocumentTargetEntity,
} from '@/types/document-layout'
import {
  getDefaultDocumentLayout,
  sortSections,
  sortColumns,
  DEFAULT_PAGE_CONFIG,
  DEFAULT_STYLE_CONFIG,
  DEFAULT_TABLE_STYLE_CONFIG,
} from '@/lib/document-layout'

interface DocumentLayoutEditorProps {
  target: DocumentTargetEntity
  layout: DocumentLayoutConfig
  onLayoutChange: (layout: DocumentLayoutConfig) => void
  onSave: () => Promise<void>
  onPreview: () => Promise<void>
  saving: boolean
  previewing: boolean
}

const FIXED_SECTION_KEYS: Record<DocumentTargetEntity, Set<DocumentSectionKey>> = {
  quote: new Set(['document_meta', 'company_info', 'customer_info', 'project_info', 'items_table', 'totals', 'notes', 'footer']),
  purchase_order: new Set(['document_meta', 'company_info', 'supplier_info', 'quote_info', 'items_table', 'totals', 'notes', 'footer']),
}

const PAGE_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'LETTER', label: 'Letter' },
  { value: 'LEGAL', label: 'Legal' },
]

const ORIENTATION_OPTIONS = [
  { value: 'portrait', label: '縦向き' },
  { value: 'landscape', label: '横向き' },
]

const COLUMN_OPTIONS = [
  { value: 'left', label: '左側' },
  { value: 'right', label: '右側' },
  { value: 'full', label: '全幅' },
]

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '左揃え' },
  { value: 'center', label: '中央揃え' },
  { value: 'right', label: '右揃え' },
]

const LOGO_POSITION_OPTIONS = [
  { value: 'left', label: '左' },
  { value: 'center', label: '中央' },
  { value: 'right', label: '右' },
]

export function DocumentLayoutEditor({
  target,
  layout,
  onLayoutChange,
  onSave,
  onPreview,
  saving,
  previewing,
}: DocumentLayoutEditorProps) {
  const [activeTab, setActiveTab] = useState('sections')
  
  const pageConfig = layout.page ?? DEFAULT_PAGE_CONFIG
  const styleConfig = layout.styles ?? DEFAULT_STYLE_CONFIG
  const tableStyleConfig = layout.tableStyles ?? DEFAULT_TABLE_STYLE_CONFIG

  const sections = sortSections(layout.sections)
  const columns = sortColumns(layout.table_columns)
  const fixedSections = sections.filter((section) => FIXED_SECTION_KEYS[target].has(section.key))
  const customSections = sections.filter((section) => !FIXED_SECTION_KEYS[target].has(section.key))

  const updateLayout = useCallback((updates: Partial<DocumentLayoutConfig>) => {
    onLayoutChange({ ...layout, ...updates })
  }, [layout, onLayoutChange])

  const handleSectionChange = (
    key: string,
    updates: Partial<Omit<DocumentLayoutSectionConfig, 'key' | 'region'>>
  ) => {
    updateLayout({
      sections: layout.sections.map((section) =>
        section.key === key ? { ...section, ...updates } : section
      ),
    })
  }

  const handleColumnChange = (
    key: string,
    updates: Partial<Omit<DocumentLayoutTableColumnConfig, 'key'>>
  ) => {
    updateLayout({
      table_columns: layout.table_columns.map((column) =>
        column.key === key ? { ...column, ...updates } : column
      ),
    })
  }

  const handlePageChange = (updates: Partial<DocumentPageConfig>) => {
    updateLayout({
      page: { ...pageConfig, ...updates },
    })
  }

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', value: number) => {
    updateLayout({
      page: {
        ...pageConfig,
        margin: { ...pageConfig.margin, [side]: value },
      },
    })
  }

  const handleStyleChange = (updates: Partial<DocumentStyleConfig>) => {
    updateLayout({
      styles: { ...styleConfig, ...updates },
    })
  }

  const handleTableStyleChange = (updates: Partial<DocumentTableStyleConfig>) => {
    updateLayout({
      tableStyles: { ...tableStyleConfig, ...updates },
    })
  }

  const handleResetToDefault = () => {
    const defaultLayout = getDefaultDocumentLayout(target)
    onLayoutChange(defaultLayout)
    toast.info('デフォルト設定にリセットしました')
  }

  const renderSectionTable = (tableSections: DocumentLayoutSectionConfig[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">表示</TableHead>
          <TableHead>名称</TableHead>
          <TableHead className="w-20">行</TableHead>
          <TableHead className="w-28">配置</TableHead>
          <TableHead className="w-20">幅(%)</TableHead>
          <TableHead className="w-20">優先度</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableSections.map((section) => (
          <TableRow key={`${target}-${section.key}`}>
            <TableCell>
              <Checkbox
                checked={section.enabled}
                onCheckedChange={(value) =>
                  handleSectionChange(section.key, { enabled: value === true })
                }
              />
            </TableCell>
            <TableCell>
              <Input
                value={section.label}
                onChange={(e) => handleSectionChange(section.key, { label: e.target.value })}
                className="mb-1"
              />
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={section.show_label !== false}
                    onCheckedChange={(value) =>
                      handleSectionChange(section.key, { show_label: value === false ? false : true })
                    }
                  />
                  <span>ラベル表示</span>
                </label>
                <span>リージョン: {section.region}</span>
              </div>
              {section.key === 'document_meta' && (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="タイトル (例: 御見積書)"
                    value={section.title ?? ''}
                    onChange={(e) => handleSectionChange(section.key, { title: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={section.show_title !== false}
                      onCheckedChange={(value) =>
                        handleSectionChange(section.key, { show_title: value === false ? false : true })
                      }
                    />
                    <span>タイトルを表示</span>
                  </label>
                </div>
              )}
            </TableCell>
            <TableCell>
              <Input
                type="number"
                min={0}
                value={section.row}
                onChange={(e) => handleSectionChange(section.key, { row: Number(e.target.value) || 0 })}
              />
            </TableCell>
            <TableCell>
              <Select
                value={section.column}
                onValueChange={(value) =>
                  handleSectionChange(section.key, { column: value as DocumentLayoutSectionConfig['column'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input
                type="number"
                min={10}
                max={100}
                step={5}
                value={section.width}
                onChange={(e) => handleSectionChange(section.key, { width: Number(e.target.value) || 0 })}
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                min={0}
                value={section.order}
                onChange={(e) => handleSectionChange(section.key, { order: Number(e.target.value) || 0 })}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sections">セクション</TabsTrigger>
          <TabsTrigger value="columns">明細列</TabsTrigger>
          <TabsTrigger value="page">ページ設定</TabsTrigger>
          <TabsTrigger value="styles">スタイル</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">固定セクション</CardTitle>
              <CardDescription>標準で表示されるセクションの設定</CardDescription>
            </CardHeader>
            <CardContent>
              {fixedSections.length > 0 ? (
                renderSectionTable(fixedSections)
              ) : (
                <p className="text-sm text-muted-foreground">固定表示セクションはありません。</p>
              )}
            </CardContent>
          </Card>

          {customSections.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">カスタムセクション</CardTitle>
                <CardDescription>追加のカスタムセクション</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSectionTable(customSections)}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">明細テーブル列</CardTitle>
              <CardDescription>明細表の各列の表示設定</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">表示</TableHead>
                    <TableHead>列名</TableHead>
                    <TableHead className="w-24">幅(%)</TableHead>
                    <TableHead className="w-28">文字揃え</TableHead>
                    <TableHead className="w-20">順序</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map((column) => (
                    <TableRow key={`${target}-${column.key}`}>
                      <TableCell>
                        <Checkbox
                          checked={column.enabled}
                          onCheckedChange={(value) =>
                            handleColumnChange(column.key, { enabled: value === true })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={column.label}
                          onChange={(e) => handleColumnChange(column.key, { label: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={5}
                          max={100}
                          step={5}
                          value={column.width}
                          onChange={(e) => handleColumnChange(column.key, { width: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={column.textAlign || 'left'}
                          onValueChange={(value) =>
                            handleColumnChange(column.key, { textAlign: value as 'left' | 'center' | 'right' })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEXT_ALIGN_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={column.order}
                          onChange={(e) => handleColumnChange(column.key, { order: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">用紙設定</CardTitle>
              <CardDescription>用紙サイズと向き</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>用紙サイズ</Label>
                  <Select
                    value={pageConfig.size}
                    onValueChange={(value) =>
                      handlePageChange({ size: value as DocumentPageConfig['size'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>向き</Label>
                  <Select
                    value={pageConfig.orientation}
                    onValueChange={(value) =>
                      handlePageChange({ orientation: value as 'portrait' | 'landscape' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIENTATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">余白設定</CardTitle>
              <CardDescription>ページの上下左右の余白（pt）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>上</Label>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={pageConfig.margin.top}
                    onChange={(e) => handleMarginChange('top', Number(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>右</Label>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={pageConfig.margin.right}
                    onChange={(e) => handleMarginChange('right', Number(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>下</Label>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={pageConfig.margin.bottom}
                    onChange={(e) => handleMarginChange('bottom', Number(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>左</Label>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={pageConfig.margin.left}
                    onChange={(e) => handleMarginChange('left', Number(e.target.value) || 30)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="styles" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">フォントサイズ</CardTitle>
              <CardDescription>各テキスト要素のフォントサイズ（pt）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Input
                    type="number"
                    min={12}
                    max={48}
                    value={styleConfig.titleFontSize}
                    onChange={(e) => handleStyleChange({ titleFontSize: Number(e.target.value) || 20 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>セクション見出し</Label>
                  <Input
                    type="number"
                    min={8}
                    max={32}
                    value={styleConfig.sectionTitleFontSize}
                    onChange={(e) => handleStyleChange({ sectionTitleFontSize: Number(e.target.value) || 12 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>本文</Label>
                  <Input
                    type="number"
                    min={6}
                    max={24}
                    value={styleConfig.baseFontSize}
                    onChange={(e) => handleStyleChange({ baseFontSize: Number(e.target.value) || 10 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>テーブル</Label>
                  <Input
                    type="number"
                    min={6}
                    max={18}
                    value={styleConfig.tableFontSize}
                    onChange={(e) => handleStyleChange({ tableFontSize: Number(e.target.value) || 9 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>フッター</Label>
                  <Input
                    type="number"
                    min={6}
                    max={14}
                    value={styleConfig.footerFontSize}
                    onChange={(e) => handleStyleChange({ footerFontSize: Number(e.target.value) || 8 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">カラー設定</CardTitle>
              <CardDescription>各要素の色を設定</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>メインカラー</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={styleConfig.primaryColor}
                      onChange={(e) => handleStyleChange({ primaryColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={styleConfig.primaryColor}
                      onChange={(e) => handleStyleChange({ primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>サブカラー</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={styleConfig.secondaryColor}
                      onChange={(e) => handleStyleChange({ secondaryColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={styleConfig.secondaryColor}
                      onChange={(e) => handleStyleChange({ secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>罫線カラー</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={styleConfig.borderColor}
                      onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={styleConfig.borderColor}
                      onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>テーブルヘッダー背景</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={styleConfig.tableHeaderBgColor}
                      onChange={(e) => handleStyleChange({ tableHeaderBgColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={styleConfig.tableHeaderBgColor}
                      onChange={(e) => handleStyleChange({ tableHeaderBgColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>テーブル縞模様</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={styleConfig.tableStripeBgColor}
                      onChange={(e) => handleStyleChange({ tableStripeBgColor: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={styleConfig.tableStripeBgColor}
                      onChange={(e) => handleStyleChange({ tableStripeBgColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">スペーシング・罫線</CardTitle>
              <CardDescription>セクション間隔と罫線の太さ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>セクション間隔</Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={styleConfig.sectionSpacing}
                    onChange={(e) => handleStyleChange({ sectionSpacing: Number(e.target.value) || 15 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>項目間隔</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={styleConfig.itemSpacing}
                    onChange={(e) => handleStyleChange({ itemSpacing: Number(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>罫線の太さ</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={styleConfig.borderWidth}
                    onChange={(e) => handleStyleChange({ borderWidth: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>テーブル罫線</Label>
                  <Input
                    type="number"
                    min={0}
                    max={3}
                    step={0.5}
                    value={styleConfig.tableBorderWidth}
                    onChange={(e) => handleStyleChange({ tableBorderWidth: Number(e.target.value) || 0.5 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">テーブルオプション</CardTitle>
              <CardDescription>明細テーブルの表示設定</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>ヘッダー文字揃え</Label>
                  <Select
                    value={tableStyleConfig.headerAlign}
                    onValueChange={(value) =>
                      handleTableStyleChange({ headerAlign: value as 'left' | 'center' | 'right' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEXT_ALIGN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>セルパディング</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={tableStyleConfig.cellPadding}
                    onChange={(e) => handleTableStyleChange({ cellPadding: Number(e.target.value) || 5 })}
                  />
                </div>
                <div className="flex flex-col gap-3 pt-7">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={tableStyleConfig.showGridLines}
                      onCheckedChange={(value) => handleTableStyleChange({ showGridLines: value === true })}
                    />
                    <span className="text-sm">罫線を表示</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={tableStyleConfig.alternateRowColors}
                      onCheckedChange={(value) => handleTableStyleChange({ alternateRowColors: value === true })}
                    />
                    <span className="text-sm">縞模様（行ごとに背景色）</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ページ番号・ロゴ</CardTitle>
              <CardDescription>ページ番号表示と会社ロゴの設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={styleConfig.showPageNumbers}
                    onCheckedChange={(value) => handleStyleChange({ showPageNumbers: value === true })}
                  />
                  <span className="text-sm">ページ番号を表示</span>
                </label>
                {styleConfig.showPageNumbers && (
                  <Select
                    value={styleConfig.pageNumberPosition}
                    onValueChange={(value) =>
                      handleStyleChange({ pageNumberPosition: value as 'left' | 'center' | 'right' })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGO_POSITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>会社ロゴURL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={styleConfig.companyLogoUrl || ''}
                    onChange={(e) => handleStyleChange({ companyLogoUrl: e.target.value || null })}
                  />
                  <p className="text-xs text-muted-foreground">
                    ※ 外部URLまたはStorage URLを指定してください
                  </p>
                </div>
                {styleConfig.companyLogoUrl && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>ロゴ幅</Label>
                      <Input
                        type="number"
                        min={20}
                        max={200}
                        value={styleConfig.companyLogoWidth || 100}
                        onChange={(e) => handleStyleChange({ companyLogoWidth: Number(e.target.value) || 100 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ロゴ高さ</Label>
                      <Input
                        type="number"
                        min={10}
                        max={100}
                        value={styleConfig.companyLogoHeight || 40}
                        onChange={(e) => handleStyleChange({ companyLogoHeight: Number(e.target.value) || 40 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ロゴ位置</Label>
                      <Select
                        value={styleConfig.companyLogoPosition || 'right'}
                        onValueChange={(value) =>
                          handleStyleChange({ companyLogoPosition: value as 'left' | 'center' | 'right' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOGO_POSITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={handleResetToDefault}>
          デフォルトに戻す
        </Button>
        <Button variant="outline" onClick={onPreview} disabled={saving || previewing}>
          {previewing ? 'プレビュー生成中...' : 'プレビュー'}
        </Button>
        <Button onClick={onSave} disabled={saving || previewing}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}

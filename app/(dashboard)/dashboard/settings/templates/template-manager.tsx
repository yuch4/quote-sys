'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pencil, Trash2, Plus, Copy, Eye, FileCode, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  previewTemplate,
  type TemplateFormData,
} from './actions'
import { DEFAULT_QUOTE_TEMPLATE_HTML, DEFAULT_QUOTE_TEMPLATE_CSS, QUOTE_TEMPLATE_VARIABLES } from '@/lib/pdf/default-template'
import type { Template } from '@/types/pdf-templates'

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    target_entity: 'quote',
    html_content: DEFAULT_QUOTE_TEMPLATE_HTML,
    css_content: DEFAULT_QUOTE_TEMPLATE_CSS,
    is_active: true,
    is_default: false,
  })

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    const data = await getTemplates()
    setTemplates(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      target_entity: 'quote',
      html_content: DEFAULT_QUOTE_TEMPLATE_HTML,
      css_content: DEFAULT_QUOTE_TEMPLATE_CSS,
      is_active: true,
      is_default: false,
    })
    setSelectedTemplate(null)
  }

  const handleCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({
      id: template.id,
      name: template.name,
      description: template.description || '',
      target_entity: template.target_entity,
      html_content: template.html_content,
      css_content: template.css_content || '',
      is_active: template.is_active,
      is_default: template.is_default,
    })
    setDialogOpen(true)
  }

  const handleDelete = (template: Template) => {
    setSelectedTemplate(template)
    setDeleteDialogOpen(true)
  }

  const handleDuplicate = async (template: Template) => {
    const result = await duplicateTemplate(template.id)
    if (result.success) {
      toast.success(result.message)
      loadTemplates()
    } else {
      toast.error(result.message)
    }
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    const result = await previewTemplate(
      formData.html_content,
      formData.css_content || null,
      formData.target_entity
    )
    setPreviewLoading(false)
    
    if (result.success) {
      setPreviewHtml(result.html)
      setPreviewDialogOpen(true)
    } else {
      toast.error(result.message)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('テンプレート名を入力してください')
      return
    }
    if (!formData.html_content.trim()) {
      toast.error('HTMLコンテンツを入力してください')
      return
    }

    const result = selectedTemplate
      ? await updateTemplate(formData)
      : await createTemplate(formData)

    if (result.success) {
      toast.success(result.message)
      setDialogOpen(false)
      resetForm()
      loadTemplates()
    } else {
      toast.error(result.message)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return

    const result = await deleteTemplate(selectedTemplate.id)
    if (result.success) {
      toast.success(result.message)
      setDeleteDialogOpen(false)
      setSelectedTemplate(null)
      loadTemplates()
    } else {
      toast.error(result.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">PDFテンプレート</h3>
          <p className="text-sm text-muted-foreground">
            見積書・発注書のPDF出力テンプレートを管理します
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              テンプレートがありません。「新規作成」から追加してください。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>テンプレート名</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>バージョン</TableHead>
                  <TableHead>更新日</TableHead>
                  <TableHead className="w-[150px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.target_entity === 'quote' ? '見積書' : '発注書'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {template.is_active ? (
                          <Badge variant="default" className="bg-green-500">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                        {template.is_default && (
                          <Badge variant="default">デフォルト</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>v{template.version}</TableCell>
                    <TableCell>{formatDate(template.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} title="編集">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)} title="複製">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template)} title="削除">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 作成・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'テンプレートを編集' : '新規テンプレート作成'}
            </DialogTitle>
            <DialogDescription>
              HTML/CSSでPDFのレイアウトを定義します。Handlebars構文で変数を差し込めます。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="basic" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="basic">基本設定</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="variables">利用可能な変数</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="flex-1 overflow-auto space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">テンプレート名 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="標準見積書テンプレート"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target">対象ドキュメント</Label>
                    <Select
                      value={formData.target_entity}
                      onValueChange={(value: 'quote' | 'purchase_order') =>
                        setFormData({ ...formData, target_entity: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quote">見積書</SelectItem>
                        <SelectItem value="purchase_order">発注書</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="テンプレートの説明を入力..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">有効にする</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                    <Label htmlFor="is_default">デフォルトにする</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="html" className="flex-1 overflow-hidden p-1">
                <div className="h-full flex flex-col">
                  <Label className="mb-2">HTMLテンプレート</Label>
                  <Textarea
                    className="flex-1 font-mono text-sm min-h-[400px]"
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    placeholder="HTMLテンプレートを入力..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="css" className="flex-1 overflow-hidden p-1">
                <div className="h-full flex flex-col">
                  <Label className="mb-2">CSSスタイル</Label>
                  <Textarea
                    className="flex-1 font-mono text-sm min-h-[400px]"
                    value={formData.css_content}
                    onChange={(e) => setFormData({ ...formData, css_content: e.target.value })}
                    placeholder="CSSスタイルを入力..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="variables" className="flex-1 overflow-auto p-1">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    以下の変数をHTML内で <code className="bg-muted px-1 rounded">{'{{変数名}}'}</code> の形式で使用できます。
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>変数名</TableHead>
                        <TableHead>型</TableHead>
                        <TableHead>説明</TableHead>
                        <TableHead>必須</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {QUOTE_TEMPLATE_VARIABLES.map((variable) => (
                        <TableRow key={variable.key}>
                          <TableCell>
                            <code className="bg-muted px-1 rounded">{`{{${variable.key}}}`}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{variable.type}</Badge>
                          </TableCell>
                          <TableCell>
                            {variable.label}
                            {variable.description && (
                              <p className="text-xs text-muted-foreground">{variable.description}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {variable.required ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">ヘルパー関数</h4>
                    <ul className="text-sm space-y-1">
                      <li><code>{'{{formatCurrency amount}}'}</code> - 金額を円表示（¥1,000,000）</li>
                      <li><code>{'{{formatDate date}}'}</code> - 日付を日本語表示（2024/12/13）</li>
                      <li><code>{'{{nl2br text}}'}</code> - 改行を&lt;br&gt;に変換</li>
                      <li><code>{'{{#each items}}...{{/each}}'}</code> - 配列をループ</li>
                      <li><code>{'{{#if condition}}...{{/if}}'}</code> - 条件分岐</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
              <Eye className="mr-2 h-4 w-4" />
              {previewLoading ? 'プレビュー生成中...' : 'プレビュー'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>
              {selectedTemplate ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを削除</DialogTitle>
            <DialogDescription>
              「{selectedTemplate?.name}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プレビューダイアログ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>プレビュー</DialogTitle>
            <DialogDescription>
              サンプルデータでレンダリングした結果です
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] border rounded">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[1200px]"
              title="テンプレートプレビュー"
            />
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RichTextEditor } from '@/components/knowledge/rich-text-editor'
import {
  TICKET_CATEGORY_LABELS,
  VISIBILITY_LABELS,
  type TicketCategory,
  type ContentVisibility,
} from '@/types/knowledge'
import { ArrowLeft, Save, X, Plus, FileText, Code } from 'lucide-react'
import Link from 'next/link'

type ContentFormat = 'markdown' | 'html'

export default function NewKnowledgeArticlePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentFormat, setContentFormat] = useState<ContentFormat>('html')
  const [category, setCategory] = useState<TicketCategory>('general')
  const [visibility, setVisibility] = useState<ContentVisibility>('internal')
  const [isPublished, setIsPublished] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleFormatChange = (newFormat: ContentFormat) => {
    // フォーマット切り替え時、内容をクリアするか確認
    if (content.trim() && newFormat !== contentFormat) {
      if (!confirm('エディタの形式を変更すると、現在の内容が失われる可能性があります。続行しますか？')) {
        return
      }
      setContent('')
    }
    setContentFormat(newFormat)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('タイトルを入力してください')
      return
    }
    if (!content.trim()) {
      setError('内容を入力してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error: createError } = await supabase
        .from('knowledge_base')
        .insert({
          title,
          content,
          content_format: contentFormat,
          category,
          visibility,
          is_published: isPublished,
          tags: tags.length > 0 ? tags : null,
          created_by: user?.id,
          updated_by: user?.id,
        })
        .select()
        .single()

      if (createError) {
        setError(createError.message)
        return
      }

      router.push(`/dashboard/knowledge/base/${data?.id}`)
    } catch {
      setError('記事の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/knowledge/base">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新規記事作成</h1>
          <p className="text-sm text-gray-500 mt-1">
            ナレッジベースに新しい記事を追加します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>記事内容</CardTitle>
                    <CardDescription>
                      リッチテキストまたはMarkdown形式で記述できます
                    </CardDescription>
                  </div>
                  {/* エディタ形式切り替え */}
                  <Tabs value={contentFormat} onValueChange={(v) => handleFormatChange(v as ContentFormat)}>
                    <TabsList>
                      <TabsTrigger value="html" className="gap-2">
                        <FileText className="h-4 w-4" />
                        リッチテキスト
                      </TabsTrigger>
                      <TabsTrigger value="markdown" className="gap-2">
                        <Code className="h-4 w-4" />
                        Markdown
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">タイトル *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="記事のタイトルを入力..."
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>本文 *</Label>
                  {contentFormat === 'html' ? (
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="記事の内容を入力..."
                      className="min-h-[400px]"
                    />
                  ) : (
                    <>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="# 概要&#10;&#10;ここに記事の内容を記述します...&#10;&#10;## 手順&#10;&#10;1. 最初の手順&#10;2. 次の手順&#10;&#10;## 注意点&#10;&#10;- 注意点1&#10;- 注意点2"
                        className="min-h-[400px] font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Markdown記法（#見出し、**太字**、`コード`、- リストなど）が使用できます
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 公開設定 */}
            <Card>
              <CardHeader>
                <CardTitle>公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>公開する</Label>
                    <p className="text-xs text-gray-500">
                      ONにすると設定した範囲で公開されます
                    </p>
                  </div>
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>

                <div className="space-y-2">
                  <Label>公開範囲</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as ContentVisibility)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {visibility === 'internal' && '社内スタッフのみ閲覧可能'}
                    {visibility === 'customer' && '招待された顧客も閲覧可能'}
                    {visibility === 'public' && '誰でも閲覧可能（将来的な拡張用）'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* カテゴリ */}
            <Card>
              <CardHeader>
                <CardTitle>カテゴリ</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as TicketCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* タグ */}
            <Card>
              <CardHeader>
                <CardTitle>タグ</CardTitle>
                <CardDescription>
                  検索性を高めるためのタグを追加
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="タグを入力..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* アクションボタン */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                <Save className="h-4 w-4" />
                {loading ? '保存中...' : isPublished ? '公開する' : '下書き保存'}
              </Button>
              <Link href="/dashboard/knowledge/base" className="block">
                <Button type="button" variant="outline" className="w-full">
                  キャンセル
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

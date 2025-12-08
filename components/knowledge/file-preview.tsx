'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  File,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Attachment {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
}

interface FilePreviewProps {
  attachment: Attachment | null
  attachments?: Attachment[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FilePreview({
  attachment,
  attachments = [],
  open,
  onOpenChange,
}: FilePreviewProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClient()

  const currentAttachment = attachments.length > 0 
    ? attachments[currentIndex] 
    : attachment

  // 現在のインデックスを更新
  useEffect(() => {
    if (attachment && attachments.length > 0) {
      const index = attachments.findIndex(a => a.id === attachment.id)
      if (index !== -1) setCurrentIndex(index)
    }
  }, [attachment, attachments])

  // ファイルURLを取得
  useEffect(() => {
    if (!currentAttachment || !open) {
      setFileUrl(null)
      return
    }

    const loadFile = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase.storage
          .from('knowledge-attachments')
          .createSignedUrl(currentAttachment.file_path, 3600)

        if (error) throw error
        setFileUrl(data.signedUrl)
      } catch (err) {
        console.error('Failed to load file:', err)
        setError('ファイルの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    loadFile()
    setZoom(100)
    setRotation(0)
  }, [currentAttachment, open, supabase.storage])

  const handleDownload = async () => {
    if (!currentAttachment) return

    try {
      const { data, error } = await supabase.storage
        .from('knowledge-attachments')
        .download(currentAttachment.file_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = currentAttachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0))
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const isImage = currentAttachment?.mime_type?.startsWith('image/')
  const isPdf = currentAttachment?.mime_type === 'application/pdf'
  const isText = currentAttachment?.mime_type?.startsWith('text/') || 
    currentAttachment?.file_name?.endsWith('.txt') ||
    currentAttachment?.file_name?.endsWith('.csv') ||
    currentAttachment?.file_name?.endsWith('.json')
  const isPreviewable = isImage || isPdf || isText

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
        {/* ヘッダー */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <DialogTitle className="text-base font-medium truncate">
                {currentAttachment?.file_name}
              </DialogTitle>
              {currentAttachment && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatFileSize(currentAttachment.file_size)}
                </span>
              )}
              {attachments.length > 1 && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  ({currentIndex + 1} / {attachments.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} title="縮小">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500 w-12 text-center">{zoom}%</span>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} title="拡大">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleRotate} title="回転">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                </>
              )}
              <Button variant="ghost" size="icon" onClick={handleOpenInNewTab} title="新しいタブで開く">
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} title="ダウンロード">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* プレビューエリア */}
        <div className="flex-1 overflow-hidden relative bg-gray-100">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="w-1/2 h-1/2" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <File className="h-16 w-16 mb-4 text-gray-400" />
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                ダウンロード
              </Button>
            </div>
          ) : !isPreviewable ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="h-16 w-16 mb-4 text-gray-400" />
              <p className="mb-2">このファイル形式はプレビューできません</p>
              <p className="text-sm text-gray-400 mb-4">
                {currentAttachment?.mime_type}
              </p>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                ダウンロード
              </Button>
            </div>
          ) : isImage && fileUrl ? (
            <div className="h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={currentAttachment?.file_name}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                  maxWidth: zoom <= 100 ? '100%' : 'none',
                  maxHeight: zoom <= 100 ? '100%' : 'none',
                }}
                className="object-contain"
              />
            </div>
          ) : isPdf && fileUrl ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              className="w-full h-full border-0"
              title={currentAttachment?.file_name}
            />
          ) : isText && fileUrl ? (
            <TextPreview url={fileUrl} />
          ) : null}

          {/* 前後ナビゲーション */}
          {attachments.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow"
                onClick={handleNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* サムネイル一覧（複数ファイル時） */}
        {attachments.length > 1 && (
          <div className="flex-shrink-0 border-t p-2 bg-gray-50">
            <div className="flex gap-2 overflow-x-auto">
              {attachments.map((att, index) => (
                <button
                  key={att.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all",
                    index === currentIndex
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-400"
                  )}
                >
                  <ThumbnailPreview attachment={att} />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// テキストファイルプレビューコンポーネント
function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(url)
        const text = await response.text()
        setContent(text)
      } catch (err) {
        console.error('Failed to load text:', err)
        setContent('ファイルの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [url])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4">
      <pre className="whitespace-pre-wrap font-mono text-sm bg-white p-4 rounded border">
        {content}
      </pre>
    </div>
  )
}

// サムネイルプレビューコンポーネント
function ThumbnailPreview({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const supabase = createClient()

  const isImage = attachment.mime_type?.startsWith('image/')

  useEffect(() => {
    if (!isImage) return

    const loadThumbnail = async () => {
      const { data } = await supabase.storage
        .from('knowledge-attachments')
        .createSignedUrl(attachment.file_path, 3600)
      
      if (data) setUrl(data.signedUrl)
    }
    loadThumbnail()
  }, [attachment, isImage, supabase.storage])

  if (isImage && url) {
    return <img src={url} alt={attachment.file_name} className="w-full h-full object-cover" />
  }

  const isPdf = attachment.mime_type === 'application/pdf'
  const isText = attachment.mime_type?.startsWith('text/')

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      {isPdf ? (
        <FileText className="h-6 w-6 text-red-500" />
      ) : isText ? (
        <FileText className="h-6 w-6 text-blue-500" />
      ) : (
        <File className="h-6 w-6 text-gray-400" />
      )}
    </div>
  )
}

// 添付ファイルリストコンポーネント（プレビュー機能付き）
interface AttachmentListProps {
  attachments: Attachment[]
  className?: string
}

export function AttachmentList({ attachments, className }: AttachmentListProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)

  const handleClick = (attachment: Attachment) => {
    setSelectedAttachment(attachment)
    setPreviewOpen(true)
  }

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType?.includes('spreadsheet') || fileName?.endsWith('.xlsx') || fileName?.endsWith('.xls')) return '📊'
    if (mimeType?.includes('document') || fileName?.endsWith('.docx') || fileName?.endsWith('.doc')) return '📝'
    if (mimeType?.startsWith('text/')) return '📃'
    if (mimeType?.includes('zip') || mimeType?.includes('archive')) return '📦'
    return '📎'
  }

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {attachments.map((file) => (
          <Button
            key={file.id}
            variant="outline"
            size="sm"
            className="gap-2 max-w-[200px]"
            onClick={() => handleClick(file)}
          >
            <span>{getFileIcon(file.mime_type, file.file_name)}</span>
            <span className="truncate">{file.file_name}</span>
          </Button>
        ))}
      </div>

      <FilePreview
        attachment={selectedAttachment}
        attachments={attachments}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  )
}

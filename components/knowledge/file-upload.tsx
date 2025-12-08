'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Upload,
  X,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  FileArchive,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadProps {
  ticketId: string
  commentId?: string
  onUploadComplete?: (attachment: UploadedFile) => void
  maxFiles?: number
  maxSize?: number // bytes
  accept?: Record<string, string[]>
  className?: string
}

export interface UploadedFile {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
}

interface FileWithPreview extends File {
  preview?: string
}

const DEFAULT_ACCEPT = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUpload({
  ticketId,
  commentId,
  onUploadComplete,
  maxFiles = 5,
  maxSize = MAX_FILE_SIZE,
  accept = DEFAULT_ACCEPT,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const supabase = createClient()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
        })
      )
      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles))
    },
    [maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - files.length,
    disabled: uploading || files.length >= maxFiles,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadedFiles: UploadedFile[] = []
      const totalFiles = files.length

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        // Supabase Storageにアップロード
        const { error: uploadError } = await supabase.storage
          .from('knowledge-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`${file.name}: ${uploadError.message}`)
        }

        // データベースに記録
        const { data: attachment, error: dbError } = await supabase
          .from('ticket_attachments')
          .insert({
            ticket_id: ticketId,
            comment_id: commentId || null,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`${file.name}: ${dbError.message}`)
        }

        uploadedFiles.push(attachment)
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
      }

      // プレビューURLを解放
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })

      setFiles([])
      toast.success(`${uploadedFiles.length}件のファイルをアップロードしました`)

      uploadedFiles.forEach((file) => {
        onUploadComplete?.(file)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image
    if (mimeType.includes('pdf')) return FileText
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
      return FileSpreadsheet
    if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary/50',
          (uploading || files.length >= maxFiles) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">ファイルをドロップ...</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-1">
              ファイルをドラッグ＆ドロップ、またはクリックして選択
            </p>
            <p className="text-xs text-gray-400">
              最大{maxFiles}ファイル、各{formatFileSize(maxSize)}まで
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const FileIcon = getFileIcon(file.type)
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <FileIcon className="h-10 w-10 text-gray-400" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-gray-500">
                アップロード中... {uploadProgress}%
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={uploadFiles}
            disabled={uploading || files.length === 0}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {files.length}件のファイルをアップロード
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, Stamp, Loader2 } from 'lucide-react'
import { generateQuotePDF } from '@/lib/pdf/generate-quote-pdf'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface PDFGenerateButtonProps {
  quoteId: string
  approvalStatus: string
  pdfUrl?: string | null
  pdfGeneratedAt?: string | null
}

const formatGeneratedAt = (value?: string | null) => {
  if (!value) return '最新PDFはまだ生成されていません'
  const date = new Date(value)
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `最新PDF: ${formatter.format(date)}`
}

export function PDFGenerateButton({ quoteId, approvalStatus, pdfUrl, pdfGeneratedAt }: PDFGenerateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'draft' | 'final' | null>(null)
  const canGenerate = approvalStatus === '承認済み'
  const restrictionMessage = '承認済みの見積のみPDFを生成できます'
  const statusMessage = formatGeneratedAt(pdfGeneratedAt)

  const handleGeneratePDF = async (options: { applyStamps?: boolean; fileType?: 'draft' | 'final' } = {}) => {
    if (!canGenerate) {
      toast.error(restrictionMessage)
      return
    }

    setLoading(true)
    setLoadingType(options.fileType || 'draft')
    
    try {
      const result = await generateQuotePDF(quoteId, options)
      
      if (result.success && result.url) {
        toast.success(result.message)
        // 新しいタブでPDFを開く
        window.open(result.url, '_blank')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('PDF生成に失敗しました')
      console.error('PDF generation error:', error)
    } finally {
      setLoading(false)
      setLoadingType(null)
    }
  }

  return (
    <div className="flex flex-col gap-1 text-left">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={loading || !canGenerate}
              variant="outline"
              title={!canGenerate ? restrictionMessage : undefined}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              {loading 
                ? loadingType === 'final' ? '最終版生成中...' : 'PDF生成中...' 
                : 'PDFを生成'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleGeneratePDF({ fileType: 'draft' })}>
              <FileText className="mr-2 h-4 w-4" />
              プレビュー版を生成
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleGeneratePDF({ fileType: 'final', applyStamps: true })}>
              <Stamp className="mr-2 h-4 w-4" />
              最終版を生成（押印あり）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canGenerate && pdfUrl && (
          <Button asChild variant="link" className="px-0 h-auto">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm">
              <Download className="h-4 w-4" />
              前回のPDFを開く
            </a>
          </Button>
        )}
      </div>
      {!canGenerate && (
        <p className="text-xs text-muted-foreground">{restrictionMessage}</p>
      )}
      <p className="text-xs text-muted-foreground">{statusMessage}</p>
    </div>
  )
}

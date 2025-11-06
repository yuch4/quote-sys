'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { generateQuotePDF } from '@/lib/pdf/generate-quote-pdf'

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
  const canGenerate = approvalStatus === '承認済み'
  const restrictionMessage = '承認済みの見積のみ最新PDFを生成できます'
  const statusMessage = formatGeneratedAt(pdfGeneratedAt)

  const handleGeneratePDF = async () => {
    if (!canGenerate) {
      alert(restrictionMessage)
      return
    }

    setLoading(true)
    try {
      const result = await generateQuotePDF(quoteId)
      if (result.success && result.url) {
        alert(result.message)
        // 新しいタブでPDFを開く
        window.open(result.url, '_blank')
      } else {
        alert(result.message)
      }
    } catch (error) {
      alert('PDF生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1 text-left">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGeneratePDF}
          disabled={loading || !canGenerate}
          variant="outline"
          title={!canGenerate ? restrictionMessage : undefined}
        >
          <FileText className="mr-2 h-4 w-4" />
          {loading ? 'PDF生成中...' : '最新PDFを生成'}
        </Button>
        {canGenerate && pdfUrl && (
          <Button asChild variant="link" className="px-0 h-auto">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm">
              <Download className="h-4 w-4" />
              前回生成したPDFを開く
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

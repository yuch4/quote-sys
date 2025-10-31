'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { generateQuotePDF } from '@/lib/pdf/generate-quote-pdf'

interface PDFGenerateButtonProps {
  quoteId: string
  quoteNumber: string
  pdfUrl?: string | null
}

export function PDFGenerateButton({ quoteId, quoteNumber, pdfUrl }: PDFGenerateButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGeneratePDF = async () => {
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
    <div className="flex gap-2">
      <Button onClick={handleGeneratePDF} disabled={loading} variant="outline">
        <FileText className="mr-2 h-4 w-4" />
        {loading ? 'PDF生成中...' : 'PDF生成'}
      </Button>
      {pdfUrl && (
        <Button asChild variant="outline">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            PDFダウンロード
          </a>
        </Button>
      )}
    </div>
  )
}

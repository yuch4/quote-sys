type QuoteLike = {
  approval_status?: string | null
}

type ProjectLike = {
  status?: string | null
  quotes?: QuoteLike[] | null
}

const normalizeStatus = (status?: string | null) => status ?? 'リード'

const MANUAL_STATUSES = new Set(['リード', '見積中', '受注', '計上OK', '計上済み', '失注', 'キャンセル'])

export const deriveProjectStatus = (project: ProjectLike) => {
  const quotes = project.quotes ?? []
  const baseStatus = normalizeStatus(project.status)

  if (MANUAL_STATUSES.has(baseStatus)) {
    return baseStatus
  }

  const hasApprovedQuote = quotes.some((quote) => quote.approval_status === '承認済み')

  if (hasApprovedQuote) {
    return '見積中'
  }

  return 'リード'
}

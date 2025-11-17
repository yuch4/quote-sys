'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Eye, Loader2, Pencil, Plus, Search, SortAsc, SortDesc, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
  CompanySecurityControl,
  CompanySystemUsage,
  GroupCompany,
  SecurityControlType,
  SystemAdoptionStatus,
  SystemCategory,
  SystemIntegrationLevel,
  SystemSecurityRisk,
} from '@/types/database'
import {
  deleteCompanySecurityControlRecord,
  deleteCompanySystemUsageRecord,
  deleteGroupCompany,
  fetchGroupCompanyDetail,
  fetchGroupCompanySummaries,
  upsertCompanySecurityControlRecord,
  upsertCompanySystemUsageRecord,
  upsertGroupCompany,
} from '@/app/(dashboard)/dashboard/settings/group-companies/actions'
import { GroupSystemInsights } from '@/components/settings/group-system-insights'
import { VendorConsolidationSimulator } from '@/components/settings/vendor-consolidation-simulator'

interface GroupCompanySummary extends GroupCompany {
  system_usage_count: number
  security_control_count: number
}

interface GroupCompanyDetail extends GroupCompany {
  system_usage: CompanySystemUsage[]
  security_controls: CompanySecurityControl[]
}

interface GroupCompanyManagerProps {
  showInsights?: boolean
  showSimulator?: boolean
}

type DialogMode = 'create' | 'edit'
type UsageDialogMode = 'create' | 'edit'
type SecurityDialogMode = 'create' | 'edit'
type SortKey = 'company_code' | 'company_name' | 'system_usage_count' | 'security_control_count'
type SortDirection = 'asc' | 'desc'
type StatusFilter = 'all' | keyof typeof statusLabels
type IndustryFilter = 'all' | string

type ContractType = 'subscription' | 'perpetual'

interface GroupCompanyFormState {
  id?: string
  company_code: string
  company_name: string
  company_name_kana: string
  region: string
  country: string
  industry: string
  employee_count_range: string
  revenue_range: string
  it_maturity: string
  relationship_status: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  notes: string
}

interface SystemUsageFormState {
  id?: string
  category: SystemCategory
  system_name: string
  vendor: string
  adoption_status: SystemAdoptionStatus
  license_count: string
  annual_cost: string
  contract_type: ContractType
  renewal_date: string
  integration_level: SystemIntegrationLevel
  security_risk_level: SystemSecurityRisk
  point_of_contact: string
  notes: string
}

interface SecurityControlFormState {
  id?: string
  control_type: SecurityControlType
  vendor: string
  adoption_status: SystemAdoptionStatus
  coverage: string
  notes: string
  last_verified_at: string
}

const emptyFormState: GroupCompanyFormState = {
  company_code: '',
  company_name: '',
  company_name_kana: '',
  region: '',
  country: '日本',
  industry: '',
  employee_count_range: '',
  revenue_range: '',
  it_maturity: '',
  relationship_status: 'active',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  notes: '',
}

const emptyUsageFormState: SystemUsageFormState = {
  category: 'other',
  system_name: '',
  vendor: '',
  adoption_status: 'in_use',
  license_count: '',
  annual_cost: '',
  contract_type: 'subscription',
  renewal_date: '',
  integration_level: 'manual',
  security_risk_level: 'normal',
  point_of_contact: '',
  notes: '',
}

const emptySecurityFormState: SecurityControlFormState = {
  control_type: '',
  vendor: '',
  adoption_status: 'in_use',
  coverage: '',
  notes: '',
  last_verified_at: '',
}

const statusLabels: Record<string, string> = {
  active: '取引中',
  suspended: '一時停止',
  inactive: '終了',
}

const relationshipStatusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }))

const systemCategoryOptions: Array<{ value: SystemCategory; label: string }> = [
  { value: 'sales_management', label: '販売管理' },
  { value: 'accounting', label: '会計・経理' },
  { value: 'human_resources', label: '人事・労務' },
  { value: 'endpoint_security', label: 'エンドポイントセキュリティ' },
  { value: 'collaboration', label: 'コラボレーション' },
  { value: 'infrastructure', label: 'インフラ' },
  { value: 'erp', label: 'ERP' },
  { value: 'other', label: 'その他' },
]

const adoptionStatusOptions: Array<{ value: SystemAdoptionStatus; label: string }> = [
  { value: 'in_use', label: '稼働中' },
  { value: 'pilot', label: 'PoC/トライアル中' },
  { value: 'planned', label: '導入予定' },
  { value: 'decommissioned', label: '廃止済み' },
  { value: 'unknown', label: '不明' },
]

const integrationLevelOptions: Array<{ value: SystemIntegrationLevel; label: string }> = [
  { value: 'none', label: '未連携' },
  { value: 'manual', label: '手動連携' },
  { value: 'partial', label: '一部自動' },
  { value: 'full', label: '完全連携' },
]

const securityRiskOptions: Array<{ value: SystemSecurityRisk; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' },
  { value: 'critical', label: '緊急' },
]

const securityControlTypeOptions: Array<{ value: SecurityControlType; label: string }> = [
  { value: 'edr', label: 'EDR' },
  { value: 'mdm', label: 'MDM' },
  { value: 'siem', label: 'SIEM/SOC' },
  { value: 'iam', label: 'ID管理/IAM' },
  { value: 'email_security', label: 'メールセキュリティ' },
  { value: 'network', label: 'ネットワーク' },
  { value: 'backup', label: 'バックアップ' },
  { value: 'zero_trust', label: 'ゼロトラスト' },
  { value: 'other', label: 'その他' },
]

const adoptionStatusLabels: Record<SystemAdoptionStatus, string> = adoptionStatusOptions.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<SystemAdoptionStatus, string>,
)

const integrationLevelLabels: Record<SystemIntegrationLevel, string> = integrationLevelOptions.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<SystemIntegrationLevel, string>,
)

const securityRiskLabels: Record<SystemSecurityRisk, string> = securityRiskOptions.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<SystemSecurityRisk, string>,
)

const controlTypeLabels: Record<string, string> = securityControlTypeOptions.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label, [option.label]: option.label }),
  {} as Record<string, string>,
)

const formatControlType = (value?: string | null) => {
  if (!value) return '-'
  return controlTypeLabels[value] ?? value
}

const systemCategoryLabels: Record<SystemCategory, string> = systemCategoryOptions.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.label }),
  {} as Record<SystemCategory, string>,
)

const contractTypeOptions: Array<{ value: ContractType; label: string }> = [
  { value: 'subscription', label: 'サブスクリプション（定期更新）' },
  { value: 'perpetual', label: '買い切り / 更新なし' },
]

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '-'
  return `¥${value.toLocaleString('ja-JP')}`
}

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ja-JP')
}

const extractDatePortion = (value?: string | null) => {
  if (!value) return ''
  const [datePart] = value.split('T')
  return datePart
}

const formatDate = (value?: string | null) => {
  const normalized = extractDatePortion(value)
  if (!normalized) return '-'
  return normalized
}

const formatMonth = (value?: string | null) => {
  const normalized = extractDatePortion(value)
  if (!normalized) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized.slice(0, 7)
  }
  return normalized
}

const toMonthInputValue = (value?: string | null) => {
  const normalized = extractDatePortion(value)
  if (!normalized) return ''
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return normalized
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized.slice(0, 7)
  }
  return ''
}

const toDateInputValue = (value?: string | null) => {
  const normalized = extractDatePortion(value)
  if (!normalized) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }
  return ''
}

const toDateColumnValue = (value?: string | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  return undefined
}

const normalize = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function GroupCompanyManager({ showInsights = true, showSimulator = true }: GroupCompanyManagerProps = {}) {
  const [companies, setCompanies] = useState<GroupCompanySummary[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [formState, setFormState] = useState<GroupCompanyFormState>(emptyFormState)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<GroupCompanySummary | null>(null)
  const [detailData, setDetailData] = useState<GroupCompanyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<'usage' | 'security'>('usage')
  const [usageDialogOpen, setUsageDialogOpen] = useState(false)
  const [usageDialogMode, setUsageDialogMode] = useState<UsageDialogMode>('create')
  const [usageForm, setUsageForm] = useState<SystemUsageFormState>(emptyUsageFormState)
  const [usageSubmitting, setUsageSubmitting] = useState(false)
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false)
  const [securityDialogMode, setSecurityDialogMode] = useState<SecurityDialogMode>('create')
  const [securityForm, setSecurityForm] = useState<SecurityControlFormState>(emptySecurityFormState)
  const [securitySubmitting, setSecuritySubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [industryFilter, setIndustryFilter] = useState<IndustryFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('company_code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const isPerpetualContract = usageForm.contract_type === 'perpetual'

  const nextCompanyCode = useMemo(() => {
    if (companies.length === 0) return 'GC-001'
    const numbers = companies
      .map((company) => company.company_code)
      .filter((code) => code?.startsWith('GC-'))
      .map((code) => Number(code.replace('GC-', '')))
      .filter((value) => Number.isFinite(value))
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    return `GC-${String(next).padStart(3, '0')}`
  }, [companies])

  const industryOptions = useMemo(() => {
    const values = companies
      .map((company) => company.industry?.trim())
      .filter((value): value is string => Boolean(value))
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [companies])

  const displayedCompanies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const filtered = companies.filter((company) => {
      const matchesSearch = term
        ? [company.company_name, company.company_code, company.region, company.primary_contact_name]
            .map((field) => field?.toLowerCase() ?? '')
            .some((value) => value.includes(term))
        : true
      const matchesStatus = statusFilter === 'all' ? true : company.relationship_status === statusFilter
      const matchesIndustry = industryFilter === 'all' ? true : (company.industry ?? '') === industryFilter
      return matchesSearch && matchesStatus && matchesIndustry
    })

    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number | undefined
      let bValue: string | number | undefined

      switch (sortKey) {
        case 'company_name':
          aValue = a.company_name ?? ''
          bValue = b.company_name ?? ''
          break
        case 'system_usage_count':
          aValue = a.system_usage_count ?? 0
          bValue = b.system_usage_count ?? 0
          break
        case 'security_control_count':
          aValue = a.security_control_count ?? 0
          bValue = b.security_control_count ?? 0
          break
        case 'company_code':
        default:
          aValue = a.company_code ?? ''
          bValue = b.company_code ?? ''
          break
      }

      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ja')
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [companies, industryFilter, searchTerm, sortDirection, sortKey, statusFilter])

  const loadCompanies = async () => {
    setLoading(true)
    const result = await fetchGroupCompanySummaries()
    if (!result.success) {
      toast.error(result.message)
      setCompanies([])
    } else {
      setCompanies(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadDetail = async (companyId: string) => {
    setDetailLoading(true)
    const result = await fetchGroupCompanyDetail(companyId)
    if (!result.success) {
      toast.error(result.message)
      setDetailData(null)
    } else {
      setDetailData(result.data)
    }
    setDetailLoading(false)
  }

  const openDetailSheet = (company: GroupCompanySummary) => {
    setDetailTarget(company)
    setDetailOpen(true)
    setDetailData(null)
    setDetailTab('usage')
    loadDetail(company.id)
  }

  const handleDetailSheetChange = (open: boolean) => {
    setDetailOpen(open)
    if (!open) {
      setDetailTarget(null)
      setDetailData(null)
      setDetailTab('usage')
    }
  }

  const openUsageDialog = (mode: UsageDialogMode, record?: CompanySystemUsage) => {
    const preset = record
      ? {
          id: record.id,
          category: record.category,
          system_name: record.system_name,
          vendor: record.vendor ?? '',
          adoption_status: record.adoption_status,
          license_count: record.license_count !== null && record.license_count !== undefined ? String(record.license_count) : '',
          annual_cost: record.annual_cost !== null && record.annual_cost !== undefined ? String(record.annual_cost) : '',
          contract_type: (record.contract_type ?? 'subscription') as ContractType,
          renewal_date: toMonthInputValue(record.renewal_date),
          integration_level: record.integration_level,
          security_risk_level: record.security_risk_level,
          point_of_contact: record.point_of_contact ?? '',
          notes: record.notes ?? '',
        }
      : { ...emptyUsageFormState }
    setUsageForm(preset)
    setUsageDialogMode(mode)
    setUsageDialogOpen(true)
  }

  const openSecurityDialog = (mode: SecurityDialogMode, record?: CompanySecurityControl) => {
    const preset = record
      ? {
          id: record.id,
          control_type: record.control_type ?? '',
          vendor: record.vendor ?? '',
          adoption_status: record.adoption_status,
          coverage: record.coverage ?? '',
          notes: record.notes ?? '',
          last_verified_at: toDateInputValue(record.last_verified_at),
        }
      : { ...emptySecurityFormState }
    setSecurityForm(preset)
    setSecurityDialogMode(mode)
    setSecurityDialogOpen(true)
  }

  const handleUsageSubmit = async () => {
    if (!detailTarget) {
      toast.error('対象のグループ会社が選択されていません')
      return
    }
    if (!usageForm.system_name.trim()) {
      toast.error('システム名を入力してください')
      return
    }
    setUsageSubmitting(true)
    const normalizedRenewalDate = usageForm.contract_type === 'perpetual' ? undefined : toDateColumnValue(usageForm.renewal_date)
    const payload = {
      id: usageForm.id,
      group_company_id: detailTarget.id,
      system_catalog_id: null,
      category: usageForm.category,
      system_name: usageForm.system_name.trim(),
      vendor: usageForm.vendor,
      adoption_status: usageForm.adoption_status,
      license_count: usageForm.license_count,
      annual_cost: usageForm.annual_cost,
      contract_type: usageForm.contract_type,
      renewal_date: normalizedRenewalDate,
      integration_level: usageForm.integration_level,
      security_risk_level: usageForm.security_risk_level,
      point_of_contact: usageForm.point_of_contact,
      notes: usageForm.notes,
    }
    const result = await upsertCompanySystemUsageRecord(payload)
    setUsageSubmitting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(usageDialogMode === 'create' ? 'システム利用情報を追加しました' : 'システム利用情報を更新しました')
    setUsageDialogOpen(false)
    await loadDetail(detailTarget.id)
    loadCompanies()
  }

  const handleUsageDelete = async (record: CompanySystemUsage) => {
    if (!confirm(`「${record.system_name}」の棚卸情報を削除しますか？`)) {
      return
    }
    const result = await deleteCompanySystemUsageRecord(record.id)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success('システム利用情報を削除しました')
    if (detailTarget) {
      await loadDetail(detailTarget.id)
      loadCompanies()
    }
  }

  const handleSecuritySubmit = async () => {
    if (!detailTarget) {
      toast.error('対象のグループ会社が選択されていません')
      return
    }
    const normalizedControlType = securityForm.control_type.trim()
    if (!normalizedControlType) {
      toast.error('統制種別を入力してください')
      return
    }
    setSecuritySubmitting(true)
    const payload = {
      id: securityForm.id,
      group_company_id: detailTarget.id,
      control_type: normalizedControlType,
      vendor: securityForm.vendor,
      adoption_status: securityForm.adoption_status,
      coverage: securityForm.coverage,
      notes: securityForm.notes,
      last_verified_at: securityForm.last_verified_at || undefined,
    }
    const result = await upsertCompanySecurityControlRecord(payload)
    setSecuritySubmitting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(securityDialogMode === 'create' ? 'セキュリティ統制を追加しました' : 'セキュリティ統制を更新しました')
    setSecurityDialogOpen(false)
    await loadDetail(detailTarget.id)
    loadCompanies()
  }

  const handleSecurityDelete = async (record: CompanySecurityControl) => {
    if (!confirm(`「${formatControlType(record.control_type)}」の統制情報を削除しますか？`)) {
      return
    }
    const result = await deleteCompanySecurityControlRecord(record.id)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success('セキュリティ統制情報を削除しました')
    if (detailTarget) {
      await loadDetail(detailTarget.id)
      loadCompanies()
    }
  }

  const openCreateDialog = () => {
    setFormState({
      ...emptyFormState,
      company_code: nextCompanyCode,
    })
    setDialogMode('create')
    setDialogOpen(true)
  }

  const openEditDialog = (company: GroupCompanySummary) => {
    setFormState({
      id: company.id,
      company_code: company.company_code,
      company_name: company.company_name,
      company_name_kana: company.company_name_kana ?? '',
      region: company.region ?? '',
      country: company.country ?? '',
      industry: company.industry ?? '',
      employee_count_range: company.employee_count_range ?? '',
      revenue_range: company.revenue_range ?? '',
      it_maturity: company.it_maturity ?? '',
      relationship_status: company.relationship_status ?? 'active',
      primary_contact_name: company.primary_contact_name ?? '',
      primary_contact_email: company.primary_contact_email ?? '',
      primary_contact_phone: company.primary_contact_phone ?? '',
      notes: company.notes ?? '',
    })
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!formState.company_name.trim()) {
      toast.error('会社名を入力してください')
      return
    }
    if (!formState.company_code.trim()) {
      toast.error('会社コードを入力してください')
      return
    }

    const payload = {
      id: formState.id,
      company_code: formState.company_code.trim(),
      company_name: formState.company_name.trim(),
      company_name_kana: normalize(formState.company_name_kana),
      region: normalize(formState.region),
      country: normalize(formState.country),
      industry: normalize(formState.industry),
      employee_count_range: normalize(formState.employee_count_range),
      revenue_range: normalize(formState.revenue_range),
      it_maturity: normalize(formState.it_maturity),
      relationship_status: formState.relationship_status.trim() || 'active',
      primary_contact_name: normalize(formState.primary_contact_name),
      primary_contact_email: normalize(formState.primary_contact_email),
      primary_contact_phone: normalize(formState.primary_contact_phone),
      notes: normalize(formState.notes),
    }

    startTransition(async () => {
      const result = await upsertGroupCompany(payload)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(dialogMode === 'create' ? 'グループ会社を登録しました' : 'グループ会社を更新しました')
      setDialogOpen(false)
      loadCompanies()
    })
  }

  const handleDelete = (company: GroupCompanySummary) => {
    if (!confirm(`「${company.company_name}」を削除しますか？`)) {
      return
    }
    startTransition(async () => {
      const result = await deleteGroupCompany(company.id)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success('グループ会社を削除しました')
      loadCompanies()
    })
  }

  const renderStatus = (status: string | null) => {
    const key = status ?? 'active'
    return statusLabels[key] ?? key
  }

  const handleSortChange = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const renderSortableHeader = (label: string, key: SortKey, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => handleSortChange(key)}
        className="flex w-full items-center gap-1 text-left font-medium"
      >
        <span>{label}</span>
        {sortKey === key && (
          sortDirection === 'asc' ? (
            <SortAsc className="h-4 w-4" aria-label="昇順" />
          ) : (
            <SortDesc className="h-4 w-4" aria-label="降順" />
          )
        )}
      </button>
    </TableHead>
  )

  const currentCompany = detailData ?? detailTarget
  const systemUsageList = detailData?.system_usage ?? []
  const securityControlList = detailData?.security_controls ?? []

  return (
    <div className="space-y-4">
      {showInsights && <GroupSystemInsights />}
      {showSimulator && <VendorConsolidationSimulator />}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>グループ会社一覧</CardTitle>
              <CardDescription>グループ各社の基本情報と棚卸件数を管理します。</CardDescription>
            </div>
            <Button onClick={openCreateDialog} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="会社名・コードで検索"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="min-w-[180px]">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ステータス: すべて</SelectItem>
                  {relationshipStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Select value={industryFilter} onValueChange={(value) => setIndustryFilter(value as IndustryFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="業種" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">業種: すべて</SelectItem>
                  {industryOptions.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          ) : companies.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">登録されているグループ会社がありません</p>
          ) : displayedCompanies.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">条件に一致するグループ会社がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader('会社コード', 'company_code', 'w-32')}
                    {renderSortableHeader('会社名', 'company_name')}
                    <TableHead>業種</TableHead>
                    <TableHead>担当者</TableHead>
                    {renderSortableHeader('システム棚卸', 'system_usage_count')}
                    {renderSortableHeader('セキュリティ統制', 'security_control_count')}
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.company_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{company.company_name}</p>
                          {company.region && (
                            <p className="text-xs text-muted-foreground">{company.region}{company.country ? ` / ${company.country}` : ''}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{company.industry || '-'}</TableCell>
                      <TableCell>
                        {company.primary_contact_name ? (
                          <div>
                            <p>{company.primary_contact_name}</p>
                            {company.primary_contact_email && (
                              <p className="text-xs text-muted-foreground">{company.primary_contact_email}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">未設定</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company.system_usage_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company.security_control_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.relationship_status === 'active' ? 'default' : 'secondary'}>
                          {renderStatus(company.relationship_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openDetailSheet(company)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(company)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(company)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={detailOpen} onOpenChange={handleDetailSheetChange}>
        <SheetContent
          side="right"
          className="w-full space-y-4 overflow-y-auto p-6 sm:w-[70vw] sm:max-w-none lg:w-[960px] lg:max-w-[960px] xl:w-[1100px] xl:max-w-[1100px]"
        >
          <SheetHeader>
            <SheetTitle>{currentCompany ? currentCompany.company_name : '会社詳細'}</SheetTitle>
            <SheetDescription>システム棚卸とセキュリティ統制の状況を確認・更新します。</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          ) : currentCompany ? (
            <div className="space-y-6 pb-8">
              <div className="rounded-md border p-4">
                <p className="text-sm font-semibold">会社コード</p>
                <p className="text-lg">{currentCompany.company_code}</p>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">地域 / 国</p>
                    <p>{currentCompany.region || currentCompany.country ? `${currentCompany.region ?? '-'} / ${currentCompany.country ?? '-'}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">主要担当者</p>
                    <p>{currentCompany.primary_contact_name || '-'}</p>
                    {currentCompany.primary_contact_email && (
                      <p className="text-muted-foreground">{currentCompany.primary_contact_email}</p>
                    )}
                  </div>
                </div>
              </div>

              <Tabs value={detailTab} onValueChange={(value) => setDetailTab(value as 'usage' | 'security')} className="space-y-4">
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="usage">
                    システム利用状況
                  </TabsTrigger>
                  <TabsTrigger className="flex-1" value="security">
                    セキュリティ統制
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="usage" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">導入システムの棚卸明細</p>
                    <Button size="sm" onClick={() => openUsageDialog('create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      追加
                    </Button>
                  </div>
                  {systemUsageList.length === 0 ? (
                    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      登録されているシステム利用情報がありません。追加ボタンから登録してください。
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>カテゴリ</TableHead>
                            <TableHead>システム名</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>ライセンス数</TableHead>
                            <TableHead>年間コスト</TableHead>
                            <TableHead>更新月</TableHead>
                            <TableHead>連携度</TableHead>
                            <TableHead>リスク</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {systemUsageList.map((usage) => (
                            <TableRow key={usage.id}>
                              <TableCell>{systemCategoryLabels[usage.category]}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{usage.system_name}</p>
                                  {usage.vendor && (
                                    <p className="text-xs text-muted-foreground">{usage.vendor}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{adoptionStatusLabels[usage.adoption_status]}</Badge>
                              </TableCell>
                              <TableCell>{formatNumber(usage.license_count)}</TableCell>
                              <TableCell>{formatCurrency(usage.annual_cost)}</TableCell>
                              <TableCell>{formatMonth(usage.renewal_date)}</TableCell>
                              <TableCell>{integrationLevelLabels[usage.integration_level]}</TableCell>
                              <TableCell>{securityRiskLabels[usage.security_risk_level]}</TableCell>
                              <TableCell className="space-x-2 text-right">
                                <Button size="icon" variant="outline" onClick={() => openUsageDialog('edit', usage)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" onClick={() => handleUsageDelete(usage)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">導入済み・検討中のセキュリティ統制</p>
                    <Button size="sm" onClick={() => openSecurityDialog('create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      追加
                    </Button>
                  </div>
                  {securityControlList.length === 0 ? (
                    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      セキュリティ統制情報がありません。必要に応じて追加してください。
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>統制種別</TableHead>
                            <TableHead>ベンダー</TableHead>
                            <TableHead>採用状況</TableHead>
                            <TableHead>カバレッジ</TableHead>
                            <TableHead>最終確認日</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {securityControlList.map((control) => (
                            <TableRow key={control.id}>
                              <TableCell>{formatControlType(control.control_type)}</TableCell>
                              <TableCell>{control.vendor || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{adoptionStatusLabels[control.adoption_status]}</Badge>
                              </TableCell>
                              <TableCell>{control.coverage || '-'}</TableCell>
                              <TableCell>{formatDate(control.last_verified_at)}</TableCell>
                              <TableCell className="space-x-2 text-right">
                                <Button size="icon" variant="outline" onClick={() => openSecurityDialog('edit', control)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" onClick={() => handleSecurityDelete(control)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">会社を選択すると詳細が表示されます。</p>
          )
          }
        </SheetContent>
      </Sheet>

      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{usageDialogMode === 'create' ? 'システム利用情報の追加' : 'システム利用情報の編集'}</DialogTitle>
            <DialogDescription>カテゴリやコスト情報を入力し、棚卸データを最新化します。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>カテゴリ *</Label>
              <Select
                value={usageForm.category}
                onValueChange={(value) => setUsageForm((prev) => ({ ...prev, category: value as SystemCategory }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリを選択" />
                </SelectTrigger>
                <SelectContent>
                  {systemCategoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>システム名 *</Label>
              <Input
                value={usageForm.system_name}
                onChange={(event) => setUsageForm((prev) => ({ ...prev, system_name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>ベンダー</Label>
              <Input value={usageForm.vendor} onChange={(event) => setUsageForm((prev) => ({ ...prev, vendor: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>採用状況 *</Label>
              <Select
                value={usageForm.adoption_status}
                onValueChange={(value) => setUsageForm((prev) => ({ ...prev, adoption_status: value as SystemAdoptionStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {adoptionStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ライセンス数</Label>
              <Input
                type="number"
                min={0}
                value={usageForm.license_count}
                onChange={(event) => setUsageForm((prev) => ({ ...prev, license_count: event.target.value }))}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>年間コスト (JPY)</Label>
              <Input
                type="number"
                min={0}
                value={usageForm.annual_cost}
                onChange={(event) => setUsageForm((prev) => ({ ...prev, annual_cost: event.target.value }))}
                placeholder="1200000"
              />
            </div>
            <div className="space-y-4 md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>契約形態 *</Label>
                  <Select
                    value={usageForm.contract_type}
                    onValueChange={(value) =>
                      setUsageForm((prev) => ({
                        ...prev,
                        contract_type: value as ContractType,
                        renewal_date: value === 'perpetual' ? '' : prev.renewal_date,
                      }))
                    }
                  >
                    <SelectTrigger className="whitespace-normal text-left">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">買い切りを選択すると更新月の入力は不要です。</p>
                </div>
                <div className="space-y-2">
                  <Label>更新月</Label>
                  <Input
                    type="month"
                    disabled={isPerpetualContract}
                    value={usageForm.renewal_date}
                    onChange={(event) => setUsageForm((prev) => ({ ...prev, renewal_date: event.target.value }))}
                  />
                  <p className="min-h-[1.25rem] text-xs text-muted-foreground">
                    {isPerpetualContract ? '買い切りの場合は自動的に未設定として保存されます。' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>連携度 *</span>
                <span className="text-xs text-muted-foreground">社内システムとのデータ連携レベル</span>
              </Label>
              <Select
                value={usageForm.integration_level}
                onValueChange={(value) => setUsageForm((prev) => ({ ...prev, integration_level: value as SystemIntegrationLevel }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {integrationLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">例: 手動=CSV取込、部分=一部API連携、完全=主要システムとフル連携</p>
            </div>
            <div className="space-y-2">
              <Label>セキュリティリスク *</Label>
              <Select
                value={usageForm.security_risk_level}
                onValueChange={(value) => setUsageForm((prev) => ({ ...prev, security_risk_level: value as SystemSecurityRisk }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {securityRiskOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>窓口担当者</Label>
              <Input
                value={usageForm.point_of_contact}
                onChange={(event) => setUsageForm((prev) => ({ ...prev, point_of_contact: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>備考</Label>
              <Textarea
                value={usageForm.notes}
                onChange={(event) => setUsageForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialogOpen(false)} disabled={usageSubmitting}>
              キャンセル
            </Button>
            <Button onClick={handleUsageSubmit} disabled={usageSubmitting}>
              {usageSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={securityDialogOpen} onOpenChange={setSecurityDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{securityDialogMode === 'create' ? 'セキュリティ統制の追加' : 'セキュリティ統制の編集'}</DialogTitle>
            <DialogDescription>導入状況やカバレッジを登録し、監査対応の準備を整えます。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>統制種別 *</Label>
              <Input
                value={securityForm.control_type}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, control_type: event.target.value }))}
                placeholder="例: EDR / CASB / SASE"
              />
              <p className="text-xs text-muted-foreground">クリックで入力に反映できる推奨カテゴリ</p>
              <div className="flex flex-wrap gap-2">
                {securityControlTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setSecurityForm((prev) => ({ ...prev, control_type: option.label }))
                    }
                    className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>採用状況 *</Label>
              <Select
                value={securityForm.adoption_status}
                onValueChange={(value) =>
                  setSecurityForm((prev) => ({ ...prev, adoption_status: value as SystemAdoptionStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {adoptionStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ベンダー</Label>
              <Input value={securityForm.vendor} onChange={(event) => setSecurityForm((prev) => ({ ...prev, vendor: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>カバレッジ</Label>
              <Input
                value={securityForm.coverage}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, coverage: event.target.value }))}
                placeholder="全社/営業部など"
              />
            </div>
            <div className="space-y-2">
              <Label>最終確認日</Label>
              <Input
                type="date"
                value={securityForm.last_verified_at}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, last_verified_at: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>備考</Label>
              <Textarea
                value={securityForm.notes}
                onChange={(event) => setSecurityForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecurityDialogOpen(false)} disabled={securitySubmitting}>
              キャンセル
            </Button>
            <Button onClick={handleSecuritySubmit} disabled={securitySubmitting}>
              {securitySubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'グループ会社登録' : 'グループ会社編集'}</DialogTitle>
            <DialogDescription>基本情報と担当者情報を入力してください。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_code">会社コード *</Label>
              <Input
                id="company_code"
                value={formState.company_code}
                onChange={(event) => setFormState((prev) => ({ ...prev, company_code: event.target.value }))}
                placeholder="GC-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">会社名 *</Label>
              <Input
                id="company_name"
                value={formState.company_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, company_name: event.target.value }))}
                placeholder="〇〇株式会社"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name_kana">会社名（カナ）</Label>
              <Input
                id="company_name_kana"
                value={formState.company_name_kana}
                onChange={(event) => setFormState((prev) => ({ ...prev, company_name_kana: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">業種</Label>
              <Input
                id="industry"
                value={formState.industry}
                onChange={(event) => setFormState((prev) => ({ ...prev, industry: event.target.value }))}
                placeholder="ITサービス"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">地域</Label>
              <Input
                id="region"
                value={formState.region}
                onChange={(event) => setFormState((prev) => ({ ...prev, region: event.target.value }))}
                placeholder="関東"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">国</Label>
              <Input
                id="country"
                value={formState.country}
                onChange={(event) => setFormState((prev) => ({ ...prev, country: event.target.value }))}
                placeholder="日本"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_count_range">従業員規模</Label>
              <Input
                id="employee_count_range"
                value={formState.employee_count_range}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, employee_count_range: event.target.value }))
                }
                placeholder="100-300名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue_range">売上規模</Label>
              <Input
                id="revenue_range"
                value={formState.revenue_range}
                onChange={(event) => setFormState((prev) => ({ ...prev, revenue_range: event.target.value }))}
                placeholder="50-80億円"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it_maturity">IT成熟度</Label>
              <Input
                id="it_maturity"
                value={formState.it_maturity}
                onChange={(event) => setFormState((prev) => ({ ...prev, it_maturity: event.target.value }))}
                placeholder="中"
              />
            </div>
            <div className="space-y-2">
              <Label>関係ステータス</Label>
              <Select
                value={formState.relationship_status}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, relationship_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_contact_name">主要担当者</Label>
              <Input
                id="primary_contact_name"
                value={formState.primary_contact_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, primary_contact_name: event.target.value }))}
                placeholder="山田 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_contact_email">担当者メール</Label>
              <Input
                id="primary_contact_email"
                value={formState.primary_contact_email}
                onChange={(event) => setFormState((prev) => ({ ...prev, primary_contact_email: event.target.value }))}
                placeholder="taro@example.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_contact_phone">担当者電話</Label>
              <Input
                id="primary_contact_phone"
                value={formState.primary_contact_phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, primary_contact_phone: event.target.value }))}
                placeholder="03-1234-5678"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DepartmentManager } from '@/components/settings/department-manager'
import { GroupCompanyManager } from '@/components/settings/group-company-manager'
import { previewDocumentLayout } from './actions'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentLayoutTableColumnConfig,
  DocumentSectionKey,
  DocumentTargetEntity,
} from '@/types/document-layout'
import {
  getDefaultDocumentLayout,
  mergeDocumentLayoutConfig,
  sanitizeDocumentLayoutConfig,
  sortColumns,
  sortSections,
} from '@/lib/document-layout'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  created_at: string
}

interface Customer {
  id: string
  customer_code: string
  customer_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

interface Supplier {
  id: string
  supplier_code: string
  supplier_name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

interface ApprovalRoute {
  id: string
  name: string
  description: string | null
  requester_role: string | null
  target_entity: 'quote' | 'purchase_order'
  min_total_amount: number | null
  max_total_amount: number | null
  is_active: boolean
  created_at: string
  steps: ApprovalRouteStep[]
}

interface ApprovalRouteStep {
  id: string
  step_order: number
  approver_role: string
  notes: string | null
}

type ApprovalRouteFormStep = {
  clientId: string
  approver_role: string
  notes: string
}

interface ApprovalRouteFormState {
  id?: string
  name: string
  description: string
  requester_role: string
  target_entity: 'quote' | 'purchase_order'
  min_total_amount: string
  max_total_amount: string
  is_active: boolean
  steps: ApprovalRouteFormStep[]
}

type DialogMode = 'create' | 'edit'
type DataType = 'user' | 'customer' | 'supplier'

type ManagementFormState = Partial<{
  email: string
  password: string
  display_name: string
  role: string
  customer_code: string
  customer_name: string
  supplier_code: string
  supplier_name: string
  contact_person: string
  phone: string
  address: string
}>

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // データ
  const [users, setUsers] = useState<User[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [approvalRoutes, setApprovalRoutes] = useState<ApprovalRoute[]>([])
  const [activitySettings, setActivitySettings] = useState({
    warning_days: 7,
    danger_days: 14,
    safe_color: '#FFFFFF',
    warning_color: '#FEF3C7',
    danger_color: '#FEE2E2',
  })
  const [activitySettingsSaving, setActivitySettingsSaving] = useState(false)
  const [companyProfile, setCompanyProfile] = useState({
    company_name: '',
    company_address: '',
  })
  const [companyProfileSaving, setCompanyProfileSaving] = useState(false)
  const [documentLayouts, setDocumentLayouts] = useState<Record<DocumentTargetEntity, DocumentLayoutConfig>>({
    quote: getDefaultDocumentLayout('quote'),
    purchase_order: getDefaultDocumentLayout('purchase_order'),
  })
  const [layoutSaving, setLayoutSaving] = useState<Record<DocumentTargetEntity, boolean>>({
    quote: false,
    purchase_order: false,
  })
  const [previewing, setPreviewing] = useState<Record<DocumentTargetEntity, boolean>>({
    quote: false,
    purchase_order: false,
  })

  // ダイアログ
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [dialogType, setDialogType] = useState<DataType>('customer')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // フォーム
  const [formData, setFormData] = useState<ManagementFormState>({})
  const [submitting, setSubmitting] = useState(false)
  const [routeDialogOpen, setRouteDialogOpen] = useState(false)
  const [routeDialogMode, setRouteDialogMode] = useState<DialogMode>('create')
  const [routeSubmitting, setRouteSubmitting] = useState(false)
  const [routeForm, setRouteForm] = useState<ApprovalRouteFormState>({
    name: '',
    description: '',
    requester_role: 'all',
    target_entity: 'quote',
    min_total_amount: '',
    max_total_amount: '',
    is_active: true,
    steps: [],
  })

  const generateClientId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return Math.random().toString(36).slice(2)
  }

  const createEmptyStep = (role: string = '営業事務'): ApprovalRouteFormStep => ({
    clientId: generateClientId(),
    approver_role: role,
    notes: '',
  })

  const documentTargetLabels: Record<DocumentTargetEntity, string> = {
    quote: '見積書',
    purchase_order: '発注書',
  }

  const FIXED_SECTION_KEYS: Record<DocumentTargetEntity, Set<DocumentSectionKey>> = {
    quote: new Set(['document_meta', 'company_info', 'customer_info', 'project_info', 'items_table', 'totals', 'notes', 'footer']),
    purchase_order: new Set(['document_meta', 'company_info', 'supplier_info', 'quote_info', 'items_table', 'totals', 'notes', 'footer']),
  }

  const sectionColumnOptions: { value: DocumentLayoutSectionConfig['column']; label: string }[] = [
    { value: 'left', label: '左側' },
    { value: 'right', label: '右側' },
    { value: 'full', label: '全幅' },
  ]

  const renderLayoutEditor = (target: DocumentTargetEntity) => {
    const layout = documentLayouts[target]
    if (!layout) return null

    const sections = sortSections(layout.sections)
    const columns = sortColumns(layout.table_columns)
    const fixedSections = sections.filter((section) => FIXED_SECTION_KEYS[target].has(section.key))
    const customSections = sections.filter((section) => !FIXED_SECTION_KEYS[target].has(section.key))

    const renderSectionTable = (tableSections: DocumentLayoutSectionConfig[]) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">表示</TableHead>
            <TableHead>名称</TableHead>
            <TableHead className="w-24">行</TableHead>
            <TableHead className="w-32">配置</TableHead>
            <TableHead className="w-24">幅(%)</TableHead>
            <TableHead className="w-24">優先度</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableSections.map((section) => (
            <TableRow key={`${target}-${section.key}`}>
              <TableCell>
                <Checkbox
                  checked={section.enabled}
                  onCheckedChange={(value) =>
                    handleSectionChange(target, section.key, { enabled: value === true })
                  }
                  aria-label={`${section.label}を表示`}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={section.label}
                  onChange={(event) =>
                    handleSectionChange(target, section.key, { label: event.target.value })
                  }
                />
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={section.show_label !== false}
                      onCheckedChange={(value) =>
                        handleSectionChange(target, section.key, { show_label: value === false ? false : true })
                      }
                    />
                    <span>ラベルを表示</span>
                  </label>
                  <span>リージョン: {section.region}</span>
                </div>
                {section.key === 'document_meta' && (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="タイトル (例: 御見積書)"
                      value={section.title ?? ''}
                      onChange={(event) =>
                        handleSectionChange(target, section.key, { title: event.target.value })
                      }
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={section.show_title !== false}
                        onCheckedChange={(value) =>
                          handleSectionChange(target, section.key, {
                            show_title: value === false ? false : true,
                          })
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
                  onChange={(event) =>
                    handleSectionChange(target, section.key, { row: Number(event.target.value) || 0 })
                  }
                />
              </TableCell>
              <TableCell>
                <Select
                  value={section.column}
                  onValueChange={(value) =>
                    handleSectionChange(target, section.key, {
                      column: value as DocumentLayoutSectionConfig['column'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionColumnOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
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
                  onChange={(event) =>
                    handleSectionChange(target, section.key, { width: Number(event.target.value) || 0 })
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  value={section.order}
                  onChange={(event) =>
                    handleSectionChange(target, section.key, { order: Number(event.target.value) || 0 })
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 font-semibold">固定表示セクション</h4>
            {fixedSections.length > 0 ? (
              renderSectionTable(fixedSections)
            ) : (
              <p className="text-sm text-muted-foreground">固定表示セクションはありません。</p>
            )}
          </div>
          <div>
            <h4 className="mb-2 font-semibold">カスタムセクション</h4>
            {customSections.length > 0 ? (
              renderSectionTable(customSections)
            ) : (
              <p className="text-sm text-muted-foreground">追加のカスタムセクションはありません。</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 font-semibold">明細テーブル列</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">表示</TableHead>
                <TableHead>列名</TableHead>
                <TableHead className="w-24">幅(%)</TableHead>
                <TableHead className="w-24">順序</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={`${target}-${column.key}`}>
                  <TableCell>
                    <Checkbox
                      checked={column.enabled}
                      onCheckedChange={(value) =>
                        handleColumnChange(target, column.key, { enabled: value === true })
                      }
                      aria-label={`${column.label}列を表示`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={column.label}
                      onChange={(event) =>
                        handleColumnChange(target, column.key, { label: event.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      step={5}
                      value={column.width}
                      onChange={(event) =>
                        handleColumnChange(target, column.key, { width: Number(event.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={column.order}
                      onChange={(event) =>
                        handleColumnChange(target, column.key, { order: Number(event.target.value) || 0 })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => handleSaveLayout(target)}
            disabled={layoutSaving[target] || previewing[target]}
          >
            {layoutSaving[target] || previewing[target] ? '保存・プレビュー中...' : '保存してプレビュー'}
          </Button>
        </div>
      </div>
    )
  }

  const generateNextCode = (values: (string | null | undefined)[], prefix: string) => {
    const numericValues = values.reduce<number[]>((acc, value) => {
      if (typeof value === 'string' && value.startsWith(prefix)) {
        const parsed = parseInt(value.replace(prefix, ''), 10)
        if (!Number.isNaN(parsed)) {
          acc.push(parsed)
        }
      }
      return acc
    }, [])

    const nextValue = numericValues.length > 0 ? Math.max(...numericValues) + 1 : 1
    return `${prefix}${String(nextValue).padStart(3, '0')}`
  }

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAllData()
    }
  }, [currentUser])

  const loadCurrentUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      router.push('/login')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userData) {
      if (userData.role !== '営業事務' && userData.role !== '管理者') {
        toast.error('この機能は営業事務・管理者のみ利用できます')
        router.push('/dashboard')
        return
      }
      setCurrentUser(userData)
    }
  }

  const loadAllData = async () => {
    try {
      const [
        usersRes,
        customersRes,
        suppliersRes,
        routesRes,
        activitySettingsRes,
        companyProfileRes,
        documentLayoutRes,
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase
          .from('approval_routes')
          .select('*, steps:approval_route_steps(*)')
          .order('min_total_amount', { ascending: true })
          .order('step_order', { ascending: true, foreignTable: 'approval_route_steps' }),
        supabase.from('project_activity_settings').select('*').maybeSingle(),
        supabase.from('company_profile').select('*').maybeSingle(),
        supabase.from('document_layout_settings').select('*'),
      ])

      if (usersRes.data) setUsers(usersRes.data)
      if (customersRes.data) setCustomers(customersRes.data)
      if (suppliersRes.data) setSuppliers(suppliersRes.data)
      if (routesRes.data) {
        const mapped = routesRes.data.map((route) => ({
          ...route,
          target_entity: route.target_entity as 'quote' | 'purchase_order',
          steps: (route.steps || []).sort((a: ApprovalRouteStep, b: ApprovalRouteStep) => a.step_order - b.step_order),
        })) as ApprovalRoute[]
        setApprovalRoutes(mapped)
      }
      if (activitySettingsRes.data) {
        setActivitySettings({
          warning_days: activitySettingsRes.data.warning_days ?? 7,
          danger_days: activitySettingsRes.data.danger_days ?? 14,
          safe_color: activitySettingsRes.data.safe_color ?? '#FFFFFF',
          warning_color: activitySettingsRes.data.warning_color ?? '#FEF3C7',
          danger_color: activitySettingsRes.data.danger_color ?? '#FEE2E2',
        })
      }

      if (companyProfileRes.data) {
        setCompanyProfile({
          company_name: companyProfileRes.data.company_name ?? '',
          company_address: companyProfileRes.data.company_address ?? '',
        })
      }

      if (documentLayoutRes.data) {
        const nextLayouts: Record<DocumentTargetEntity, DocumentLayoutConfig> = {
          quote: getDefaultDocumentLayout('quote'),
          purchase_order: getDefaultDocumentLayout('purchase_order'),
        }

        for (const layoutRow of documentLayoutRes.data) {
          if (layoutRow.target_entity === 'quote' || layoutRow.target_entity === 'purchase_order') {
            const entity: DocumentTargetEntity = layoutRow.target_entity
            nextLayouts[entity] = mergeDocumentLayoutConfig(entity, {
              sections: layoutRow.sections,
              table_columns: layoutRow.table_columns,
            })
          }
        }

        setDocumentLayouts(nextLayouts)
      }

      setLoading(false)
    } catch (error) {
      console.error('データ読込エラー:', error)
      toast.error('データの読込に失敗しました')
      setLoading(false)
    }
  }

  const openRouteDialog = (mode: DialogMode, route?: ApprovalRoute) => {
    setRouteDialogMode(mode)
    if (mode === 'edit' && route) {
      setRouteForm({
        id: route.id,
        name: route.name,
        description: route.description || '',
        requester_role: route.requester_role || 'all',
        target_entity: route.target_entity || 'quote',
        min_total_amount: route.min_total_amount != null ? String(Number(route.min_total_amount)) : '',
        max_total_amount: route.max_total_amount != null ? String(Number(route.max_total_amount)) : '',
        is_active: route.is_active,
        steps: (route.steps && route.steps.length > 0
          ? route.steps
          : [createEmptyStep()]
        ).map((step) => ({
          clientId: generateClientId(),
          approver_role: step.approver_role,
          notes: step.notes || '',
        })),
      })
    } else {
      setRouteForm({
        name: '',
        description: '',
        requester_role: 'all',
        target_entity: 'quote',
        min_total_amount: '',
        max_total_amount: '',
        is_active: true,
        steps: [createEmptyStep()],
      })
    }
    setRouteDialogOpen(true)
  }

  const handleSaveActivitySettings = async () => {
    setActivitySettingsSaving(true)
    try {
      const { error } = await supabase
        .from('project_activity_settings')
        .upsert({
          id: true,
          warning_days: Number(activitySettings.warning_days) || 0,
          danger_days: Number(activitySettings.danger_days) || 0,
          safe_color: activitySettings.safe_color,
          warning_color: activitySettings.warning_color,
          danger_color: activitySettings.danger_color,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        throw error
      }

      toast.success('活動しきい値を更新しました')
    } catch (err) {
      console.error(err)
      toast.error('活動しきい値の更新に失敗しました')
    } finally {
      setActivitySettingsSaving(false)
    }
  }

  const handleSaveCompanyProfile = async () => {
    const trimmedName = companyProfile.company_name.trim()
    const trimmedAddress = companyProfile.company_address.trim()

    if (!trimmedName) {
      toast.error('会社名を入力してください')
      return
    }
    if (!trimmedAddress) {
      toast.error('住所を入力してください')
      return
    }

    setCompanyProfileSaving(true)
    try {
      const { error } = await supabase
        .from('company_profile')
        .upsert({
          id: true,
          company_name: trimmedName,
          company_address: trimmedAddress,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        throw error
      }

      setCompanyProfile({ company_name: trimmedName, company_address: trimmedAddress })
      toast.success('会社情報を更新しました')
    } catch (error) {
      console.error('会社情報更新エラー:', error)
      toast.error('会社情報の更新に失敗しました')
    } finally {
      setCompanyProfileSaving(false)
    }
  }

  const handlePreviewLayout = async (target: DocumentTargetEntity) => {
    if (typeof window === 'undefined') return
    const previewWindow = window.open('', '_blank')
    setPreviewing((prev) => ({ ...prev, [target]: true }))
    try {
      const result = await previewDocumentLayout(target)
      if (!result.success || !result.base64) {
        previewWindow?.close()
        toast.error(result.message || 'プレビューの生成に失敗しました')
        return
      }
      const binary = atob(result.base64)
      const len = binary.length
      const buffer = new Uint8Array(len)
      for (let i = 0; i < len; i += 1) {
        buffer[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      previewWindow?.location.replace(url)
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60_000)
    } catch (error) {
      console.error('帳票プレビュー生成エラー:', error)
      previewWindow?.close()
      toast.error('プレビューの生成に失敗しました')
    } finally {
      setPreviewing((prev) => ({ ...prev, [target]: false }))
    }
  }

  const updateDocumentLayout = (
    target: DocumentTargetEntity,
    updater: (current: DocumentLayoutConfig) => DocumentLayoutConfig,
  ) => {
    setDocumentLayouts((prev) => {
      const current = prev[target] ?? getDefaultDocumentLayout(target)
      return {
        ...prev,
        [target]: updater(current),
      }
    })
  }

  const handleSectionChange = (
    target: DocumentTargetEntity,
    key: string,
    updates: Partial<Omit<DocumentLayoutSectionConfig, 'key' | 'region'>>,
  ) => {
    updateDocumentLayout(target, (current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.key === key ? { ...section, ...updates } : section
      ),
    }))
  }

  const handleColumnChange = (
    target: DocumentTargetEntity,
    key: string,
    updates: Partial<Omit<DocumentLayoutTableColumnConfig, 'key'>>,
  ) => {
    updateDocumentLayout(target, (current) => ({
      ...current,
      table_columns: current.table_columns.map((column) =>
        column.key === key ? { ...column, ...updates } : column
      ),
    }))
  }

  const handleSaveLayout = async (target: DocumentTargetEntity) => {
    const current = documentLayouts[target]
    if (!current) return

    setLayoutSaving((prev) => ({ ...prev, [target]: true }))
    try {
      const sanitized = sanitizeDocumentLayoutConfig(target, current)
      const { error } = await supabase
        .from('document_layout_settings')
        .upsert({
          target_entity: target,
          sections: sanitized.sections,
          table_columns: sanitized.table_columns,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setDocumentLayouts((prev) => ({
        ...prev,
        [target]: sanitized,
      }))
      toast.success('帳票レイアウトを更新しました')
      await handlePreviewLayout(target)
    } catch (error) {
      console.error('帳票レイアウト更新エラー:', error)
      toast.error('帳票レイアウトの更新に失敗しました')
    } finally {
      setLayoutSaving((prev) => ({ ...prev, [target]: false }))
    }
  }

  const updateRouteStepRole = (clientId: string, role: string) => {
    setRouteForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.clientId === clientId ? { ...step, approver_role: role } : step
      ),
    }))
  }

  const updateRouteStepNotes = (clientId: string, notes: string) => {
    setRouteForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.clientId === clientId ? { ...step, notes } : step
      ),
    }))
  }

  const removeRouteStep = (clientId: string) => {
    setRouteForm((prev) => {
      if (prev.steps.length <= 1) return prev
      return {
        ...prev,
        steps: prev.steps.filter((step) => step.clientId !== clientId),
      }
    })
  }

  const moveRouteStep = (index: number, direction: 'up' | 'down') => {
    setRouteForm((prev) => {
      const steps = [...prev.steps]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= steps.length) return prev
      const temp = steps[targetIndex]
      steps[targetIndex] = steps[index]
      steps[index] = temp
      return { ...prev, steps }
    })
  }

  const addRouteStep = () => {
    setRouteForm((prev) => ({
      ...prev,
      steps: [...prev.steps, createEmptyStep(prev.steps.at(-1)?.approver_role || '営業事務')],
    }))
  }

  const handleRouteFieldChange = (field: keyof ApprovalRouteFormState, value: string | boolean) => {
    setRouteForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatCurrency = (value: number) => {
    if (Number.isNaN(value)) return '¥0'
    return `¥${value.toLocaleString()}`
  }

  const getAmountRangeLabel = (route: ApprovalRoute) => {
    const min = route.min_total_amount != null ? Number(route.min_total_amount) : null
    const max = route.max_total_amount != null ? Number(route.max_total_amount) : null
    if (min == null && max == null) return 'すべて'
    if (min != null && max != null) return `${formatCurrency(min)} ～ ${formatCurrency(max)}`
    if (min != null) return `${formatCurrency(min)} 以上`
    return `${formatCurrency(max!)} 以下`
  }

  const getRoleLabel = (role: string | null) => {
    if (!role || role === 'all') return '全役職'
    return role
  }

  const handleSaveRoute = async () => {
    if (!routeForm.name.trim()) {
      toast.error('フロー名を入力してください')
      return
    }
    if (routeForm.steps.length === 0) {
      toast.error('承認ステップを1件以上追加してください')
      return
    }

    const minAmount = routeForm.min_total_amount ? Number(routeForm.min_total_amount) : null
    const maxAmount = routeForm.max_total_amount ? Number(routeForm.max_total_amount) : null
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      toast.error('金額範囲の最小値は最大値以下である必要があります')
      return
    }

    setRouteSubmitting(true)
    try {
      const requesterRoleValue = routeForm.requester_role === 'all' ? null : routeForm.requester_role

      if (routeDialogMode === 'create') {
        const { data: newRoute, error: insertError } = await supabase
          .from('approval_routes')
          .insert({
            name: routeForm.name.trim(),
            description: routeForm.description.trim() || null,
            requester_role: requesterRoleValue,
            target_entity: routeForm.target_entity,
            min_total_amount: minAmount,
            max_total_amount: maxAmount,
            is_active: routeForm.is_active,
          })
          .select()
          .single()

        if (insertError) throw insertError

        const stepsPayload = routeForm.steps.map((step, index) => ({
          route_id: newRoute.id,
          step_order: index + 1,
          approver_role: step.approver_role,
          notes: step.notes.trim() ? step.notes.trim() : null,
        }))

        if (stepsPayload.length > 0) {
          const { error: stepsError } = await supabase
            .from('approval_route_steps')
            .insert(stepsPayload)

          if (stepsError) throw stepsError
        }
      } else if (routeForm.id) {
        const { error: updateError } = await supabase
          .from('approval_routes')
          .update({
            name: routeForm.name.trim(),
            description: routeForm.description.trim() || null,
            requester_role: requesterRoleValue,
            target_entity: routeForm.target_entity,
            min_total_amount: minAmount,
            max_total_amount: maxAmount,
            is_active: routeForm.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', routeForm.id)

        if (updateError) throw updateError

        await supabase.from('approval_route_steps').delete().eq('route_id', routeForm.id)

        const stepsPayload = routeForm.steps.map((step, index) => ({
          route_id: routeForm.id,
          step_order: index + 1,
          approver_role: step.approver_role,
          notes: step.notes.trim() ? step.notes.trim() : null,
        }))

        if (stepsPayload.length > 0) {
          const { error: stepsError } = await supabase
            .from('approval_route_steps')
            .insert(stepsPayload)

          if (stepsError) throw stepsError
        }
      }

      toast.success(routeDialogMode === 'create' ? '承認フローを追加しました' : '承認フローを更新しました')
      setRouteDialogOpen(false)
      loadAllData()
    } catch (error) {
      console.error('承認フロー保存エラー:', error)
      toast.error('承認フローの保存に失敗しました')
    } finally {
      setRouteSubmitting(false)
    }
  }

  const handleToggleRoute = async (route: ApprovalRoute) => {
    try {
      const { error } = await supabase
        .from('approval_routes')
        .update({ is_active: !route.is_active })
        .eq('id', route.id)

      if (error) throw error
      toast.success('承認フローのステータスを更新しました')
      loadAllData()
    } catch (error) {
      console.error('承認フローステータス更新エラー:', error)
      toast.error('承認フローの更新に失敗しました')
    }
  }

  const handleDeleteRoute = async (route: ApprovalRoute) => {
    if (!confirm(`承認フロー「${route.name}」を削除しますか？`)) return
    try {
      const { error } = await supabase.from('approval_routes').delete().eq('id', route.id)
      if (error) throw error
      toast.success('承認フローを削除しました')
      loadAllData()
    } catch (error) {
      console.error('承認フロー削除エラー:', error)
      toast.error('承認フローの削除に失敗しました')
    }
  }

  const handleOpenDialog = (type: DataType, mode: DialogMode, id?: string) => {
    setDialogType(type)
    setDialogMode(mode)
    setSelectedId(id || null)

    if (mode === 'edit' && id) {
      if (type === 'user') {
        const user = users.find((u) => u.id === id)
        if (user) {
          setFormData({
            email: user.email,
            display_name: user.display_name,
            role: user.role,
          })
        }
      } else if (type === 'customer') {
        const customer = customers.find((c) => c.id === id)
        if (customer) {
          setFormData({
            customer_code: customer.customer_code,
            customer_name: customer.customer_name,
            contact_person: customer.contact_person ?? undefined,
            email: customer.email ?? undefined,
            phone: customer.phone ?? undefined,
            address: customer.address ?? undefined,
          })
        }
      } else if (type === 'supplier') {
        const supplier = suppliers.find((s) => s.id === id)
        if (supplier) {
          setFormData({
            supplier_code: supplier.supplier_code,
            supplier_name: supplier.supplier_name,
            contact_person: supplier.contact_person ?? undefined,
            email: supplier.email ?? undefined,
            phone: supplier.phone ?? undefined,
            address: supplier.address ?? undefined,
          })
        }
      } else {
        setFormData({})
      }
    } else {
      if (type === 'customer') {
        setFormData({
          customer_code: generateNextCode(customers.map((customer) => customer.customer_code), 'C'),
        })
      } else if (type === 'supplier') {
        setFormData({
          supplier_code: generateNextCode(suppliers.map((supplier) => supplier.supplier_code), 'S'),
        })
      } else {
        setFormData({})
      }
    }

    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      if (dialogType === 'user') {
        await handleUserSubmit()
      } else if (dialogType === 'customer') {
        await handleCustomerSubmit()
      } else if (dialogType === 'supplier') {
        await handleSupplierSubmit()
      }

      toast.success(dialogMode === 'create' ? '登録しました' : '更新しました')
      setDialogOpen(false)
      loadAllData()
    } catch (error) {
      console.error('保存エラー:', error)
      toast.error('保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUserSubmit = async () => {
    if (!formData.email || !formData.display_name || !formData.role) {
      throw new Error('必須項目を入力してください')
    }

    if (dialogMode === 'create') {
      // ユーザー作成はSupabase Authを使用
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password || 'TempPass123!',
        options: {
          data: {
            display_name: formData.display_name,
            role: formData.role,
          },
        },
      })

      if (error) throw error

      // usersテーブルに手動で追加（通常はトリガーで自動追加）
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: formData.email,
          display_name: formData.display_name,
          role: formData.role,
        })
      }
    } else {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: formData.display_name,
          role: formData.role,
        })
        .eq('id', selectedId)

      if (error) throw error
    }
  }

  const handleCustomerSubmit = async () => {
    if (!formData.customer_name) {
      throw new Error('顧客名を入力してください')
    }

    const customerCode =
      dialogMode === 'create'
        ? formData.customer_code || generateNextCode(customers.map((customer) => customer.customer_code), 'C')
        : formData.customer_code

    if (!customerCode) {
      throw new Error('顧客コードを生成できませんでした')
    }

    const data = {
      customer_code: customerCode,
      customer_name: formData.customer_name,
      contact_person: formData.contact_person || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
    }

    if (dialogMode === 'create') {
      const { error } = await supabase.from('customers').insert(data)
      if (error) throw error
    } else {
      const { error } = await supabase.from('customers').update(data).eq('id', selectedId)
      if (error) throw error
    }
  }

  const handleSupplierSubmit = async () => {
    if (!formData.supplier_name) {
      throw new Error('仕入先名を入力してください')
    }

    const supplierCode =
      dialogMode === 'create'
        ? formData.supplier_code || generateNextCode(suppliers.map((supplier) => supplier.supplier_code), 'S')
        : formData.supplier_code

    if (!supplierCode) {
      throw new Error('仕入先コードを生成できませんでした')
    }

    const data = {
      supplier_code: supplierCode,
      supplier_name: formData.supplier_name,
      contact_person: formData.contact_person || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
    }

    if (dialogMode === 'create') {
      const { error } = await supabase.from('suppliers').insert(data)
      if (error) throw error
    } else {
      const { error } = await supabase.from('suppliers').update(data).eq('id', selectedId)
      if (error) throw error
    }
  }

  const handleDelete = async (type: DataType, id: string) => {
    if (!confirm('本当に削除しますか？')) return

    try {
      let error
      if (type === 'user') {
        const { error: delError } = await supabase.from('users').delete().eq('id', id)
        error = delError
      } else if (type === 'customer') {
        const { error: delError } = await supabase.from('customers').delete().eq('id', id)
        error = delError
      } else if (type === 'supplier') {
        const { error: delError } = await supabase.from('suppliers').delete().eq('id', id)
        error = delError
      }

      if (error) throw error

      toast.success('削除しました')
      loadAllData()
    } catch (error) {
      console.error('削除エラー:', error)
      toast.error('削除に失敗しました（関連データが存在する可能性があります）')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>読込中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">設定・マスタ管理</h1>
        <p className="text-gray-600 mt-2">ユーザー・部署・顧客・仕入先・承認フローの管理</p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList>
          <TabsTrigger value="activity">案件活動閾値</TabsTrigger>
          <TabsTrigger value="company">会社情報</TabsTrigger>
          <TabsTrigger value="group-companies">グループ会社</TabsTrigger>
          <TabsTrigger value="documents">帳票レイアウト</TabsTrigger>
          <TabsTrigger value="customers">顧客マスタ</TabsTrigger>
          <TabsTrigger value="suppliers">仕入先マスタ</TabsTrigger>
          <TabsTrigger value="departments">部署マスタ</TabsTrigger>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
          <TabsTrigger value="approval">承認フロー</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>案件活動しきい値</CardTitle>
              <CardDescription>最後の活動からの経過日数に応じてカードの背景色を自動で変更します。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warning-days">注意開始日数</Label>
                  <Input
                    id="warning-days"
                    type="number"
                    min={0}
                    value={activitySettings.warning_days}
                    onChange={(event) =>
                      setActivitySettings((prev) => ({ ...prev, warning_days: Number(event.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-gray-500">この日数を超えると注意色に変わります。</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="danger-days">警告日数</Label>
                  <Input
                    id="danger-days"
                    type="number"
                    min={0}
                    value={activitySettings.danger_days}
                    onChange={(event) =>
                      setActivitySettings((prev) => ({ ...prev, danger_days: Number(event.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-gray-500">この日数を超えると警告色に変わります。</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="safe-color">正常カラー</Label>
                  <Input
                    id="safe-color"
                    type="color"
                    value={activitySettings.safe_color}
                    onChange={(event) => setActivitySettings((prev) => ({ ...prev, safe_color: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warning-color">注意カラー</Label>
                  <Input
                    id="warning-color"
                    type="color"
                    value={activitySettings.warning_color}
                    onChange={(event) => setActivitySettings((prev) => ({ ...prev, warning_color: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="danger-color">警告カラー</Label>
                  <Input
                    id="danger-color"
                    type="color"
                    value={activitySettings.danger_color}
                    onChange={(event) => setActivitySettings((prev) => ({ ...prev, danger_color: event.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveActivitySettings} disabled={activitySettingsSaving}>
                  {activitySettingsSaving ? '保存中...' : '設定を保存'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>会社情報</CardTitle>
              <CardDescription>見積書などのPDFに表示される会社名と住所を設定してください。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">会社名</Label>
                <Input
                  id="company-name"
                  value={companyProfile.company_name}
                  placeholder="株式会社サンプル"
                  onChange={(event) =>
                    setCompanyProfile((prev) => ({ ...prev, company_name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">住所</Label>
                <Textarea
                  id="company-address"
                  rows={3}
                  value={companyProfile.company_address}
                  placeholder="東京都千代田区..."
                  onChange={(event) =>
                    setCompanyProfile((prev) => ({ ...prev, company_address: event.target.value }))
                  }
                />
                <p className="text-xs text-gray-500">複数行を入力できます。支店名やビル名などもここで設定してください。</p>
              </div>
              <Button onClick={handleSaveCompanyProfile} disabled={companyProfileSaving}>
                {companyProfileSaving ? '保存中...' : '設定を保存'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group-companies">
          <GroupCompanyManager />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>帳票レイアウト</CardTitle>
              <CardDescription>見積書・発注書のセクションや明細列の表示/配置を調整します。</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="quote" className="space-y-4">
                <TabsList>
                  {(
                    Object.keys(documentTargetLabels) as DocumentTargetEntity[]
                  ).map((target) => (
                    <TabsTrigger key={target} value={target}>
                      {documentTargetLabels[target]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {(
                  Object.keys(documentTargetLabels) as DocumentTargetEntity[]
                ).map((target) => (
                  <TabsContent key={target} value={target} className="space-y-4">
                    {renderLayoutEditor(target)}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 顧客マスタ */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>顧客マスタ</CardTitle>
                  <CardDescription>顧客情報の登録・編集・削除</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('customer', 'create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  新規登録
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客名</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>住所</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                        <TableCell>{customer.contact_person || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.address || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog('customer', 'edit', customer.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete('customer', customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 仕入先マスタ */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>仕入先マスタ</CardTitle>
                  <CardDescription>仕入先情報の登録・編集・削除</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog('supplier', 'create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  新規登録
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>仕入先名</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>メール</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>住所</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                        <TableCell>{supplier.contact_person || '-'}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell>{supplier.address || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDialog('supplier', 'edit', supplier.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete('supplier', supplier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 部署マスタ */}
        <TabsContent value="departments">
          <DepartmentManager />
        </TabsContent>

        {/* ユーザー管理 */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ユーザー管理</CardTitle>
                  <CardDescription>システムユーザーの登録・編集・削除</CardDescription>
                </div>
                {currentUser?.role === '管理者' && (
                  <Button onClick={() => handleOpenDialog('user', 'create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    新規登録
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>氏名</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>権限</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('ja-JP')}</TableCell>
                        <TableCell>
                          {currentUser?.role === '管理者' && user.id !== currentUser.id && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDialog('user', 'edit', user.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete('user', user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>承認フロー設定</CardTitle>
                  <CardDescription>役職や金額条件に応じて承認ステップを構成できます</CardDescription>
                </div>
                <Button onClick={() => openRouteDialog('create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  フローを追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>フロー名</TableHead>
                <TableHead>対象</TableHead>
                <TableHead>申請者条件</TableHead>
                <TableHead>金額範囲</TableHead>
                <TableHead>承認ステップ</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
                <TableBody>
                  {approvalRoutes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        承認フローが設定されていません
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalRoutes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell className="font-medium">
                          <div>{route.name}</div>
                          {route.description ? (
                            <div className="text-xs text-gray-500 mt-1">{route.description}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>{route.target_entity === 'purchase_order' ? '発注書' : '見積'}</TableCell>
                        <TableCell>{getRoleLabel(route.requester_role)}</TableCell>
                        <TableCell>{getAmountRangeLabel(route)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {route.steps.map((step) => (
                              <div key={step.id} className="text-sm">
                                {step.step_order}. {step.approver_role}
                                {step.notes ? <span className="text-gray-500"> - {step.notes}</span> : null}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={route.is_active ? 'text-green-600 font-medium' : 'text-gray-500'}
                          >
                            {route.is_active ? '有効' : '無効'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openRouteDialog('edit', route)}>
                              編集
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleRoute(route)}
                            >
                              {route.is_active ? '無効化' : '有効化'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRoute(route)}
                            >
                              削除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 編集・登録ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'user' && (dialogMode === 'create' ? 'ユーザー新規登録' : 'ユーザー編集')}
              {dialogType === 'customer' && (dialogMode === 'create' ? '顧客新規登録' : '顧客編集')}
              {dialogType === 'supplier' && (dialogMode === 'create' ? '仕入先新規登録' : '仕入先編集')}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' ? '新しい情報を入力してください' : '情報を編集してください'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {dialogType === 'user' && (
              <>
                {dialogMode === 'create' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="display_name">氏名 *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name || ''}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">権限 *</Label>
                  <Select
                    value={formData.role || ''}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="権限を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="営業">営業</SelectItem>
                      <SelectItem value="営業事務">営業事務</SelectItem>
                      <SelectItem value="管理者">管理者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(dialogType === 'customer' || dialogType === 'supplier') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor={dialogType === 'customer' ? 'customer_code' : 'supplier_code'}>
                    {dialogType === 'customer' ? '顧客コード' : '仕入先コード'} *
                  </Label>
                  <Input
                    id={dialogType === 'customer' ? 'customer_code' : 'supplier_code'}
                    value={
                      dialogType === 'customer'
                        ? formData.customer_code || ''
                        : formData.supplier_code || ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [dialogType === 'customer' ? 'customer_code' : 'supplier_code']: e.target.value,
                      })
                    }
                    readOnly={dialogMode === 'create'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {dialogType === 'customer' ? '顧客名' : '仕入先名'} *
                  </Label>
                  <Input
                    id="name"
                    value={
                      dialogType === 'customer'
                        ? formData.customer_name || ''
                        : formData.supplier_name || ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [dialogType === 'customer' ? 'customer_name' : 'supplier_name']:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">担当者</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person || ''}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メール</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">住所</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : dialogMode === 'create' ? '登録' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {routeDialogMode === 'create' ? '承認フローの追加' : '承認フローの編集'}
            </DialogTitle>
            <DialogDescription>
              役職や金額条件に応じた承認ステップを設定してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="route-name">フロー名 *</Label>
                <Input
                  id="route-name"
                  value={routeForm.name}
                  onChange={(e) => handleRouteFieldChange('name', e.target.value)}
                  placeholder="例: 営業 標準フロー"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-requester">適用申請者</Label>
                <Select
                  value={routeForm.requester_role}
                  onValueChange={(value) => handleRouteFieldChange('requester_role', value)}
                >
                  <SelectTrigger id="route-requester">
                    <SelectValue placeholder="対象を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全役職</SelectItem>
                    <SelectItem value="営業">営業</SelectItem>
                    <SelectItem value="営業事務">営業事務</SelectItem>
                    <SelectItem value="管理者">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route-target">フロー対象</Label>
              <Select
                value={routeForm.target_entity}
                onValueChange={(value) => handleRouteFieldChange('target_entity', value as 'quote' | 'purchase_order')}
              >
                <SelectTrigger id="route-target">
                  <SelectValue placeholder="対象を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">見積</SelectItem>
                  <SelectItem value="purchase_order">発注書</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route-description">説明</Label>
              <Textarea
                id="route-description"
                value={routeForm.description}
                onChange={(e) => handleRouteFieldChange('description', e.target.value)}
                rows={3}
                placeholder="フローの補足説明があれば入力してください"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="route-min">最小金額</Label>
                <Input
                  id="route-min"
                  type="number"
                  min={0}
                  value={routeForm.min_total_amount}
                  onChange={(e) => handleRouteFieldChange('min_total_amount', e.target.value)}
                  placeholder="例: 100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="route-max">最大金額</Label>
                <Input
                  id="route-max"
                  type="number"
                  min={0}
                  value={routeForm.max_total_amount}
                  onChange={(e) => handleRouteFieldChange('max_total_amount', e.target.value)}
                  placeholder="未入力の場合は上限なし"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route-status">ステータス</Label>
              <Select
                value={routeForm.is_active ? 'active' : 'inactive'}
                onValueChange={(value) => handleRouteFieldChange('is_active', value === 'active')}
              >
                <SelectTrigger id="route-status">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="inactive">無効</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>承認ステップ</Label>
                <Button variant="outline" size="sm" onClick={addRouteStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  ステップ追加
                </Button>
              </div>

              <div className="space-y-3">
                {routeForm.steps.map((step, index) => (
                  <div key={step.clientId} className="border rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ステップ {index + 1}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveRouteStep(index, 'up')}
                          disabled={index === 0}
                        >
                          上へ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveRouteStep(index, 'down')}
                          disabled={index === routeForm.steps.length - 1}
                        >
                          下へ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRouteStep(step.clientId)}
                          disabled={routeForm.steps.length === 1}
                        >
                          削除
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>承認者の役職</Label>
                        <Select
                          value={step.approver_role}
                          onValueChange={(value) => updateRouteStepRole(step.clientId, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="役職を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="営業">営業</SelectItem>
                            <SelectItem value="営業事務">営業事務</SelectItem>
                            <SelectItem value="管理者">管理者</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>メモ</Label>
                        <Input
                          value={step.notes}
                          onChange={(e) => updateRouteStepNotes(step.clientId, e.target.value)}
                          placeholder="任意"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRouteDialogOpen(false)}
              disabled={routeSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleSaveRoute} disabled={routeSubmitting}>
              {routeSubmitting ? '保存中...' : '保存する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

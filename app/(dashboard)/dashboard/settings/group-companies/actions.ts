'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ensureArrayRelation } from '@/lib/supabase/relations'
import type {
  CompanySecurityControl,
  CompanySystemUsage,
  GroupCompany,
  SystemCatalogEntry,
  SystemCategory,
  SystemAdoptionStatus,
  SystemIntegrationLevel,
  SystemSecurityRisk,
} from '@/types/database'

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

type VoidActionResult = ActionResult<{ id: string }>

const systemCategorySchema = z.enum([
  'sales_management',
  'accounting',
  'human_resources',
  'endpoint_security',
  'collaboration',
  'infrastructure',
  'erp',
  'other',
] as const satisfies SystemCategory[])

const adoptionStatusSchema = z.enum([
  'in_use',
  'pilot',
  'planned',
  'decommissioned',
  'unknown',
] as const satisfies SystemAdoptionStatus[])

const integrationLevelSchema = z.enum(['none', 'manual', 'partial', 'full'] as const satisfies SystemIntegrationLevel[])

const securityRiskSchema = z.enum(['low', 'normal', 'high', 'critical'] as const satisfies SystemSecurityRisk[])

const securityControlTypeSchema = z.string().min(1, '統制種別を入力してください')

const uuidSchema = z.string().uuid()

const groupCompanySchema = z.object({
  id: uuidSchema.optional(),
  company_code: z.string().min(1, '会社コードを入力してください'),
  company_name: z.string().min(1, '会社名を入力してください'),
  company_name_kana: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  employee_count_range: z.string().optional(),
  revenue_range: z.string().optional(),
  it_maturity: z.string().optional(),
  relationship_status: z.string().min(1, '関係ステータスを入力してください').default('active'),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().email('正しいメール形式で入力してください').optional(),
  primary_contact_phone: z.string().optional(),
  notes: z.string().optional(),
})

type GroupCompanyInput = z.infer<typeof groupCompanySchema>

const systemCatalogSchema = z.object({
  id: uuidSchema.optional(),
  category: systemCategorySchema,
  system_name: z.string().min(1, 'システム名を入力してください'),
  vendor: z.string().optional(),
  product_url: z.string().url('正しいURL形式で入力してください').optional(),
  description: z.string().optional(),
  recommended: z.boolean().optional().default(false),
  default_license_cost: z.union([z.number(), z.string()]).optional(),
  cost_unit: z.string().optional(),
  lifecycle_status: z.string().optional().default('active'),
  metadata: z.record(z.string(), z.any()).optional(),
})

type SystemCatalogInput = z.infer<typeof systemCatalogSchema>

const companySystemUsageSchema = z.object({
  id: uuidSchema.optional(),
  group_company_id: uuidSchema,
  system_catalog_id: uuidSchema.optional().nullable(),
  category: systemCategorySchema,
  system_name: z.string().min(1, 'システム名を入力してください'),
  vendor: z.string().optional(),
  adoption_status: adoptionStatusSchema.optional().default('in_use'),
  deployment_model: z.string().optional(),
  contract_type: z.string().optional(),
  license_count: z.union([z.number(), z.string()]).optional(),
  annual_cost: z.union([z.number(), z.string()]).optional(),
  renewal_date: z.string().optional(),
  satisfaction_score: z.union([z.number(), z.string()]).optional(),
  integration_level: integrationLevelSchema.optional().default('manual'),
  security_risk_level: securityRiskSchema.optional().default('normal'),
  point_of_contact: z.string().optional(),
  attachments: z.array(z.record(z.string(), z.any())).optional(),
  notes: z.string().optional(),
  last_verified_at: z.string().optional(),
})

type CompanySystemUsageInput = z.infer<typeof companySystemUsageSchema>

const companySecurityControlSchema = z.object({
  id: uuidSchema.optional(),
  group_company_id: uuidSchema,
  control_type: securityControlTypeSchema,
  vendor: z.string().optional(),
  adoption_status: adoptionStatusSchema.optional().default('in_use'),
  coverage: z.string().optional(),
  notes: z.string().optional(),
  last_verified_at: z.string().optional(),
})

type CompanySecurityControlInput = z.infer<typeof companySecurityControlSchema>

const normalizeString = (value?: string | null) => {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const normalizeNumber = (value?: number | string | null, allowFloat = true) => {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(parsed)) return null
  return allowFloat ? parsed : Math.trunc(parsed)
}

const normalizeDate = (value?: string | null) => {
  if (!value) return null
  return value
}

const normalizeJsonArray = (value?: Record<string, unknown>[]) => {
  if (!value) return []
  return Array.isArray(value) ? value : []
}

const buildError = (message: string): ActionResult<never> => ({ success: false, message })

type GroupCompanySummaryRow = GroupCompany & {
  company_system_usage?: CompanySystemUsage[]
  company_security_controls?: CompanySecurityControl[]
}

type GroupCompanyDetailRow = GroupCompany & {
  system_usage?: CompanySystemUsage[]
  security_controls?: CompanySecurityControl[]
}
type UsageAnalyticsRow = Pick<
  CompanySystemUsage,
  | 'group_company_id'
  | 'category'
  | 'system_name'
  | 'vendor'
  | 'adoption_status'
  | 'annual_cost'
>

const vendorConsolidationSchema = z.object({
  vendor: z.string().min(1, 'ベンダー名を入力してください'),
  discount_rate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.15),
  include_unassigned: z.boolean().optional().default(false),
})

export interface SystemUsageAnalytics {
  total_companies: number
  total_system_records: number
  avg_systems_per_company: number
  estimated_annual_cost: number
  adoption_by_category: Array<{
    category: SystemCategory
    system_count: number
    company_count: number
    in_use_ratio: number
  }>
  vendor_adoption: Array<{
    vendor: string
    system_count: number
    company_count: number
    estimated_annual_cost: number
  }>
  standardization_candidates: Array<{
    category: SystemCategory
    company_count: number
    distinct_system_count: number
    fragmentation_index: number
    estimated_annual_cost: number
    leading_system: {
      system_name: string
      vendor: string | null
      company_count: number
      estimated_annual_cost: number
    } | null
    alternate_systems: Array<{
      system_name: string
      vendor: string | null
      company_count: number
      estimated_annual_cost: number
    }>
  }>
}

export interface VendorConsolidationScenario {
  target_vendor: string
  company_count: number
  system_count: number
  current_cost: number
  other_vendors_cost: number
  negotiated_cost: number
  additional_license_count: number
  seat_cost_basis: number | null
  migration_cost: number
  projected_total_cost: number
  estimated_savings: number
  eligible_records: Array<
    Pick<CompanySystemUsage, 'id' | 'group_company_id' | 'system_name' | 'annual_cost'> & {
      group_company_name: string
    }
  >
  migration_records: Array<
    Pick<CompanySystemUsage, 'id' | 'group_company_id' | 'system_name' | 'vendor' | 'category' | 'license_count' | 'annual_cost'> & {
      group_company_name: string
    }
  >
}

export interface VendorConsolidationInput {
  vendor: string
  discount_rate?: number
  include_unassigned?: boolean
}

export async function fetchGroupCompanySummaries(): Promise<
  ActionResult<
    Array<
      GroupCompany & {
        system_usage_count: number
        security_control_count: number
        system_names: string[]
        security_products: string[]
      }
    >
  >
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('group_companies')
    .select(
      `*,
      company_system_usage(system_name, vendor),
      company_security_controls(control_type, vendor)`
    )
    .order('company_name', { ascending: true })

  if (error) {
    return buildError('グループ会社情報の取得に失敗しました')
  }

  const records = ensureArrayRelation(data).map((rowRaw) => {
    const row = rowRaw as GroupCompanySummaryRow
    const { company_system_usage: companySystemUsage, company_security_controls: companySecurityControls, ...company } = row
    const systemUsageRecords = ensureArrayRelation<CompanySystemUsage>(companySystemUsage)
    const securityControlRecords = ensureArrayRelation<CompanySecurityControl>(companySecurityControls)

    const systemNames = Array.from(
      new Set(
        systemUsageRecords
          .map((usage) => usage.system_name?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b, 'ja'))

    const securityProducts = Array.from(
      new Set(
        securityControlRecords
          .map((control) => control.control_type?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b, 'ja'))

    const systemUsageCount = systemUsageRecords.length
    const securityControlCount = securityControlRecords.length
    return {
      ...(company as GroupCompany),
      system_usage_count: systemUsageCount,
      security_control_count: securityControlCount,
      system_names: systemNames,
      security_products: securityProducts,
    }
  })

  return { success: true, data: records }
}

export async function fetchGroupCompanyDetail(id: string): Promise<
  ActionResult<
    GroupCompany & {
      system_usage: CompanySystemUsage[]
      security_controls: CompanySecurityControl[]
    }
  >
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('group_companies')
    .select(
      `*,
      system_usage:company_system_usage(*),
      security_controls:company_security_controls(*)`
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return buildError('グループ会社詳細の取得に失敗しました')
  }

  const row = data as GroupCompanyDetailRow
  const { system_usage: systemUsageRaw, security_controls: securityControlsRaw, ...company } = row
  const systemUsage = ensureArrayRelation<CompanySystemUsage>(systemUsageRaw)
  const securityControls = ensureArrayRelation<CompanySecurityControl>(securityControlsRaw)

  return {
    success: true,
    data: {
      ...(company as GroupCompany),
      system_usage: systemUsage,
      security_controls: securityControls,
    },
  }
}

export async function fetchSystemUsageAnalytics(): Promise<ActionResult<SystemUsageAnalytics>> {
  const supabase = await createClient()

  const [usageResult, companiesResult] = await Promise.all([
    supabase
      .from('company_system_usage')
      .select('group_company_id, category, system_name, vendor, adoption_status, annual_cost')
      .order('category'),
    supabase.from('group_companies').select('id'),
  ])

  if (usageResult.error) {
    return buildError('システム利用状況の集計に失敗しました')
  }
  if (companiesResult.error) {
    return buildError('グループ会社情報の取得に失敗しました')
  }

  const usageRecords = ensureArrayRelation(usageResult.data) as UsageAnalyticsRow[]
  const companyIds = new Set(ensureArrayRelation(companiesResult.data).map((company) => company.id as string))

  const totalSystems = usageRecords.length
  const totalCompanies = companyIds.size
  const estimatedAnnualCost = usageRecords.reduce((sum, record) => sum + (record.annual_cost ?? 0), 0)

  const categoryMap = new Map<
    SystemCategory,
    { system_count: number; company_ids: Set<string>; in_use_count: number }
  >()
  const vendorMap = new Map<string, { system_count: number; company_ids: Set<string>; annual_cost: number }>()
  const categoryDetailMap = new Map<
    SystemCategory,
    {
      company_ids: Set<string>
      systems: Map<
        string,
        {
          system_name: string
          vendor: string | null
          company_ids: Set<string>
          annual_cost: number
        }
      >
    }
  >()

  for (const record of usageRecords) {
    const companyId = record.group_company_id

    // Category aggregation
    const categoryEntry = categoryMap.get(record.category) ?? {
      system_count: 0,
      company_ids: new Set<string>(),
      in_use_count: 0,
    }
    categoryEntry.system_count += 1
    categoryEntry.company_ids.add(companyId)
    if (record.adoption_status === 'in_use') {
      categoryEntry.in_use_count += 1
    }
    categoryMap.set(record.category, categoryEntry)

    // Vendor aggregation
    const vendorKey = record.vendor?.trim() || 'ベンダー未登録'
    const vendorEntry = vendorMap.get(vendorKey) ?? {
      system_count: 0,
      company_ids: new Set<string>(),
      annual_cost: 0,
    }
    vendorEntry.system_count += 1
    vendorEntry.company_ids.add(companyId)
    vendorEntry.annual_cost += record.annual_cost ?? 0
    vendorMap.set(vendorKey, vendorEntry)

    // System consolidation candidates
    // Category level detail for統一化候補
    const categoryDetailEntry = categoryDetailMap.get(record.category) ?? {
      company_ids: new Set<string>(),
      systems: new Map<
        string,
        {
          system_name: string
          vendor: string | null
          company_ids: Set<string>
          annual_cost: number
        }
      >(),
    }
    categoryDetailEntry.company_ids.add(companyId)
    const categorySystemKey = `${record.system_name.toLowerCase()}::${record.vendor ?? ''}`
    const categorySystemEntry = categoryDetailEntry.systems.get(categorySystemKey) ?? {
      system_name: record.system_name,
      vendor: record.vendor ?? null,
      company_ids: new Set<string>(),
      annual_cost: 0,
    }
    categorySystemEntry.company_ids.add(companyId)
    categorySystemEntry.annual_cost += record.annual_cost ?? 0
    categoryDetailEntry.systems.set(categorySystemKey, categorySystemEntry)
    categoryDetailMap.set(record.category, categoryDetailEntry)
  }

  const adoptionByCategory = Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      system_count: value.system_count,
      company_count: value.company_ids.size,
      in_use_ratio: value.system_count ? value.in_use_count / value.system_count : 0,
    }))
    .sort((a, b) => b.system_count - a.system_count)

  const vendorAdoption = Array.from(vendorMap.entries())
    .map(([vendor, value]) => ({
      vendor,
      system_count: value.system_count,
      company_count: value.company_ids.size,
      estimated_annual_cost: value.annual_cost,
    }))
    .sort((a, b) => b.company_count - a.company_count || b.system_count - a.system_count)
    .slice(0, 8)

  const standardizationCandidates = Array.from(categoryDetailMap.entries())
    .map(([category, detail]) => {
      const systemStats = Array.from(detail.systems.values())
        .map((system) => ({
          system_name: system.system_name,
          vendor: system.vendor,
          company_count: system.company_ids.size,
          estimated_annual_cost: system.annual_cost,
        }))
        .sort((a, b) => b.company_count - a.company_count || b.estimated_annual_cost - a.estimated_annual_cost)

      if (systemStats.length === 0) {
        return null
      }

      const companyCount = detail.company_ids.size
      const leadingSystem = systemStats[0] ?? null
      const fragmentationIndex = leadingSystem && companyCount > 0 ? 1 - leadingSystem.company_count / companyCount : 0
      const distinctSystemCount = systemStats.length

      return {
        category,
        company_count: companyCount,
        distinct_system_count: distinctSystemCount,
        fragmentation_index: fragmentationIndex,
        estimated_annual_cost: systemStats.reduce((sum, system) => sum + system.estimated_annual_cost, 0),
        leading_system: leadingSystem,
        alternate_systems: systemStats.slice(1),
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry) => entry.distinct_system_count > 1 && entry.company_count > 0)
    .sort((a, b) => b.fragmentation_index - a.fragmentation_index || b.company_count - a.company_count)
    .slice(0, 10)

  return {
    success: true,
    data: {
      total_companies: totalCompanies,
      total_system_records: totalSystems,
      avg_systems_per_company: totalSystems / (totalCompanies || 1),
      estimated_annual_cost: estimatedAnnualCost,
      adoption_by_category: adoptionByCategory,
      vendor_adoption: vendorAdoption,
      standardization_candidates: standardizationCandidates,
    },
  }
}

export async function simulateVendorConsolidation(input: VendorConsolidationInput): Promise<
  ActionResult<VendorConsolidationScenario>
> {
  const parsed = vendorConsolidationSchema.safeParse({
    vendor: input.vendor,
    discount_rate: input.discount_rate,
    include_unassigned: input.include_unassigned,
  })
  if (!parsed.success) {
    return buildError(parsed.error.issues[0]?.message ?? '入力値が不正です')
  }

  const { vendor, discount_rate: discountRate, include_unassigned: includeUnassigned } = parsed.data
  const targetVendor = vendor.trim()

  const supabase = await createClient()
  const baseSelect =
    'id, group_company_id, system_name, vendor, category, license_count, annual_cost, group_companies ( company_name )'

  const targetResult = await supabase
    .from('company_system_usage')
    .select(baseSelect)
    .eq('vendor', targetVendor)

  if (targetResult.error) {
    return buildError('ベンダー情報の取得に失敗しました')
  }

  type VendorUsageRecordRaw = Pick<
    CompanySystemUsage,
    'id' | 'group_company_id' | 'system_name' | 'vendor' | 'category' | 'license_count' | 'annual_cost'
  > & {
    group_companies?: Array<Pick<GroupCompany, 'company_name'>>
  }
  type VendorUsageRecord = VendorUsageRecordRaw & { group_company_name?: string | null }

  const targetRecords = ensureArrayRelation(targetResult.data) as VendorUsageRecord[]
  if (targetRecords.length === 0) {
    return buildError('該当するシステムが見つかりませんでした')
  }

  const targetCategories = Array.from(
    new Set(
      targetRecords
        .map((record) => record.category)
        .filter((category): category is SystemCategory => Boolean(category)),
    ),
  )

  let migrationRecords: VendorUsageRecord[] = []
  if (targetCategories.length > 0) {
    let migrationQuery = supabase
      .from('company_system_usage')
      .select(baseSelect)
      .in('category', targetCategories)

    const conditions = [`vendor.neq.${targetVendor}`]
    if (includeUnassigned) {
      conditions.push('vendor.is.null')
    }
    migrationQuery = migrationQuery.or(conditions.join(','))

    const migrationResult = await migrationQuery
    if (migrationResult.error) {
      return buildError('統一対象外システムの取得に失敗しました')
    }
    migrationRecords = ensureArrayRelation(migrationResult.data) as VendorUsageRecord[]
  }

  const companySet = new Set<string>()
  let currentCost = 0
  let seatCountWithCost = 0
  let seatCostTotal = 0
  for (const record of targetRecords) {
    if (record.group_company_id) {
      companySet.add(record.group_company_id)
    }
    currentCost += record.annual_cost ?? 0
    if ((record.license_count ?? 0) > 0 && (record.annual_cost ?? 0) > 0) {
      seatCountWithCost += record.license_count ?? 0
      seatCostTotal += record.annual_cost ?? 0
    }
  }

  const seatCostBasis = seatCountWithCost > 0 ? seatCostTotal / seatCountWithCost : null
  const negotiatedCost = currentCost * (1 - discountRate)

  const additionalLicenseCount = migrationRecords.reduce(
    (sum, record) => sum + (record.license_count ?? 0),
    0,
  )
  const otherVendorsCost = migrationRecords.reduce((sum, record) => sum + (record.annual_cost ?? 0), 0)
  const discountedSeatCost = seatCostBasis !== null ? seatCostBasis * (1 - discountRate) : 0
  const migrationCost = additionalLicenseCount * discountedSeatCost
  const projectedTotalCost = negotiatedCost + migrationCost
  const currentTotalCost = currentCost + otherVendorsCost
  const estimatedSavings = currentTotalCost - projectedTotalCost

  return {
    success: true,
    data: {
      target_vendor: targetVendor,
      company_count: companySet.size,
      system_count: targetRecords.length,
      current_cost: currentCost,
      other_vendors_cost: otherVendorsCost,
      negotiated_cost: negotiatedCost,
      additional_license_count: additionalLicenseCount,
      seat_cost_basis: seatCostBasis,
      migration_cost: migrationCost,
      projected_total_cost: projectedTotalCost,
      estimated_savings: estimatedSavings,
      eligible_records: targetRecords.map((record) => ({
        id: record.id,
        group_company_id: record.group_company_id,
        group_company_name: record.group_companies?.[0]?.company_name ?? '未登録',
        system_name: record.system_name,
        annual_cost: record.annual_cost,
      })),
      migration_records: migrationRecords.map((record) => ({
        id: record.id,
        group_company_id: record.group_company_id,
        group_company_name: record.group_companies?.[0]?.company_name ?? '未登録',
        system_name: record.system_name,
        vendor: record.vendor ?? '未登録',
        category: record.category,
        license_count: record.license_count ?? null,
        annual_cost: record.annual_cost,
      })),
    },
  }
}

export async function fetchSystemCatalog(): Promise<ActionResult<SystemCatalogEntry[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('system_catalog').select('*').order('category').order('system_name')
  if (error) {
    return buildError('システムカタログの取得に失敗しました')
  }
  return { success: true, data: ensureArrayRelation(data) as SystemCatalogEntry[] }
}

export async function upsertGroupCompany(input: GroupCompanyInput): Promise<VoidActionResult> {
  const parsed = groupCompanySchema.safeParse(input)
  if (!parsed.success) {
    return buildError(parsed.error.issues[0]?.message ?? '入力値が不正です')
  }

  const supabase = await createClient()
  const payload = {
    id: parsed.data.id,
    company_code: parsed.data.company_code,
    company_name: parsed.data.company_name,
    company_name_kana: normalizeString(parsed.data.company_name_kana),
    region: normalizeString(parsed.data.region),
    country: normalizeString(parsed.data.country),
    industry: normalizeString(parsed.data.industry),
    employee_count_range: normalizeString(parsed.data.employee_count_range),
    revenue_range: normalizeString(parsed.data.revenue_range),
    it_maturity: normalizeString(parsed.data.it_maturity),
    relationship_status: parsed.data.relationship_status,
    primary_contact_name: normalizeString(parsed.data.primary_contact_name),
    primary_contact_email: normalizeString(parsed.data.primary_contact_email),
    primary_contact_phone: normalizeString(parsed.data.primary_contact_phone),
    notes: normalizeString(parsed.data.notes),
  }

  const { data, error } = await supabase.from('group_companies').upsert(payload).select('id').maybeSingle()

  if (error || !data) {
    return buildError('グループ会社の保存に失敗しました')
  }

  return { success: true, data: { id: data.id } }
}

export async function deleteGroupCompany(id: string): Promise<VoidActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) {
    return buildError('IDが不正です')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('group_companies').delete().eq('id', parsed.data)

  if (error) {
    return buildError('グループ会社の削除に失敗しました')
  }

  return { success: true, data: { id: parsed.data } }
}

export async function upsertSystemCatalogEntry(input: SystemCatalogInput): Promise<VoidActionResult> {
  const parsed = systemCatalogSchema.safeParse(input)
  if (!parsed.success) {
    return buildError(parsed.error.issues[0]?.message ?? '入力値が不正です')
  }

  const supabase = await createClient()
  const payload = {
    id: parsed.data.id,
    category: parsed.data.category,
    system_name: parsed.data.system_name,
    vendor: normalizeString(parsed.data.vendor),
    product_url: normalizeString(parsed.data.product_url),
    description: normalizeString(parsed.data.description),
    recommended: parsed.data.recommended ?? false,
    default_license_cost: normalizeNumber(parsed.data.default_license_cost),
    cost_unit: normalizeString(parsed.data.cost_unit),
    lifecycle_status: normalizeString(parsed.data.lifecycle_status) ?? 'active',
    metadata: parsed.data.metadata ?? {},
  }

  const { data, error } = await supabase.from('system_catalog').upsert(payload).select('id').maybeSingle()

  if (error || !data) {
    return buildError('システムカタログの保存に失敗しました')
  }

  return { success: true, data: { id: data.id } }
}

export async function deleteSystemCatalogEntry(id: string): Promise<VoidActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) {
    return buildError('IDが不正です')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('system_catalog').delete().eq('id', parsed.data)

  if (error) {
    return buildError('システムカタログの削除に失敗しました')
  }

  return { success: true, data: { id: parsed.data } }
}

export async function upsertCompanySystemUsageRecord(input: CompanySystemUsageInput): Promise<VoidActionResult> {
  const parsed = companySystemUsageSchema.safeParse(input)
  if (!parsed.success) {
    return buildError(parsed.error.issues[0]?.message ?? '入力値が不正です')
  }

  const supabase = await createClient()
  const payload = {
    id: parsed.data.id,
    group_company_id: parsed.data.group_company_id,
    system_catalog_id: parsed.data.system_catalog_id ?? null,
    category: parsed.data.category,
    system_name: parsed.data.system_name,
    vendor: normalizeString(parsed.data.vendor),
    adoption_status: parsed.data.adoption_status ?? 'in_use',
    deployment_model: normalizeString(parsed.data.deployment_model),
    contract_type: normalizeString(parsed.data.contract_type),
    license_count: normalizeNumber(parsed.data.license_count, false),
    annual_cost: normalizeNumber(parsed.data.annual_cost),
    renewal_date: normalizeDate(parsed.data.renewal_date),
    satisfaction_score: normalizeNumber(parsed.data.satisfaction_score, false),
    integration_level: parsed.data.integration_level ?? 'manual',
    security_risk_level: parsed.data.security_risk_level ?? 'normal',
    point_of_contact: normalizeString(parsed.data.point_of_contact),
    attachments: normalizeJsonArray(parsed.data.attachments),
    notes: normalizeString(parsed.data.notes),
    last_verified_at: normalizeDate(parsed.data.last_verified_at),
  }

  const { data, error } = await supabase.from('company_system_usage').upsert(payload).select('id').maybeSingle()

  if (error || !data) {
    return buildError('システム利用状況の保存に失敗しました')
  }

  return { success: true, data: { id: data.id } }
}

export async function deleteCompanySystemUsageRecord(id: string): Promise<VoidActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) {
    return buildError('IDが不正です')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('company_system_usage').delete().eq('id', parsed.data)

  if (error) {
    return buildError('システム利用状況の削除に失敗しました')
  }

  return { success: true, data: { id: parsed.data } }
}

export async function upsertCompanySecurityControlRecord(
  input: CompanySecurityControlInput,
): Promise<VoidActionResult> {
  const parsed = companySecurityControlSchema.safeParse(input)
  if (!parsed.success) {
    return buildError(parsed.error.issues[0]?.message ?? '入力値が不正です')
  }

  const supabase = await createClient()
  const normalizedControlType = normalizeString(parsed.data.control_type)
  if (!normalizedControlType) {
    return buildError('統制種別を入力してください')
  }
  const payload = {
    id: parsed.data.id,
    group_company_id: parsed.data.group_company_id,
    control_type: normalizedControlType,
    vendor: normalizeString(parsed.data.vendor),
    adoption_status: parsed.data.adoption_status ?? 'in_use',
    coverage: normalizeString(parsed.data.coverage),
    notes: normalizeString(parsed.data.notes),
    last_verified_at: normalizeDate(parsed.data.last_verified_at),
  }

  const { data, error } = await supabase.from('company_security_controls').upsert(payload).select('id').maybeSingle()

  if (error || !data) {
    return buildError('セキュリティ統制情報の保存に失敗しました')
  }

  return { success: true, data: { id: data.id } }
}

export async function deleteCompanySecurityControlRecord(id: string): Promise<VoidActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) {
    return buildError('IDが不正です')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('company_security_controls').delete().eq('id', parsed.data)

  if (error) {
    return buildError('セキュリティ統制情報の削除に失敗しました')
  }

  return { success: true, data: { id: parsed.data } }
}

import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentLayoutTableColumnConfig,
  DocumentSectionKey,
  DocumentTargetEntity,
  DocumentTableColumnKey,
} from '@/types/document-layout'

type SectionDefinition = {
  key: DocumentSectionKey
  label: string
  region: DocumentLayoutSectionConfig['region']
  column: DocumentLayoutSectionConfig['column']
  width: number
  row: number
  order: number
  enabled: boolean
  targets: DocumentTargetEntity[]
  title?: string
  show_title?: boolean
  show_label?: boolean
}

type ColumnDefinition = {
  key: DocumentTableColumnKey
  label: string
  width: number
  order: number
  enabled: boolean
  targets: DocumentTargetEntity[]
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: 'document_meta',
    label: 'ドキュメント情報',
    region: 'header',
    column: 'left',
    width: 60,
    row: 0,
    order: 0,
    enabled: true,
    targets: ['quote'],
    title: '御見積書',
    show_title: true,
    show_label: true,
  },
  {
    key: 'document_meta',
    label: '発注情報',
    region: 'header',
    column: 'left',
    width: 60,
    row: 0,
    order: 0,
    enabled: true,
    targets: ['purchase_order'],
    title: '発注書',
    show_title: true,
    show_label: true,
  },
  {
    key: 'company_info',
    label: '会社情報',
    region: 'header',
    column: 'right',
    width: 40,
    row: 0,
    order: 1,
    enabled: true,
    targets: ['quote', 'purchase_order'],
  },
  {
    key: 'customer_info',
    label: 'お客様情報',
    region: 'body',
    column: 'full',
    width: 100,
    row: 1,
    order: 0,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'project_info',
    label: '案件情報',
    region: 'body',
    column: 'full',
    width: 100,
    row: 2,
    order: 0,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'supplier_info',
    label: '仕入先情報',
    region: 'body',
    column: 'full',
    width: 100,
    row: 1,
    order: 0,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'quote_info',
    label: '関連見積',
    region: 'body',
    column: 'full',
    width: 100,
    row: 2,
    order: 0,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'items_table',
    label: '明細',
    region: 'body',
    column: 'full',
    width: 100,
    row: 3,
    order: 0,
    enabled: true,
    targets: ['quote', 'purchase_order'],
  },
  {
    key: 'totals',
    label: '合計',
    region: 'body',
    column: 'full',
    width: 100,
    row: 4,
    order: 0,
    enabled: true,
    targets: ['quote', 'purchase_order'],
  },
  {
    key: 'notes',
    label: '備考',
    region: 'body',
    column: 'full',
    width: 100,
    row: 5,
    order: 0,
    enabled: true,
    targets: ['quote', 'purchase_order'],
  },
  {
    key: 'footer',
    label: 'フッター',
    region: 'footer',
    column: 'full',
    width: 100,
    row: 6,
    order: 0,
    enabled: true,
    targets: ['quote', 'purchase_order'],
  },
]

const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  {
    key: 'line_number',
    label: 'No',
    width: 8,
    order: 0,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'line_number',
    label: 'No',
    width: 10,
    order: 0,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'product_name',
    label: '品名',
    width: 25,
    order: 1,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'product_name',
    label: '品名',
    width: 30,
    order: 1,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'description',
    label: '説明',
    width: 30,
    order: 2,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'description',
    label: '説明',
    width: 25,
    order: 2,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'quantity',
    label: '数量',
    width: 12,
    order: 3,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'quantity',
    label: '数量',
    width: 10,
    order: 3,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'unit_price',
    label: '単価',
    width: 12,
    order: 4,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'unit_cost',
    label: '仕入単価',
    width: 12.5,
    order: 4,
    enabled: true,
    targets: ['purchase_order'],
  },
  {
    key: 'amount',
    label: '金額',
    width: 13,
    order: 5,
    enabled: true,
    targets: ['quote'],
  },
  {
    key: 'amount',
    label: '金額',
    width: 12.5,
    order: 5,
    enabled: true,
    targets: ['purchase_order'],
  },
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const cloneSection = (definition: SectionDefinition): DocumentLayoutSectionConfig => ({
  key: definition.key,
  label: definition.label,
  enabled: definition.enabled,
  region: definition.region,
  row: definition.row,
  column: definition.column,
  width: definition.width,
  order: definition.order,
  title: definition.title,
  show_title: definition.show_title,
  show_label: definition.show_label,
})

const cloneColumn = (definition: ColumnDefinition): DocumentLayoutTableColumnConfig => ({
  key: definition.key,
  label: definition.label,
  enabled: definition.enabled,
  width: definition.width,
  order: definition.order,
})

export const getDefaultDocumentLayout = (target: DocumentTargetEntity): DocumentLayoutConfig => {
  const sections = SECTION_DEFINITIONS.filter((definition) => definition.targets.includes(target))
  const uniqueSections = new Map<DocumentSectionKey, DocumentLayoutSectionConfig>()
  sections.forEach((definition) => {
    if (!uniqueSections.has(definition.key)) {
      uniqueSections.set(definition.key, cloneSection(definition))
    }
  })

  const columns = COLUMN_DEFINITIONS.filter((definition) => definition.targets.includes(target))
  const uniqueColumns = new Map<DocumentTableColumnKey, DocumentLayoutTableColumnConfig>()
  columns.forEach((definition) => {
    if (!uniqueColumns.has(definition.key) || definition.targets.length === 1) {
      uniqueColumns.set(definition.key, cloneColumn(definition))
    }
  })

  return {
    sections: Array.from(uniqueSections.values()),
    table_columns: Array.from(uniqueColumns.values()),
  }
}

const mergeSections = (
  target: DocumentTargetEntity,
  overrides?: DocumentLayoutSectionConfig[],
): DocumentLayoutSectionConfig[] => {
  const defaults = getDefaultDocumentLayout(target).sections
  const merged = defaults.map((section) => {
    const override = overrides?.find((item) => item.key === section.key)
    if (!override) return section
    return {
      ...section,
      ...override,
      label: override.label?.trim() ? override.label : section.label,
      title: override.title !== undefined ? override.title : section.title,
      show_title: override.show_title ?? section.show_title,
      show_label: override.show_label ?? section.show_label,
      region: section.region,
      column: override.column ?? section.column,
      row: Number.isFinite(override.row) ? override.row : section.row,
      width: clamp(Number(override.width ?? section.width), 10, 100),
      order: Number.isFinite(override.order) ? override.order : section.order,
    }
  })

  const extra = (overrides || []).filter((item) => !defaults.some((section) => section.key === item.key))
  return [...merged, ...extra]
}

const mergeColumns = (
  target: DocumentTargetEntity,
  overrides?: DocumentLayoutTableColumnConfig[],
): DocumentLayoutTableColumnConfig[] => {
  const defaults = getDefaultDocumentLayout(target).table_columns
  const merged = defaults.map((column) => {
    const override = overrides?.find((item) => item.key === column.key)
    if (!override) return column
    return {
      ...column,
      ...override,
      label: override.label?.trim() ? override.label : column.label,
      width: clamp(Number(override.width ?? column.width), 5, 100),
      order: Number.isFinite(override.order) ? override.order : column.order,
    }
  })

  const extra = (overrides || []).filter((item) => !defaults.some((column) => column.key === item.key))
  return [...merged, ...extra]
}

export const mergeDocumentLayoutConfig = (
  target: DocumentTargetEntity,
  overrides?: Partial<DocumentLayoutConfig>,
): DocumentLayoutConfig => ({
  sections: mergeSections(target, overrides?.sections),
  table_columns: mergeColumns(target, overrides?.table_columns),
})

export const sanitizeDocumentLayoutConfig = (
  target: DocumentTargetEntity,
  layout: DocumentLayoutConfig,
): DocumentLayoutConfig => {
  const base = mergeDocumentLayoutConfig(target, layout)
  const sanitizeSection = (section: DocumentLayoutSectionConfig): DocumentLayoutSectionConfig => {
    const cleanedLabel = section.label?.trim()
    const cleanedTitle = section.title?.trim()
    return {
      ...section,
      row: Math.max(0, Math.floor(section.row)),
      width: clamp(section.width, 10, 100),
      order: Math.max(0, Math.floor(section.order)),
      label: cleanedLabel || section.label || '',
      title: cleanedTitle || null,
      show_title: section.show_title === false ? false : null,
      show_label: section.show_label === false ? false : null,
    }
  }

  const sanitizeColumn = (column: DocumentLayoutTableColumnConfig): DocumentLayoutTableColumnConfig => ({
    ...column,
    width: clamp(column.width, 5, 100),
    order: Math.max(0, Math.floor(column.order)),
  })

  return {
    sections: base.sections.map(sanitizeSection),
    table_columns: base.table_columns.map(sanitizeColumn),
  }
}

export const sortSections = (sections: DocumentLayoutSectionConfig[]) =>
  [...sections].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    if (a.column !== b.column) return a.column.localeCompare(b.column)
    return a.order - b.order
  })

export const sortColumns = (columns: DocumentLayoutTableColumnConfig[]) =>
  [...columns].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.key.localeCompare(b.key)
  })

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { GripVertical, Eye, EyeOff, Move, Maximize2, RotateCcw, Columns2, Columns3, Square, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentTargetEntity,
  DocumentPageConfig,
  DocumentStyleConfig,
  ColumnsLayout,
} from '@/types/document-layout'
import {
  DEFAULT_PAGE_CONFIG,
  DEFAULT_STYLE_CONFIG,
  sortSections,
} from '@/lib/document-layout'

interface VisualLayoutEditorProps {
  target: DocumentTargetEntity
  layout: DocumentLayoutConfig
  onLayoutChange: (layout: DocumentLayoutConfig) => void
}

interface DraggableSectionProps {
  section: DocumentLayoutSectionConfig
  isSelected: boolean
  onClick: () => void
  onToggleEnabled: () => void
  scale: number
  columnsInRow: ColumnsLayout
}

// A4サイズ (pt) - 595.28 x 841.89
const A4_WIDTH = 595
const A4_HEIGHT = 842

function DraggableSection({
  section,
  isSelected,
  onClick,
  onToggleEnabled,
  scale,
  columnsInRow,
}: DraggableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getSectionHeight = () => {
    if (section.key === 'items_table') return 150
    if (section.key === 'notes' || section.key === 'footer') return 60
    if (section.key === 'document_meta' || section.key === 'document_title') return 80
    if (section.key === 'summary_box') return 140
    if (section.key === 'stamp_area') return 100
    if (section.key === 'greeting_text') return 40
    return 70
  }

  // 段組み対応の幅計算
  const getWidthPercent = () => {
    // 全幅指定の場合
    if (section.column === 'full' || columnsInRow === 1) return 100
    
    // 段組み設定がある場合、均等分割
    if (columnsInRow === 2) return 49 // 2列で約50%ずつ（gap考慮）
    if (columnsInRow === 3) return 32 // 3列で約33%ずつ（gap考慮）
    
    // 従来の左右配置
    return section.width || 50
  }

  // 段組み表示テキスト
  const getColumnLabel = () => {
    if (section.column === 'full' || columnsInRow === 1) return '全幅'
    if (columnsInRow === 2) {
      return `${columnsInRow}列中 ${(section.columnIndex ?? 0) + 1}番目`
    }
    if (columnsInRow === 3) {
      return `${columnsInRow}列中 ${(section.columnIndex ?? 0) + 1}番目`
    }
    return section.column === 'left' ? `左 ${section.width}%` : `右 ${section.width}%`
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        width: `${getWidthPercent()}%`,
        minHeight: getSectionHeight() * scale,
      }}
      className={cn(
        'relative border-2 rounded-md transition-all cursor-pointer',
        section.enabled
          ? 'bg-white border-gray-300 hover:border-blue-400'
          : 'bg-gray-100 border-gray-200 opacity-60',
        isSelected && 'border-blue-500 ring-2 ring-blue-200',
        isDragging && 'shadow-lg z-50'
      )}
      onClick={onClick}
    >
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 rounded cursor-grab hover:bg-gray-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* 表示/非表示トグル */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleEnabled()
        }}
        className="absolute top-1 right-1 p-1 rounded hover:bg-gray-100"
      >
        {section.enabled ? (
          <Eye className="h-4 w-4 text-gray-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* セクションコンテンツ */}
      <div className="p-3 pt-8">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={section.enabled ? 'default' : 'secondary'} className="text-xs">
            {section.region}
          </Badge>
          <span className="text-sm font-medium truncate">{section.label}</span>
        </div>
        <div className="text-xs text-gray-500">
          {getColumnLabel()}
        </div>
        {section.title && (
          <div className="mt-1 text-xs text-gray-400 truncate">
            タイトル: {section.title}
          </div>
        )}
      </div>

      {/* リサイズハンドル (選択時のみ表示) */}
      {isSelected && section.column !== 'full' && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-8 bg-blue-500 rounded cursor-ew-resize flex items-center justify-center">
          <Maximize2 className="h-2 w-2 text-white rotate-45" />
        </div>
      )}
    </div>
  )
}

function SectionOverlay({ section }: { section: DocumentLayoutSectionConfig }) {
  return (
    <div className="bg-white border-2 border-blue-500 rounded-md shadow-xl p-3 opacity-90">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-400" />
        <Badge variant="default" className="text-xs">{section.region}</Badge>
        <span className="text-sm font-medium">{section.label}</span>
      </div>
    </div>
  )
}

export function VisualLayoutEditor({
  target,
  layout,
  onLayoutChange,
}: VisualLayoutEditorProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [scale, setScale] = useState(0.6)
  const containerRef = useRef<HTMLDivElement>(null)

  const pageConfig = layout.page ?? DEFAULT_PAGE_CONFIG
  const styleConfig = layout.styles ?? DEFAULT_STYLE_CONFIG
  const sections = sortSections(layout.sections)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ページサイズの計算
  const getPageDimensions = () => {
    let width = A4_WIDTH
    let height = A4_HEIGHT

    if (pageConfig.size === 'A3') {
      width = 842
      height = 1191
    } else if (pageConfig.size === 'LETTER') {
      width = 612
      height = 792
    } else if (pageConfig.size === 'LEGAL') {
      width = 612
      height = 1008
    }

    if (pageConfig.orientation === 'landscape') {
      ;[width, height] = [height, width]
    }

    return { width, height }
  }

  const { width: pageWidth, height: pageHeight } = getPageDimensions()

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = sections.findIndex((s) => s.key === active.id)
    const newIndex = sections.findIndex((s) => s.key === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 新しい順序を計算
    const newSections = [...layout.sections]
    const movedSection = newSections.find((s) => s.key === active.id)
    const targetSection = newSections.find((s) => s.key === over.id)

    if (movedSection && targetSection) {
      // row と order を更新
      movedSection.row = targetSection.row
      movedSection.order = targetSection.order

      // 必要に応じて他のセクションの順序を調整
      const samRowSections = newSections.filter(
        (s) => s.row === targetSection.row && s.key !== active.id
      )
      samRowSections.forEach((s, i) => {
        if (s.order >= targetSection.order) {
          s.order = s.order + 1
        }
      })
    }

    onLayoutChange({ ...layout, sections: newSections })
  }

  const handleSectionChange = (
    key: string,
    updates: Partial<DocumentLayoutSectionConfig>
  ) => {
    onLayoutChange({
      ...layout,
      sections: layout.sections.map((section) =>
        section.key === key ? { ...section, ...updates } : section
      ),
    })
  }

  const handleToggleEnabled = (key: string) => {
    const section = layout.sections.find((s) => s.key === key)
    if (section) {
      handleSectionChange(key, { enabled: !section.enabled })
    }
  }

  const handleWidthChange = (key: string, width: number) => {
    handleSectionChange(key, { width })
  }

  const resetLayout = () => {
    // デフォルトレイアウトにリセット
    const { getDefaultDocumentLayout } = require('@/lib/document-layout')
    onLayoutChange(getDefaultDocumentLayout(target))
    setSelectedSection(null)
  }

  const activeSection = activeId
    ? sections.find((s) => s.key === activeId)
    : null

  const selectedSectionData = selectedSection
    ? sections.find((s) => s.key === selectedSection)
    : null

  // セクションを行ごとにグループ化
  const groupedSections = sections.reduce((acc, section) => {
    const row = section.row
    if (!acc[row]) acc[row] = []
    acc[row].push(section)
    return acc
  }, {} as Record<number, DocumentLayoutSectionConfig[]>)

  const sortedRows = Object.keys(groupedSections)
    .map(Number)
    .sort((a, b) => a - b)

  // 行の段組み数を取得
  const getRowColumnsLayout = (row: number): ColumnsLayout => {
    const rowSections = groupedSections[row] || []
    // 行内の最初のセクションから段組み設定を取得（全てのセクションで同じはず）
    const firstSection = rowSections[0]
    if (firstSection?.columnsInRow) return firstSection.columnsInRow
    // columnsInRowが未設定の場合、セクション数から推測
    if (rowSections.length === 1) return 1
    if (rowSections.length === 2) return 2
    if (rowSections.length >= 3) return 3
    return 1
  }

  // 行の段組み設定を変更
  const handleRowColumnsChange = (row: number, columns: ColumnsLayout) => {
    const rowSections = groupedSections[row] || []
    const newSections = layout.sections.map((section) => {
      if (section.row !== row) return section
      return {
        ...section,
        columnsInRow: columns,
        column: columns === 1 ? 'full' as const : section.column,
        columnIndex: rowSections.findIndex((s) => s.key === section.key) % columns,
      }
    })
    onLayoutChange({ ...layout, sections: newSections })
  }

  // 新しい行を追加
  const addNewRow = () => {
    const maxRow = Math.max(...sortedRows, 0)
    // 利用可能なセクションがあれば移動、なければ通知のみ
    const disabledSections = layout.sections.filter((s) => !s.enabled)
    if (disabledSections.length > 0) {
      const sectionToMove = disabledSections[0]
      onLayoutChange({
        ...layout,
        sections: layout.sections.map((s) =>
          s.key === sectionToMove.key
            ? { ...s, row: maxRow + 1, enabled: true, column: 'full' as const, columnsInRow: 1 as ColumnsLayout }
            : s
        ),
      })
    }
  }

  return (
    <div className="flex gap-6">
      {/* メインエディタ */}
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label className="text-sm">ズーム</Label>
            <Slider
              value={[scale * 100]}
              onValueChange={([value]) => setScale(value / 100)}
              min={30}
              max={100}
              step={10}
              className="w-32"
            />
            <span className="text-sm text-gray-500">{Math.round(scale * 100)}%</span>
          </div>
          <Button variant="outline" size="sm" onClick={resetLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            リセット
          </Button>
        </div>

        {/* プレビューキャンバス */}
        <div
          ref={containerRef}
          className="overflow-auto bg-gray-200 rounded-lg p-4"
          style={{ maxHeight: '70vh' }}
        >
          <div
            className="bg-white shadow-lg mx-auto"
            style={{
              width: pageWidth * scale,
              minHeight: pageHeight * scale,
              padding: `${pageConfig.margin.top * scale}px ${pageConfig.margin.right * scale}px ${pageConfig.margin.bottom * scale}px ${pageConfig.margin.left * scale}px`,
            }}
          >
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.key)}
                strategy={verticalListSortingStrategy}
              >
                {sortedRows.map((row) => {
                  const columnsInRow = getRowColumnsLayout(row)
                  return (
                    <div key={row} className="group relative">
                      {/* 行の段組みコントロール */}
                      <div className="absolute -left-2 top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="flex flex-col gap-1 bg-white rounded shadow-md p-1 border">
                          <button
                            onClick={() => handleRowColumnsChange(row, 1)}
                            className={cn(
                              'p-1 rounded hover:bg-gray-100',
                              columnsInRow === 1 && 'bg-blue-100 text-blue-600'
                            )}
                            title="1列"
                          >
                            <Square className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRowColumnsChange(row, 2)}
                            className={cn(
                              'p-1 rounded hover:bg-gray-100',
                              columnsInRow === 2 && 'bg-blue-100 text-blue-600'
                            )}
                            title="2列"
                          >
                            <Columns2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRowColumnsChange(row, 3)}
                            className={cn(
                              'p-1 rounded hover:bg-gray-100',
                              columnsInRow === 3 && 'bg-blue-100 text-blue-600'
                            )}
                            title="3列"
                          >
                            <Columns3 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* 行コンテンツ */}
                      <div
                        className="flex flex-wrap gap-2 mb-2 pl-4"
                        style={{ minHeight: 40 * scale }}
                      >
                        {groupedSections[row]
                          .sort((a, b) => (a.columnIndex ?? a.order) - (b.columnIndex ?? b.order))
                          .map((section) => (
                            <DraggableSection
                              key={section.key}
                              section={section}
                              isSelected={selectedSection === section.key}
                              onClick={() => setSelectedSection(section.key)}
                              onToggleEnabled={() => handleToggleEnabled(section.key)}
                              scale={scale}
                              columnsInRow={columnsInRow}
                            />
                          ))}
                      </div>
                    </div>
                  )
                })}
              </SortableContext>

              <DragOverlay>
                {activeSection ? <SectionOverlay section={activeSection} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* プロパティパネル */}
      <div className="w-80 shrink-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedSectionData ? selectedSectionData.label : 'セクションを選択'}
            </CardTitle>
            <CardDescription>
              {selectedSectionData
                ? 'プロパティを編集'
                : 'ドラッグで並び替え、クリックで選択'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSectionData ? (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="enabled">表示</Label>
                  <Switch
                    id="enabled"
                    checked={selectedSectionData.enabled}
                    onCheckedChange={(checked) =>
                      handleSectionChange(selectedSectionData.key, { enabled: checked })
                    }
                  />
                </div>

                {/* 行の段組み設定 */}
                <div className="space-y-2">
                  <Label>行の段組み</Label>
                  <div className="flex gap-2">
                    {([1, 2, 3] as ColumnsLayout[]).map((cols) => (
                      <Button
                        key={cols}
                        variant={getRowColumnsLayout(selectedSectionData.row) === cols ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleRowColumnsChange(selectedSectionData.row, cols)}
                        className="flex-1"
                      >
                        {cols === 1 && <Square className="h-4 w-4 mr-1" />}
                        {cols === 2 && <Columns2 className="h-4 w-4 mr-1" />}
                        {cols === 3 && <Columns3 className="h-4 w-4 mr-1" />}
                        {cols}列
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 段組み内での位置 (2列以上の場合) */}
                {getRowColumnsLayout(selectedSectionData.row) > 1 && (
                  <div className="space-y-2">
                    <Label>列の位置</Label>
                    <div className="flex gap-2">
                      {Array.from({ length: getRowColumnsLayout(selectedSectionData.row) }).map((_, idx) => (
                        <Button
                          key={idx}
                          variant={(selectedSectionData.columnIndex ?? 0) === idx ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            handleSectionChange(selectedSectionData.key, { columnIndex: idx })
                          }
                          className="flex-1"
                        >
                          {idx + 1}番目
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>リージョン</Label>
                  <div className="flex gap-2">
                    {(['header', 'body', 'footer'] as const).map((region) => (
                      <Button
                        key={region}
                        variant={selectedSectionData.region === region ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          handleSectionChange(selectedSectionData.key, { region })
                        }
                      >
                        {region}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    <Move className="h-3 w-3 inline mr-1" />
                    ドラッグハンドルを掴んで移動できます
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    <Columns2 className="h-3 w-3 inline mr-1" />
                    行左側のアイコンで段組みを変更
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Move className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">セクションをクリックして選択</p>
                <p className="text-xs mt-1">またはドラッグで並び替え</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ページ情報 */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ページ情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">サイズ</span>
                <span>{pageConfig.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">向き</span>
                <span>{pageConfig.orientation === 'portrait' ? '縦' : '横'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">余白</span>
                <span>
                  {pageConfig.margin.top}/{pageConfig.margin.right}/{pageConfig.margin.bottom}/{pageConfig.margin.left}pt
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

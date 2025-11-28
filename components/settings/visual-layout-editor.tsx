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
import { GripVertical, Eye, EyeOff, Move, Maximize2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  DocumentLayoutConfig,
  DocumentLayoutSectionConfig,
  DocumentTargetEntity,
  DocumentPageConfig,
  DocumentStyleConfig,
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
    if (section.key === 'document_meta') return 80
    return 70
  }

  const getWidthPercent = () => {
    if (section.column === 'full') return 100
    return section.width || 50
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
          {section.column === 'full' ? '全幅' : `${section.column === 'left' ? '左' : '右'} ${section.width}%`}
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
                {sortedRows.map((row) => (
                  <div
                    key={row}
                    className="flex flex-wrap gap-2 mb-2"
                    style={{ minHeight: 40 * scale }}
                  >
                    {groupedSections[row]
                      .sort((a, b) => a.order - b.order)
                      .map((section) => (
                        <DraggableSection
                          key={section.key}
                          section={section}
                          isSelected={selectedSection === section.key}
                          onClick={() => setSelectedSection(section.key)}
                          onToggleEnabled={() => handleToggleEnabled(section.key)}
                          scale={scale}
                        />
                      ))}
                  </div>
                ))}
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

                <div className="space-y-2">
                  <Label>配置</Label>
                  <div className="flex gap-2">
                    {(['left', 'right', 'full'] as const).map((col) => (
                      <Button
                        key={col}
                        variant={selectedSectionData.column === col ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          handleSectionChange(selectedSectionData.key, { column: col })
                        }
                      >
                        {col === 'left' ? '左' : col === 'right' ? '右' : '全幅'}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedSectionData.column !== 'full' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>幅</Label>
                      <span className="text-sm text-gray-500">{selectedSectionData.width}%</span>
                    </div>
                    <Slider
                      value={[selectedSectionData.width]}
                      onValueChange={([value]) =>
                        handleWidthChange(selectedSectionData.key, value)
                      }
                      min={20}
                      max={80}
                      step={5}
                    />
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

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ProjectActivityForm } from '@/components/procurement/project-activity-form'
import { Plus } from 'lucide-react'

interface ProjectActivityEntryButtonProps {
  projectId: string
  projectNumber?: string | null
  projectName?: string | null
  customerName?: string | null
  label?: string
  size?: 'default' | 'sm' | 'icon'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export function ProjectActivityEntryButton({
  projectId,
  projectNumber,
  projectName,
  customerName,
  label = '活動追加',
  size = 'sm',
  variant = 'outline',
}: ProjectActivityEntryButtonProps) {
  const [open, setOpen] = useState(false)

  const projects = [
    {
      id: projectId,
      projectNumber: projectNumber ?? '未採番',
      projectName: projectName ?? '案件名未設定',
      customerName: customerName ?? null,
    },
  ]

  const handleSuccess = () => {
    toast.success('活動を登録しました。')
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={size} variant={variant} className="gap-1">
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>活動を登録</SheetTitle>
          <SheetDescription>
            {projectNumber} · {projectName}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <ProjectActivityForm projects={projects} onSuccess={handleSuccess} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import { createProjectActivity } from '@/app/(dashboard)/dashboard/procurement/activity/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ProjectOption = {
  id: string
  projectNumber: string
  projectName: string
  customerName?: string | null
}

interface ProjectActivityFormProps {
  projects: ProjectOption[]
  onSuccess?: () => void
}

const today = new Date().toISOString().split('T')[0]

export function ProjectActivityForm({ projects, onSuccess }: ProjectActivityFormProps) {
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => (a.projectNumber > b.projectNumber ? -1 : 1)),
    [projects]
  )
  const hasProjects = sortedProjects.length > 0
  const showProjectSelect = sortedProjects.length > 1

  const [formState, setFormState] = useState({
    projectId: sortedProjects[0]?.id || '',
    activityDate: today,
    subject: '',
    details: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedProject = sortedProjects.find((project) => project.id === formState.projectId)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (!formState.projectId || !formState.activityDate || !formState.subject.trim()) {
      setMessage({ type: 'error', text: '必須項目を入力してください。' })
      return
    }

    startTransition(async () => {
      const result = await createProjectActivity({
        projectId: formState.projectId,
        activityDate: formState.activityDate,
        subject: formState.subject,
        details: formState.details,
      })

      if (!result.success) {
        setMessage({ type: 'error', text: result.message || '活動の登録に失敗しました。' })
        return
      }

      setMessage({ type: 'success', text: '活動を登録しました。' })
      setFormState((prev) => ({ ...prev, subject: '', details: '' }))
      onSuccess?.()
    })
  }

  if (!hasProjects) {
    return (
      <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-gray-500">
        登録可能な案件がありません。
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showProjectSelect ? (
          <div className="space-y-2">
            <Label htmlFor="activity-project">案件 *</Label>
            <Select
              value={formState.projectId}
              onValueChange={(value) => setFormState((prev) => ({ ...prev, projectId: value }))}
            >
              <SelectTrigger id="activity-project">
                <SelectValue placeholder="案件を選択" />
              </SelectTrigger>
              <SelectContent>
                {sortedProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.projectNumber} - {project.projectName}
                    {project.customerName ? ` / ${project.customerName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>案件 *</Label>
            <div className="rounded-2xl border border-dashed bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {selectedProject
                ? `${selectedProject.projectNumber} - ${selectedProject.projectName}${
                    selectedProject.customerName ? ` / ${selectedProject.customerName}` : ''
                  }`
                : '案件が選択されていません'}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="activity-date">活動日 *</Label>
          <Input
            id="activity-date"
            type="date"
            value={formState.activityDate}
            onChange={(event) => setFormState((prev) => ({ ...prev, activityDate: event.target.value }))}
            className="rounded-xl border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-subject">件名 *</Label>
        <Input
          id="activity-subject"
          value={formState.subject}
          maxLength={120}
          placeholder="例: 顧客定例ミーティング"
          onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
          className="rounded-xl border-gray-300 px-3 py-2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-details">詳細</Label>
        <Textarea
          id="activity-details"
          value={formState.details}
          placeholder="議事録や次回アクションなどを入力"
          rows={4}
          onChange={(event) => setFormState((prev) => ({ ...prev, details: event.target.value }))}
          className="rounded-2xl border-gray-300 px-3 py-2"
        />
      </div>

      {message && (
        <div
          className={
            message.type === 'success'
              ? 'rounded-md bg-green-50 px-3 py-2 text-sm text-green-700'
              : 'rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'
          }
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-xl px-6" disabled={isPending}>
          {isPending ? '登録中...' : '活動を登録'}
        </Button>
      </div>
    </form>
  )
}

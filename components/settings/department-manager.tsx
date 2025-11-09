'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Department } from '@/types/database'

type DialogMode = 'create' | 'edit'

interface DepartmentFormState {
  id?: string
  department_code: string
  department_name: string
  sort_order: string
  is_active: boolean
}

const emptyFormState: DepartmentFormState = {
  department_code: '',
  department_name: '',
  sort_order: '10',
  is_active: true,
}

export function DepartmentManager() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [formState, setFormState] = useState<DepartmentFormState>(emptyFormState)
  const [submitting, setSubmitting] = useState(false)

  const loadDepartments = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('department_name', { ascending: true })

    if (error) {
      console.error('部署の取得に失敗しました:', error)
      toast.error('部署データの取得に失敗しました')
      setDepartments([])
    } else {
      setDepartments(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  const nextCode = useMemo(() => {
    const prefix = 'DEP-'
    const numericValues = departments
      .map((dept) => Number(dept.department_code.replace(prefix, '')))
      .filter((value) => !Number.isNaN(value))
    const last = numericValues.length > 0 ? Math.max(...numericValues) : 0
    const next = last + 1
    return `${prefix}${String(next).padStart(3, '0')}`
  }, [departments])

  const nextSortOrder = useMemo(() => {
    if (departments.length === 0) return '10'
    const max = Math.max(...departments.map((dept) => dept.sort_order ?? 0))
    return String(max + 10)
  }, [departments])

  const openCreateDialog = () => {
    setFormState({
      ...emptyFormState,
      department_code: nextCode,
      sort_order: nextSortOrder,
    })
    setDialogMode('create')
    setDialogOpen(true)
  }

  const openEditDialog = (department: Department) => {
    setFormState({
      id: department.id,
      department_code: department.department_code,
      department_name: department.department_name,
      sort_order: String(department.sort_order ?? 0),
      is_active: department.is_active,
    })
    setDialogMode('edit')
    setDialogOpen(true)
  }

  const handleDelete = async (department: Department) => {
    if (!confirm(`部署「${department.department_name}」を削除しますか？`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('departments').delete().eq('id', department.id)
    if (error) {
      console.error('部署削除エラー:', error)
      toast.error('部署の削除に失敗しました（関連データが存在する可能性があります）')
      return
    }

    toast.success('部署を削除しました')
    loadDepartments()
  }

  const handleSubmit = async () => {
    if (!formState.department_name.trim()) {
      toast.error('部署名を入力してください')
      return
    }

    if (!formState.department_code.trim()) {
      toast.error('部署コードを入力してください')
      return
    }

    setSubmitting(true)

    const payload = {
      department_code: formState.department_code.trim(),
      department_name: formState.department_name.trim(),
      sort_order: Number(formState.sort_order) || 0,
      is_active: formState.is_active,
    }

    try {
      const supabase = createClient()
      let error
      if (dialogMode === 'create') {
        ;({ error } = await supabase.from('departments').insert(payload))
      } else if (formState.id) {
        ;({ error } = await supabase.from('departments').update(payload).eq('id', formState.id))
      }

      if (error) {
        throw error
      }

      toast.success(dialogMode === 'create' ? '部署を登録しました' : '部署を更新しました')
      setDialogOpen(false)
      loadDepartments()
    } catch (error) {
      console.error('部署保存エラー:', error)
      toast.error('部署の保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>部署マスタ</CardTitle>
              <CardDescription>システムで利用する部署を管理します。</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : departments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">登録されている部署がありません</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>部署名</TableHead>
                  <TableHead>並び順</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">{department.department_code}</TableCell>
                    <TableCell>{department.department_name}</TableCell>
                    <TableCell>{department.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={department.is_active ? 'default' : 'secondary'}>
                        {department.is_active ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(department)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(department)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? '部署登録' : '部署編集'}</DialogTitle>
            <DialogDescription>部署コード・名称・有効状態を設定してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="department_code">部署コード *</Label>
              <Input
                id="department_code"
                value={formState.department_code}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, department_code: event.target.value }))
                }
                placeholder="DEP-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_name">部署名 *</Label>
              <Input
                id="department_name"
                value={formState.department_name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, department_name: event.target.value }))
                }
                placeholder="営業部"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">並び順</Label>
              <Input
                id="sort_order"
                type="number"
                min={0}
                value={formState.sort_order}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, sort_order: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formState.is_active}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, is_active: Boolean(checked) }))
                }
              />
              <Label htmlFor="is_active">有効</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

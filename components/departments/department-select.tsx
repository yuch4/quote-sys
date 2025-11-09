'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Department } from '@/types/database'

type DepartmentOption = Pick<Department, 'id' | 'department_name' | 'is_active'>

type DepartmentSelectProps = {
  value: string | null
  onChange: (payload: { id: string | null; name: string | null }) => void
  disabled?: boolean
  placeholder?: string
  allowUnassignedOption?: boolean
}

const EMPTY_VALUE = '__none'

export function DepartmentSelect({
  value,
  onChange,
  disabled,
  placeholder = '部署を選択',
  allowUnassignedOption = true,
}: DepartmentSelectProps) {
  const [options, setOptions] = useState<DepartmentOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name, is_active, sort_order')
        .order('is_active', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('department_name', { ascending: true })

      if (error) {
        console.error('部署一覧の取得に失敗しました:', error)
        setOptions([])
      } else if (data) {
        setOptions(
          data.map((item) => ({
            id: item.id,
            department_name: item.department_name,
            is_active: item.is_active,
          }))
        )
      }
      setLoading(false)
    }

    load()
  }, [])

  const selectValue = useMemo(() => {
    if (!value) return EMPTY_VALUE
    return value
  }, [value])

  const handleValueChange = (newValue: string) => {
    if (newValue === EMPTY_VALUE) {
      onChange({ id: null, name: null })
      return
    }

    const selected = options.find((option) => option.id === newValue)
    onChange({
      id: selected?.id ?? null,
      name: selected?.department_name ?? null,
    })
  }

  const isDisabled = disabled || loading

  return (
    <Select value={selectValue} onValueChange={handleValueChange} disabled={isDisabled}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? '読み込み中...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowUnassignedOption && <SelectItem value={EMPTY_VALUE}>未割り当て</SelectItem>}
        {options.length === 0 ? (
          <SelectItem value="__empty" disabled>
            部署が登録されていません
          </SelectItem>
        ) : (
          options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.department_name}
              {!option.is_active && ' (無効)'}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  VISIBILITY_LABELS,
  type TicketPriority,
  type TicketCategory,
  type ContentVisibility,
} from '@/types/knowledge'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Customer {
  id: string
  customer_name: string
}

interface GroupCompany {
  id: string
  company_name: string
}

interface User {
  id: string
  display_name: string
}

export default function NewTicketPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [groupCompanies, setGroupCompanies] = useState<GroupCompany[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    group_company_id: '',
    category: 'general' as TicketCategory,
    priority: 'normal' as TicketPriority,
    visibility: 'customer' as ContentVisibility,
    assigned_to: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [customersRes, groupCompaniesRes, usersRes] = await Promise.all([
      supabase
        .from('customers')
        .select('id, customer_name')
        .eq('is_deleted', false)
        .order('customer_name'),
      supabase
        .from('group_companies')
        .select('id, company_name')
        .order('company_name'),
      supabase
        .from('users')
        .select('id, display_name')
        .eq('is_active', true)
        .order('display_name'),
    ])

    if (customersRes.data) setCustomers(customersRes.data)
    if (groupCompaniesRes.data) setGroupCompanies(groupCompaniesRes.data)
    if (usersRes.data) setUsers(usersRes.data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('件名を入力してください')
      return
    }
    if (!formData.description.trim()) {
      toast.error('内容を入力してください')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      const insertData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        visibility: formData.visibility,
        created_by: user.id,
      }

      if (formData.customer_id) {
        insertData.customer_id = formData.customer_id
      }
      if (formData.group_company_id) {
        insertData.group_company_id = formData.group_company_id
      }
      if (formData.assigned_to) {
        insertData.assigned_to = formData.assigned_to
      }

      const { data: ticket, error } = await supabase
        .from('knowledge_tickets')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      toast.success('チケットを作成しました')
      router.push(`/dashboard/knowledge/tickets/${ticket.id}`)
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('チケットの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/knowledge/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新規チケット作成</h1>
          <p className="text-sm text-gray-500 mt-1">
            顧客からの問い合わせを登録します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>チケット情報</CardTitle>
            <CardDescription>問い合わせの詳細を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 件名 */}
            <div className="space-y-2">
              <Label htmlFor="title">
                件名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="問い合わせの件名を入力"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* 内容 */}
            <div className="space-y-2">
              <Label htmlFor="description">
                内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="問い合わせの詳細を入力"
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* 顧客/会社選択 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">顧客</Label>
                <Select
                  value={formData.customer_id || '__none__'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, customer_id: value === '__none__' ? '' : value, group_company_id: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="顧客を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">選択なし</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group_company_id">グループ会社</Label>
                <Select
                  value={formData.group_company_id || '__none__'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, group_company_id: value === '__none__' ? '' : value, customer_id: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="グループ会社を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">選択なし</SelectItem>
                    {groupCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* カテゴリ・優先度・公開範囲 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as TicketCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">優先度</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as TicketPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">公開範囲</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) =>
                    setFormData({ ...formData, visibility: value as ContentVisibility })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 担当者 */}
            <div className="space-y-2">
              <Label htmlFor="assigned_to">担当者</Label>
              <Select
                value={formData.assigned_to || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="担当者を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未割当</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/dashboard/knowledge/tickets">
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                チケット作成
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

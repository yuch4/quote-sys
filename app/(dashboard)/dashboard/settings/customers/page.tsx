import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'

export default async function CustomersPage() {
  const supabase = await createClient()
  
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_deleted', false)
    .order('customer_code', { ascending: true })

  if (error) {
    console.error('Error fetching customers:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">顧客マスタ</h1>
          <p className="text-gray-600 mt-2">顧客情報の管理</p>
        </div>
        <Link href="/dashboard/settings/customers/new">
          <Button>新規登録</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>顧客一覧</CardTitle>
          <CardDescription>登録されている顧客情報</CardDescription>
        </CardHeader>
        <CardContent>
          {customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>顧客コード</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.customer_code}</TableCell>
                    <TableCell>{customer.customer_name}</TableCell>
                    <TableCell>{customer.contact_person || '-'}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/settings/customers/${customer.id}`}>
                        <Button variant="outline" size="sm">編集</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              登録されている顧客がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

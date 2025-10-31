import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'

export default async function SuppliersPage() {
  const supabase = await createClient()
  
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_deleted', false)
    .order('supplier_code', { ascending: true })

  if (error) {
    console.error('Error fetching suppliers:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">仕入先マスタ</h1>
          <p className="text-gray-600 mt-2">仕入先情報の管理</p>
        </div>
        <Link href="/dashboard/settings/suppliers/new">
          <Button>新規登録</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>仕入先一覧</CardTitle>
          <CardDescription>登録されている仕入先情報</CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers && suppliers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>仕入先コード</TableHead>
                  <TableHead>仕入先名</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>支払条件</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.supplier_code}</TableCell>
                    <TableCell>{supplier.supplier_name}</TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>{supplier.payment_terms || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/settings/suppliers/${supplier.id}`}>
                        <Button variant="outline" size="sm">編集</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              登録されている仕入先がありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

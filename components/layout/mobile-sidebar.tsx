'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from './sidebar'

interface MobileSidebarProps {
  userRole?: string
}

export function MobileSidebar({ userRole }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden text-gray-800">
          <Menu className="h-6 w-6" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 border-none bg-[#1E2938] text-white">
        <Sidebar userRole={userRole} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

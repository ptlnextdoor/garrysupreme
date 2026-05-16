"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { SidebarContents } from "@/components/dashboard/sidebar"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open navigation"
          className="md:hidden -ml-1 w-9 h-9 inline-flex items-center justify-center rounded-lg text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 flex flex-col bg-background/40 backdrop-blur-xl border-r border-border/60 [&>button:last-child]:hidden"
      >
        <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Jump between dashboard sections.
        </SheetDescription>
        <SidebarContents onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

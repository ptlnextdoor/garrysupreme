"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { customers } from "@/lib/mock/customers"
import { getMenuItem } from "@/lib/mock/menu"
import type { Customer } from "@/lib/mock/types"

const churnColor = {
  low: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10",
  medium: "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/10",
  high: "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/10",
}

export default function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null)

  return (
    <>
      <DashboardTopbar title="Customers" subtitle="Every caller, every preference, perfectly remembered." />
      <div className="p-6 lg:px-12 lg:py-10 w-full">
        <Card className="p-2">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm py-4">Customer</TableHead>
                  <TableHead className="hidden md:table-cell text-sm py-4">Language</TableHead>
                  <TableHead className="hidden sm:table-cell text-right text-sm py-4">Orders</TableHead>
                  <TableHead className="hidden sm:table-cell text-right text-sm py-4">Avg ticket</TableHead>
                  <TableHead className="text-sm py-4">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                    <TableCell className="py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                          {c.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")}
                        </div>
                        <div>
                          <div className="text-base font-medium">{c.name}</div>
                          <div className="text-sm text-muted-foreground">{c.phone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-base text-muted-foreground py-5">
                      {c.language}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-base py-5">
                      {c.totalOrders}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-base py-5">
                      ${c.avgTicket.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-5">
                      <Badge variant="secondary" className={`${churnColor[c.churnRisk]} text-sm py-1 px-2.5`}>
                        {c.churnRisk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {selected.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </div>
                  <div>
                    <SheetTitle className="text-base font-medium">{selected.name}</SheetTitle>
                    <SheetDescription className="text-xs">
                      {selected.phone} · {selected.language}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-6 py-5 space-y-5 text-sm">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Orders</div>
                    <div className="text-lg font-medium">{selected.totalOrders}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Avg ticket</div>
                    <div className="text-lg font-medium">${selected.avgTicket.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Risk</div>
                    <Badge variant="secondary" className={`mt-0.5 ${churnColor[selected.churnRisk]}`}>
                      {selected.churnRisk}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Preferences</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.preferences.map((p) => (
                      <Badge key={p} variant="secondary" className="font-normal">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Allergies / restrictions</div>
                  {selected.allergies.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.allergies.map((a) => (
                        <Badge key={a} variant="secondary" className="bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/10 font-normal">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">None recorded.</div>
                  )}
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Favorite items</div>
                  <div className="space-y-1">
                    {selected.favoriteItemIds.map((id) => {
                      const item = getMenuItem(id)
                      if (!item) return null
                      return (
                        <div key={id} className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">${item.price.toFixed(2)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</div>
                  <p className="text-sm leading-relaxed text-foreground/80">{selected.notes}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

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
  low: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  medium: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  high: "bg-rose-100 text-rose-800 hover:bg-rose-100",
}

export default function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null)

  return (
    <>
      <DashboardTopbar title="Customers" subtitle="Every caller, every preference, perfectly remembered." />
      <div className="p-6 lg:p-10 max-w-6xl">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Language</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Orders</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Avg ticket</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                          {c.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.phone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {c.language}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-sm">{c.totalOrders}</TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-sm">
                      ${c.avgTicket.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={churnColor[c.churnRisk]}>
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
                        <Badge key={a} variant="secondary" className="bg-rose-100 text-rose-800 hover:bg-rose-100 font-normal">
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

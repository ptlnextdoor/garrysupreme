'use client'

import type { RecentOrder } from '../lib/types'

const MOCK_ORDERS: RecentOrder[] = [
  {
    callId: 'mock-1',
    phone: '+11234567890',
    customerName: 'Aarya',
    items: ['Oat Milk Latte (less sweet)', 'Chai Latte (oat milk, extra spiced)'],
    total: 10.50,
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    callId: 'mock-2',
    phone: '+19876543210',
    customerName: 'Guest',
    items: ['Cold Brew', 'Avocado Toast'],
    total: 13.00,
    timestamp: new Date(Date.now() - 720000).toISOString(),
  },
]

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function OrderFeed({ orders = MOCK_ORDERS }: { orders?: RecentOrder[] }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 sticky top-0 bg-[#1A1A1A] pb-2">
        Order Feed
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-6">No orders yet</p>
      ) : (
        orders.map((order) => (
          <div
            key={order.callId}
            className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-4 py-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{order.customerName}</span>
              <span className="text-xs text-gray-500">{formatTime(order.timestamp)}</span>
            </div>
            <ul className="text-xs text-gray-400 flex flex-col gap-0.5">
              {order.items.map((item, i) => (
                <li key={i} className="before:content-['·'] before:mr-1.5 before:text-[#F97316]">
                  {item}
                </li>
              ))}
            </ul>
            <div className="text-right text-sm font-bold text-[#F97316]">
              ${order.total.toFixed(2)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

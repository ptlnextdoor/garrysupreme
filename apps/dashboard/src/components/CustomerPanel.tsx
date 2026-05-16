'use client'

import type { CustomerProfile } from '../lib/types'

const MOCK_CUSTOMER: CustomerProfile = {
  phone: '+17028619093',
  name: 'Aarya',
  likes: ['Kirkland brand', 'organic', 'dairy-free', 'bulk', 'salmon'],
  avoids: ['dairy', 'processed snacks'],
  style: 'Executive member since 2021. Manages household of 4. Direct shopper.',
  lastOrder: 'Stanley Quencher Tumbler (gift for Mom)',
  householdMembers: [
    { name: 'Mom', preferences: ['Vitamin D3', 'Cold Brew', 'Kerrygold butter'] },
    { name: 'Partner', preferences: ['AirPods Pro', 'organic chicken', 'tech'] },
    { name: 'Kids (5 & 8)', preferences: ['Goldfish', 'fruit snacks', 'bananas'] },
  ],
}

export default function CustomerPanel({ customer = MOCK_CUSTOMER }: { customer?: CustomerProfile }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Customer Profile</h2>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold text-lg">
          {customer.name[0]}
        </div>
        <div>
          <div className="text-white font-semibold">{customer.name}</div>
          <div className="text-xs text-gray-500">···{customer.phone.slice(-4)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Likes</span>
        <div className="flex flex-wrap gap-1.5">
          {customer.likes.map((tag) => (
            <span key={tag} className="text-xs bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Avoids</span>
        <div className="flex flex-wrap gap-1.5">
          {customer.avoids.map((tag) => (
            <span key={tag} className="text-xs bg-red-900/20 text-red-400 border border-red-800/30 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {customer.lastOrder && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Last Order</span>
          <span className="text-xs text-gray-300">{customer.lastOrder}</span>
        </div>
      )}

      {customer.householdMembers && customer.householdMembers.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Household</span>
          {customer.householdMembers.map((m) => (
            <div key={m.name} className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2">
              <div className="text-xs font-medium text-white mb-1">{m.name}</div>
              <div className="flex flex-wrap gap-1">
                {m.preferences.map((p) => (
                  <span key={p} className="text-xs text-gray-400">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-600 italic border-t border-[#2A2A2A] pt-3">
        {customer.style}
      </div>
    </div>
  )
}

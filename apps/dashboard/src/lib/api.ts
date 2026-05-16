const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`)
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function getActiveCalls() {
  return get<{ calls: import('./types').ActiveCall[] }>('/api/calls/active')
}

export async function getCustomer(phone: string) {
  return get<import('./types').CustomerProfile>(`/api/customers/${encodeURIComponent(phone)}`)
}

export async function approveFact(factId: string): Promise<void> {
  await post('/api/memory/approve', { factId })
}

export async function rejectFact(factId: string): Promise<void> {
  await post('/api/memory/reject', { factId })
}

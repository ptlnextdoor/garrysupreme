const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[gstack] ${msg}`, data)
  else console.error(`[gstack] ${msg}`)
}

export type GStackConfig = {
  apiKey?: string
  baseUrl?: string
  projectId?: string
}

export type GStackJob = { jobId: string; mode: 'api' | 'noop' }

export class GStackClient {
  readonly mode: 'api' | 'noop'
  private readonly apiKey?: string
  private readonly baseUrl?: string
  private readonly projectId?: string

  constructor(cfg: GStackConfig = {}) {
    const apiKey = cfg.apiKey ?? process.env.GSTACK_API_KEY
    const baseUrl = cfg.baseUrl ?? process.env.GSTACK_BASE_URL
    const projectId = cfg.projectId ?? process.env.GSTACK_PROJECT_ID
    if (apiKey && baseUrl) {
      this.mode = 'api'
      this.apiKey = apiKey
      this.baseUrl = baseUrl.replace(/\/$/, '')
      this.projectId = projectId
    } else {
      this.mode = 'noop'
    }
  }

  async triggerRole(role: string, input: object, instructions: string): Promise<GStackJob> {
    if (this.mode === 'noop') {
      log(`triggerRole(${role}) skipped (no GStack credentials)`)
      return { jobId: `noop-${Date.now()}`, mode: 'noop' }
    }
    try {
      // FIXME: adapt to real GStack API
      const res = await fetch(`${this.baseUrl}/roles/${encodeURIComponent(role)}/trigger`, {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ projectId: this.projectId, input, instructions }),
      })
      if (!res.ok) throw new Error(`GStack ${res.status}: ${await res.text()}`)
      const body = (await res.json()) as { jobId?: string }
      return { jobId: body.jobId ?? `unknown-${Date.now()}`, mode: 'api' }
    } catch (err) {
      log(`triggerRole(${role}) failed`, err)
      return { jobId: `err-${Date.now()}`, mode: 'noop' }
    }
  }
}

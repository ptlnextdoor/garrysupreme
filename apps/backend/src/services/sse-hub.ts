import type { SSEEvent } from '../types.js'
import type { FastifyReply } from 'fastify'

const log = (msg: string, data?: unknown): void => {
  if (data !== undefined) console.error(`[sse-hub] ${msg}`, data)
  else console.error(`[sse-hub] ${msg}`)
}

export class SSEHub {
  private clients = new Set<FastifyReply>()

  addClient(reply: FastifyReply): void {
    this.clients.add(reply)
    try {
      reply.raw.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`)
    } catch (err) {
      log('initial write failed', err)
      this.clients.delete(reply)
    }
  }

  removeClient(reply: FastifyReply): void {
    this.clients.delete(reply)
  }

  size(): number {
    return this.clients.size
  }

  broadcast(event: SSEEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`
    for (const client of this.clients) {
      try {
        client.raw.write(payload)
      } catch (err) {
        log('broadcast write failed; removing client', err)
        this.clients.delete(client)
      }
    }
  }

  heartbeat(): void {
    for (const client of this.clients) {
      try {
        client.raw.write(`: ping ${Date.now()}\n\n`)
      } catch (err) {
        log('heartbeat failed; removing client', err)
        this.clients.delete(client)
      }
    }
  }
}

export const hub = new SSEHub()

setInterval(() => hub.heartbeat(), 15000).unref?.()

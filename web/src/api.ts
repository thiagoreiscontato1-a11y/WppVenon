import type {Ack, Chat, Message, SessionState} from './types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      message = body.message || message
    } catch {
      // not JSON
    }
    throw new Error(message)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const chatPath = (chatId: string) => `/chats/${encodeURIComponent(chatId)}`

export const api = {
  getSession: () => request<SessionState>('/session'),
  restartSession: () => post<SessionState>('/session/restart'),
  getChats: () => request<Chat[]>('/chats'),
  getMessages: (chatId: string) => request<Message[]>(`${chatPath(chatId)}/messages`),
  sendText: (chatId: string, text: string, replyTo?: string) =>
    post(`${chatPath(chatId)}/messages`, {text, replyTo}),
  sendFile: (chatId: string, file: File, caption?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    return request(`${chatPath(chatId)}/files`, {method: 'POST', body: form})
  },
  markSeen: (chatId: string) => post(`${chatPath(chatId)}/seen`),
}

export interface EventHandlers {
  onStatus: (state: SessionState) => void
  onMessage: (message: Message) => void
  onAck: (ack: Ack) => void
  onConnectionChange: (online: boolean) => void
}

/**
 * Subscribes to the API's Server-Sent Events. EventSource reconnects by itself.
 */
export function subscribeEvents(handlers: EventHandlers): () => void {
  const source = new EventSource(`${BASE}/events`)
  const parse = (event: MessageEvent) => JSON.parse(event.data)

  source.onopen = () => handlers.onConnectionChange(true)
  source.onerror = () => handlers.onConnectionChange(false)
  source.addEventListener('status', (e) => handlers.onStatus(parse(e as MessageEvent)))
  source.addEventListener('message', (e) => handlers.onMessage(parse(e as MessageEvent)))
  source.addEventListener('ack', (e) => handlers.onAck(parse(e as MessageEvent)))

  return () => source.close()
}

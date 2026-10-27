// Mirrors src/api/web.mapper.ts and src/session.service.ts in the API

export type SessionStatus = 'starting' | 'qr' | 'connected' | 'disconnected' | 'error'

export interface SessionState {
  status: SessionStatus
  detail: string | null
  qr: string | null
}

export interface Chat {
  id: string
  name: string
  isGroup: boolean
  unreadCount: number
  timestamp: number
  archived: boolean
  pinned: boolean
  picture: string | null
}

export interface Message {
  id: string
  chatId: string
  fromMe: boolean
  author: string | null
  body: string
  type: string
  hasMedia: boolean
  thumbnail: string | null
  filename: string | null
  mimetype: string | null
  timestamp: number
  ack: number
  // Only on the client: sent but not yet confirmed by the API
  pending?: boolean
}

export interface Ack {
  id: string
  chatId: string
  ack: number
}

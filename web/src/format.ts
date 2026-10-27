import type {Message} from './types'

const time = new Intl.DateTimeFormat('pt-BR', {hour: '2-digit', minute: '2-digit'})
const date = new Intl.DateTimeFormat('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})
const weekday = new Intl.DateTimeFormat('pt-BR', {weekday: 'long'})

const DAY = 24 * 60 * 60 * 1000

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Days between the timestamp (seconds) and today: 0 = today, 1 = yesterday... */
function daysAgo(timestamp: number): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(timestamp * 1000))) / DAY)
}

export function formatTime(timestamp: number): string {
  return time.format(new Date(timestamp * 1000))
}

/** Time for today, "Ontem", weekday for this week, date otherwise (like the chat list in WhatsApp). */
export function formatChatDate(timestamp: number): string {
  if (!timestamp) return ''
  const days = daysAgo(timestamp)
  if (days === 0) return formatTime(timestamp)
  if (days === 1) return 'Ontem'
  if (days < 7) return weekday.format(new Date(timestamp * 1000))
  return date.format(new Date(timestamp * 1000))
}

export function formatDaySeparator(timestamp: number): string {
  const days = daysAgo(timestamp)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return weekday.format(new Date(timestamp * 1000))
  return date.format(new Date(timestamp * 1000))
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(new Date(a * 1000)) === startOfDay(new Date(b * 1000))
}

const MEDIA_LABELS: Record<string, string> = {
  image: '📷 Foto',
  video: '🎥 Vídeo',
  audio: '🎵 Áudio',
  ptt: '🎤 Mensagem de voz',
  document: '📄 Documento',
  sticker: '💟 Figurinha',
  location: '📍 Localização',
  vcard: '👤 Contato',
  multi_vcard: '👥 Contatos',
}

export function mediaLabel(message: Message): string | null {
  return MEDIA_LABELS[message.type] || null
}

/** One-line preview for the chat list. */
export function messagePreview(message: Message): string {
  const label = mediaLabel(message)
  if (label) {
    const detail = message.body || (message.type === 'document' ? message.filename : null)
    return detail ? `${label}: ${detail}` : label
  }
  return message.body
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '#'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

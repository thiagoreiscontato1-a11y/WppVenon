/**
 * Turns the (huge) WPPConnect objects into the small shapes the web chat needs.
 * WhatsApp is not consistent: ids can be either a string or an Id object.
 */

export interface WebChat {
    id: string
    name: string
    isGroup: boolean
    unreadCount: number
    timestamp: number
    archived: boolean
    pinned: boolean
    picture: string | null
}

export interface WebMessage {
    id: string
    chatId: string
    fromMe: boolean
    author: string | null
    body: string
    type: string
    hasMedia: boolean
    // Small inline preview (data URL) that WhatsApp sends with images/videos
    thumbnail: string | null
    filename: string | null
    mimetype: string | null
    timestamp: number
    ack: number
}

export interface WebAck {
    id: string
    chatId: string
    ack: number
}

const MEDIA_TYPES = ['image', 'video', 'audio', 'ptt', 'document', 'sticker']
const THUMBNAIL_TYPES = ['image', 'video', 'sticker']

export function serializeId(id: any): string {
    if (!id) {
        return ''
    }
    return typeof id === 'string' ? id : (id._serialized || '')
}

export function toWebChat(chat: any): WebChat {
    const contact = chat.contact || {}
    const id = serializeId(chat.id)
    return {
        id,
        name: chat.name || contact.name || contact.formattedName || contact.pushname || id.split('@')[0],
        isGroup: Boolean(chat.isGroup),
        unreadCount: chat.unreadCount || 0,
        timestamp: chat.t || 0,
        archived: Boolean(chat.archive),
        pinned: Boolean(chat.pin),
        picture: contact.profilePicThumbObj?.eurl || null,
    }
}

export function toWebMessage(message: any): WebMessage {
    const fromMe = Boolean(message.fromMe ?? message.id?.fromMe)
    const chatId = serializeId(message.chatId) || serializeId(fromMe ? message.to : message.from)
    const hasMedia = MEDIA_TYPES.includes(message.type)
    const sender = message.sender || {}
    // For media messages `body` holds the base64 thumbnail, not text
    const body = hasMedia ? (message.caption || '') : (message.body || message.content || '')
    const thumbnail = THUMBNAIL_TYPES.includes(message.type) && message.body && !message.body.startsWith('http')
        ? `data:image/jpeg;base64,${message.body}`
        : null

    return {
        id: serializeId(message.id),
        chatId,
        fromMe,
        author: message.isGroupMsg && !fromMe
            ? (sender.pushname || sender.formattedName || sender.name || serializeId(message.author) || null)
            : null,
        body,
        type: message.type,
        hasMedia,
        thumbnail,
        filename: message.filename || null,
        mimetype: message.mimetype || null,
        timestamp: message.t || message.timestamp || 0,
        ack: message.ack ?? 0,
    }
}

export function toWebAck(ack: any): WebAck {
    const fromMe = Boolean(ack.id?.fromMe)
    return {
        id: serializeId(ack.id),
        chatId: serializeId(ack.id?.remote) || serializeId(fromMe ? ack.to : ack.from),
        ack: ack.ack,
    }
}

import {useCallback, useEffect, useReducer, useRef} from 'react'
import {api, subscribeEvents} from './api'
import type {Ack, Chat, Message, SessionState} from './types'

interface State {
  session: SessionState | null
  // false while the event stream to the API is down
  online: boolean
  chats: Chat[]
  // Messages of the chats that were opened, oldest first
  messages: Record<string, Message[]>
  // Last known message of each chat, for the list preview
  lastMessage: Record<string, Message>
  selectedId: string | null
  error: string | null
}

type Action =
  | {type: 'session'; session: SessionState}
  | {type: 'online'; online: boolean}
  | {type: 'chats'; chats: Chat[]}
  | {type: 'messages'; chatId: string; messages: Message[]}
  | {type: 'incoming'; message: Message}
  | {type: 'ack'; ack: Ack}
  | {type: 'pending'; message: Message}
  | {type: 'pendingFailed'; chatId: string; id: string}
  | {type: 'select'; chatId: string | null}
  | {type: 'error'; error: string | null}

const initialState: State = {
  session: null,
  online: true,
  chats: [],
  messages: {},
  lastMessage: {},
  selectedId: null,
  error: null,
}

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.timestamp - a.timestamp)
}

export function placeholderChat(chatId: string): Chat {
  return {
    id: chatId,
    name: chatId.split('@')[0],
    isGroup: chatId.endsWith('@g.us'),
    unreadCount: 0,
    timestamp: Math.floor(Date.now() / 1000),
    archived: false,
    pinned: false,
    picture: null,
  }
}

function upsertMessage(list: Message[], message: Message): Message[] {
  const index = list.findIndex((m) => m.id === message.id)
  if (index >= 0) {
    const copy = [...list]
    copy[index] = {...copy[index], ...message, ack: Math.max(copy[index].ack, message.ack)}
    return copy
  }
  // Our own message coming back from WhatsApp replaces the optimistic copy
  let base = list
  if (message.fromMe) {
    const pendingIndex = list.findIndex((m) => m.pending && m.body === message.body)
    if (pendingIndex >= 0) {
      base = list.filter((_, i) => i !== pendingIndex)
    }
  }
  return [...base, message]
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'session':
      return {...state, session: action.session}
    case 'online':
      return {...state, online: action.online}
    case 'error':
      return {...state, error: action.error}
    case 'chats': {
      // Keep chats that only exist locally (new conversation not yet in WhatsApp's list)
      const ids = new Set(action.chats.map((c) => c.id))
      const localOnly = state.chats.filter((c) => !ids.has(c.id) && state.messages[c.id] !== undefined)
      return {...state, chats: sortChats([...action.chats, ...localOnly])}
    }
    case 'messages': {
      const last = action.messages[action.messages.length - 1]
      return {
        ...state,
        messages: {...state.messages, [action.chatId]: action.messages},
        lastMessage: last ? {...state.lastMessage, [action.chatId]: last} : state.lastMessage,
      }
    }
    case 'incoming': {
      const {message} = action
      const {chatId} = message
      const loaded = state.messages[chatId]
      const isOpen = state.selectedId === chatId
      const exists = state.chats.some((c) => c.id === chatId)
      const chats = exists ? state.chats : [...state.chats, placeholderChat(chatId)]
      return {
        ...state,
        messages: loaded ? {...state.messages, [chatId]: upsertMessage(loaded, message)} : state.messages,
        lastMessage: {...state.lastMessage, [chatId]: message},
        chats: sortChats(chats.map((c) => c.id !== chatId ? c : {
          ...c,
          timestamp: Math.max(c.timestamp, message.timestamp),
          unreadCount: !message.fromMe && !isOpen ? c.unreadCount + 1 : c.unreadCount,
          archived: message.fromMe || isOpen ? c.archived : false,
        })),
      }
    }
    case 'ack': {
      const {ack} = action
      const update = (m: Message) => m.id === ack.id ? {...m, ack: Math.max(m.ack, ack.ack)} : m
      const loaded = state.messages[ack.chatId]
      const last = state.lastMessage[ack.chatId]
      return {
        ...state,
        messages: loaded ? {...state.messages, [ack.chatId]: loaded.map(update)} : state.messages,
        lastMessage: last ? {...state.lastMessage, [ack.chatId]: update(last)} : state.lastMessage,
      }
    }
    case 'pending': {
      const {message} = action
      const loaded = state.messages[message.chatId] || []
      return {
        ...state,
        messages: {...state.messages, [message.chatId]: [...loaded, message]},
        lastMessage: {...state.lastMessage, [message.chatId]: message},
      }
    }
    case 'pendingFailed': {
      const loaded = state.messages[action.chatId] || []
      return {
        ...state,
        // ack -1 = failed (same as WhatsApp's AckType.FAILED)
        messages: {
          ...state.messages,
          [action.chatId]: loaded.map((m) => m.id === action.id ? {...m, pending: false, ack: -1} : m),
        },
      }
    }
    case 'select': {
      const chatId = action.chatId
      const exists = chatId === null || state.chats.some((c) => c.id === chatId)
      const chats = exists ? state.chats : sortChats([placeholderChat(chatId), ...state.chats])
      return {
        ...state,
        selectedId: chatId,
        chats: chats.map((c) => c.id === chatId ? {...c, unreadCount: 0} : c),
      }
    }
  }
}

export function useWhatsapp() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const knownChats = useRef(new Set<string>())
  knownChats.current = new Set(state.chats.map((c) => c.id))

  const fail = useCallback((error: unknown) => {
    dispatch({type: 'error', error: error instanceof Error ? error.message : String(error)})
  }, [])

  const loadChats = useCallback(() => {
    api.getChats().then((chats) => dispatch({type: 'chats', chats})).catch(fail)
  }, [fail])

  // Realtime events
  useEffect(() => {
    api.getSession().then((session) => dispatch({type: 'session', session})).catch(fail)
    return subscribeEvents({
      onStatus: (session) => dispatch({type: 'session', session}),
      onMessage: (message) => {
        dispatch({type: 'incoming', message})
        // A chat we didn't know yet: refresh the list to get its real name
        if (!knownChats.current.has(message.chatId)) loadChats()
      },
      onAck: (ack) => dispatch({type: 'ack', ack}),
      onConnectionChange: (online) => dispatch({type: 'online', online}),
    })
  }, [fail, loadChats])

  const connected = state.session?.status === 'connected'
  useEffect(() => {
    if (connected) loadChats()
  }, [connected, loadChats])

  const selectChat = useCallback((chatId: string | null) => {
    dispatch({type: 'select', chatId})
    if (!chatId) return
    api.getMessages(chatId).then((messages) => dispatch({type: 'messages', chatId, messages})).catch(fail)
    api.markSeen(chatId).catch(() => undefined)
  }, [fail])

  // Messages arriving in the open chat are marked as read
  const selectedId = state.selectedId
  const lastInOpenChat = selectedId ? state.lastMessage[selectedId] : undefined
  useEffect(() => {
    if (selectedId && lastInOpenChat && !lastInOpenChat.fromMe) {
      api.markSeen(selectedId).catch(() => undefined)
    }
  }, [selectedId, lastInOpenChat])

  const sendText = useCallback((chatId: string, text: string) => {
    const id = `pending-${Date.now()}`
    dispatch({
      type: 'pending',
      message: {
        id, chatId, fromMe: true, author: null, body: text, type: 'chat', hasMedia: false,
        thumbnail: null, filename: null, mimetype: null, timestamp: Math.floor(Date.now() / 1000), ack: 0,
        pending: true,
      },
    })
    api.sendText(chatId, text).catch((error) => {
      dispatch({type: 'pendingFailed', chatId, id})
      fail(error)
    })
  }, [fail])

  const sendFile = useCallback((chatId: string, file: File, caption?: string) => {
    // The message shows up through the event stream once WhatsApp accepts it
    api.sendFile(chatId, file, caption).catch(fail)
  }, [fail])

  const restartSession = useCallback(() => {
    api.restartSession().then((session) => dispatch({type: 'session', session})).catch(fail)
  }, [fail])

  const clearError = useCallback(() => dispatch({type: 'error', error: null}), [])

  return {state, selectChat, sendText, sendFile, restartSession, reloadChats: loadChats, clearError}
}

import {useMemo, useState} from 'react'
import type {Chat, Message} from '../types'
import {formatChatDate, messagePreview} from '../format'
import {Avatar} from './Avatar'
import {AckIcon} from './AckIcon'

interface Props {
  chats: Chat[]
  lastMessage: Record<string, Message>
  selectedId: string | null
  onSelect: (chatId: string) => void
  onReload: () => void
}

/** Accepts a phone number (with or without symbols) or a full WhatsApp id. */
function toChatId(input: string): string | null {
  const value = input.trim()
  if (value.includes('@')) return value
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8 ? `${digits}@c.us` : null
}

export function Sidebar({chats, lastMessage, selectedId, onSelect, onReload}: Props) {
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [newChat, setNewChat] = useState<string | null>(null)

  const archivedCount = chats.filter((c) => c.archived).length
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return chats.filter((chat) => {
      if (term) return chat.name.toLowerCase().includes(term) || chat.id.includes(term)
      return chat.archived === showArchived
    })
  }, [chats, search, showArchived])

  const startChat = () => {
    const chatId = newChat ? toChatId(newChat) : null
    if (chatId) {
      onSelect(chatId)
      setNewChat(null)
    }
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h2>{showArchived ? 'Arquivadas' : 'Conversas'}</h2>
        <div className="header-actions">
          <button className="icon-btn" title="Nova conversa" onClick={() => setNewChat(newChat === null ? '' : null)}>✚</button>
          <button className="icon-btn" title="Recarregar conversas" onClick={onReload}>⟳</button>
        </div>
      </header>

      {newChat !== null && (
        <form className="new-chat" onSubmit={(e) => { e.preventDefault(); startChat() }}>
          <input
            autoFocus
            placeholder="Número com DDI e DDD, ex.: 5511999999999"
            value={newChat}
            onChange={(e) => setNewChat(e.target.value)}
          />
          <button className="btn-primary" disabled={!toChatId(newChat)}>Abrir</button>
        </form>
      )}

      <div className="search">
        <input placeholder="Pesquisar conversa" value={search} onChange={(e) => setSearch(e.target.value)}/>
      </div>

      <div className="chat-list">
        {showArchived ? (
          <button className="archived-row" onClick={() => setShowArchived(false)}>← Voltar</button>
        ) : archivedCount > 0 && !search && (
          <button className="archived-row" onClick={() => setShowArchived(true)}>
            🗄 Arquivadas <span className="muted">{archivedCount}</span>
          </button>
        )}

        {visible.map((chat) => {
          const last = lastMessage[chat.id]
          return (
            <button
              key={chat.id}
              className={`chat-item ${chat.id === selectedId ? 'active' : ''}`}
              onClick={() => onSelect(chat.id)}
            >
              <Avatar id={chat.id} name={chat.name} picture={chat.picture} isGroup={chat.isGroup}/>
              <div className="chat-item-body">
                <div className="chat-item-top">
                  <span className="chat-name">{chat.name}</span>
                  <span className={`chat-date ${chat.unreadCount ? 'unread' : ''}`}>
                    {formatChatDate(last?.timestamp || chat.timestamp)}
                  </span>
                </div>
                <div className="chat-item-bottom">
                  <span className="chat-preview">
                    {last?.fromMe && <AckIcon ack={last.ack} pending={last.pending}/>}
                    {last ? messagePreview(last) : ''}
                  </span>
                  {chat.pinned && !chat.unreadCount && <span className="muted" title="Fixada">📌</span>}
                  {chat.unreadCount > 0 && <span className="badge">{chat.unreadCount}</span>}
                </div>
              </div>
            </button>
          )
        })}

        {visible.length === 0 && <p className="empty">Nenhuma conversa encontrada</p>}
      </div>
    </aside>
  )
}

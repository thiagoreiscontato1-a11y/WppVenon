import {Fragment, useEffect, useLayoutEffect, useRef, useState} from 'react'
import type {Chat, Message} from '../types'
import {formatDaySeparator, formatTime, isSameDay, mediaLabel} from '../format'
import {Avatar} from './Avatar'
import {AckIcon} from './AckIcon'

interface Props {
  chat: Chat
  messages: Message[] | undefined
  onBack: () => void
  onSendText: (text: string) => void
  onSendFile: (file: File, caption?: string) => void
}

export function ChatWindow({chat, messages, onBack, onSendText, onSendFile}: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  // Opening another chat always starts at the bottom
  useEffect(() => {
    stickToBottom.current = true
  }, [chat.id])

  // Follow new messages unless the user scrolled up to read older ones
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages, chat.id])

  const onScroll = () => {
    const el = scroller.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  return (
    <section className="chat-window">
      <header className="chat-header">
        <button className="icon-btn back-btn" title="Voltar" onClick={onBack}>←</button>
        <Avatar id={chat.id} name={chat.name} picture={chat.picture} isGroup={chat.isGroup} size={40}/>
        <div className="chat-header-info">
          <strong>{chat.name}</strong>
          <small>{chat.isGroup ? 'Grupo' : '+' + chat.id.split('@')[0]}</small>
        </div>
      </header>

      <div className="messages" ref={scroller} onScroll={onScroll}>
        {messages === undefined && <div className="spinner center"/>}
        {messages?.length === 0 && <p className="system-note">Nenhuma mensagem carregada nesta conversa</p>}
        {messages?.map((message, i) => {
          const previous = messages[i - 1]
          const newDay = !previous || !isSameDay(previous.timestamp, message.timestamp)
          const sameSender = !newDay && previous && previous.fromMe === message.fromMe && previous.author === message.author
          return (
            <Fragment key={message.id}>
              {newDay && <div className="day-separator"><span>{formatDaySeparator(message.timestamp)}</span></div>}
              <MessageBubble message={message} showTail={!sameSender} isGroup={chat.isGroup}/>
            </Fragment>
          )
        })}
      </div>

      <Composer key={chat.id} onSendText={onSendText} onSendFile={onSendFile}/>
    </section>
  )
}

function MessageBubble({message, showTail, isGroup}: {message: Message; showTail: boolean; isGroup: boolean}) {
  const label = mediaLabel(message)
  return (
    <div className={`bubble-row ${message.fromMe ? 'out' : 'in'} ${showTail ? 'tail' : ''}`}>
      <div className="bubble">
        {isGroup && showTail && message.author && <div className="bubble-author">{message.author}</div>}
        {message.thumbnail && <img className="bubble-thumb" src={message.thumbnail} alt=""/>}
        {label && !message.thumbnail && (
          <div className="bubble-media">{label}{message.filename ? ` · ${message.filename}` : ''}</div>
        )}
        {message.body && <span className="bubble-text">{message.body}</span>}
        <span className="bubble-meta">
          {formatTime(message.timestamp)}
          {message.fromMe && <AckIcon ack={message.ack} pending={message.pending}/>}
        </span>
      </div>
    </div>
  )
}

function Composer({onSendText, onSendFile}: Pick<Props, 'onSendText' | 'onSendFile'>) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Grow with the content up to ~6 lines
  useLayoutEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [text])

  const send = () => {
    const value = text.trim()
    if (file) {
      onSendFile(file, value || undefined)
      setFile(null)
    } else if (value) {
      onSendText(value)
    } else {
      return
    }
    setText('')
    textarea.current?.focus()
  }

  return (
    <footer className="composer">
      {file && (
        <div className="file-chip">
          📎 {file.name} <small>({Math.ceil(file.size / 1024)} KB)</small>
          <button className="icon-btn" title="Remover anexo" onClick={() => setFile(null)}>✕</button>
        </div>
      )}
      <div className="composer-row">
        <button className="icon-btn" title="Anexar arquivo" onClick={() => fileInput.current?.click()}>📎</button>
        <input
          ref={fileInput}
          type="file"
          hidden
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            e.target.value = ''
            textarea.current?.focus()
          }}
        />
        <textarea
          ref={textarea}
          rows={1}
          autoFocus
          placeholder={file ? 'Legenda (opcional)' : 'Digite uma mensagem'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="send-btn" title="Enviar" onClick={send} disabled={!text.trim() && !file}>
          <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    </footer>
  )
}

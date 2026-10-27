import {useAuth} from './useAuth'
import {useWhatsapp} from './useWhatsapp'
import {LoginScreen} from './components/LoginScreen'
import {ConnectScreen} from './components/ConnectScreen'
import {Sidebar} from './components/Sidebar'
import {ChatWindow} from './components/ChatWindow'

export function App() {
  const {status, authEnabled, notice, login, logout} = useAuth()

  if (status === 'checking') {
    return <div className="connect"><div className="spinner"/></div>
  }
  if (status === 'loggedOut') {
    return <LoginScreen notice={notice} onLogin={login}/>
  }
  // Mounted only after login, so nothing talks to the API before that
  return <ChatApp onLogout={authEnabled ? logout : undefined}/>
}

function ChatApp({onLogout}: {onLogout?: () => void}) {
  const {state, selectChat, sendText, sendFile, restartSession, reloadChats, clearError} = useWhatsapp()
  const {session, online, chats, messages, lastMessage, selectedId, error} = state

  if (session?.status !== 'connected') {
    return <ConnectScreen session={session} online={online} onRestart={restartSession} onLogout={onLogout}/>
  }

  const selected = chats.find((c) => c.id === selectedId)

  return (
    <div className={`app ${selected ? 'has-selection' : ''}`}>
      {!online && <div className="banner">Conexão com a API perdida. Tentando reconectar…</div>}
      {error && (
        <div className="banner banner-error" onClick={clearError} title="Clique para fechar">
          {error} ✕
        </div>
      )}
      <Sidebar
        chats={chats}
        lastMessage={lastMessage}
        selectedId={selectedId}
        onSelect={selectChat}
        onReload={reloadChats}
        onLogout={onLogout}
      />
      {selected ? (
        <ChatWindow
          chat={selected}
          messages={messages[selected.id]}
          onBack={() => selectChat(null)}
          onSendText={(text) => sendText(selected.id, text)}
          onSendFile={(file, caption) => sendFile(selected.id, file, caption)}
        />
      ) : (
        <section className="chat-empty">
          <div>
            <h1>WppVenon</h1>
            <p>Selecione uma conversa para começar.</p>
          </div>
        </section>
      )}
    </div>
  )
}

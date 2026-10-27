import type {ReactNode} from 'react'
import type {SessionState} from '../types'

interface Props {
  session: SessionState | null
  online: boolean
  onRestart: () => void
  onLogout?: () => void
}

export function ConnectScreen({session, online, onRestart, onLogout}: Props) {
  const status = session?.status
  const canRestart = status === 'error' || status === 'disconnected'

  return (
    <div className="connect">
      <div className="connect-card">
        <div className="connect-text">
          <h1>Conectar ao WhatsApp</h1>
          <ol>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em <b>Mais opções</b> ou <b>Configurações</b> e selecione <b>Aparelhos conectados</b></li>
            <li>Toque em <b>Conectar um aparelho</b></li>
            <li>Aponte o celular para esta tela para escanear o QR code</li>
          </ol>
          {onLogout && <button className="link-btn" onClick={onLogout}>Sair</button>}
        </div>
        <div className="connect-qr">
          {!online || !session ? (
            <StatusBox title="Sem conexão com a API" text="Verifique se a API está rodando (npm start na raiz do projeto)."/>
          ) : status === 'qr' && session.qr ? (
            <img src={session.qr} alt="QR code do WhatsApp"/>
          ) : canRestart ? (
            <StatusBox
              title={status === 'error' ? 'Não foi possível iniciar a sessão' : 'Sessão desconectada'}
              text={session.detail || ''}
              action={<button className="btn-primary" onClick={onRestart}>Tentar novamente</button>}
            />
          ) : (
            <StatusBox title={status === 'connected' ? 'Conectado!' : 'Iniciando sessão…'} text={session.detail || ''} spinner/>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBox({title, text, action, spinner}: {title: string; text: string; action?: ReactNode; spinner?: boolean}) {
  return (
    <div className="status-box">
      {spinner && <div className="spinner"/>}
      <strong>{title}</strong>
      {text && <small>{text}</small>}
      {action}
    </div>
  )
}

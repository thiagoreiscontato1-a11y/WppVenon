// WhatsApp ack: -1 failed, 0 clock, 1 sent, 2 received, 3 read, 4 played

export function AckIcon({ack, pending}: {ack: number; pending?: boolean}) {
  if (ack < 0) {
    return <span className="ack ack-failed" title="Falha no envio">⚠</span>
  }
  if (pending || ack === 0) {
    return (
      <svg className="ack" viewBox="0 0 16 16" width="14" height="14" aria-label="Enviando">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    )
  }
  const read = ack >= 3
  return (
    <svg className={`ack ${read ? 'ack-read' : ''}`} viewBox="0 0 18 12" width="17" height="12"
         aria-label={read ? 'Lida' : ack === 2 ? 'Entregue' : 'Enviada'}>
      <path d="M1 6.5l3.2 3.2L10.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      {ack >= 2 && (
        <path d="M7.5 9.2l.5.5L14.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      )}
    </svg>
  )
}

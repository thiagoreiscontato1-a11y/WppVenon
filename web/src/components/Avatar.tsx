import {useState} from 'react'
import {initials} from '../format'

const COLORS = ['#25d366', '#34b7f1', '#a259ff', '#ff7a59', '#f2b134', '#ef5b8c', '#00a884', '#6c8cff']

function colorFor(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface Props {
  id: string
  name: string
  picture?: string | null
  isGroup?: boolean
  size?: number
}

export function Avatar({id, name, picture, isGroup, size = 49}: Props) {
  const [broken, setBroken] = useState(false)
  const style = {width: size, height: size, fontSize: size * 0.38}

  if (picture && !broken) {
    return <img className="avatar" style={style} src={picture} alt="" onError={() => setBroken(true)}/>
  }
  return (
    <div className="avatar avatar-initials" style={{...style, background: colorFor(id)}} aria-hidden>
      {isGroup ? '👥' : initials(name)}
    </div>
  )
}

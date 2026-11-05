
import { Shield, PartyPopper, Flame } from 'lucide-react'

interface VouchBadgeProps {
  type: string
  count: number
}

export function VouchBadge({ type, count }: VouchBadgeProps) {
  if (count === 0) return null

  const getIcon = () => {
    switch (type) {
      case 'safe': return <Shield className="w-3 h-3 text-green-600" />
      case 'fun': return <PartyPopper className="w-3 h-3 text-purple-600" />
      case 'hot': return <Flame className="w-3 h-3 text-orange-600" />
      default: return null
    }
  }

  const getLabel = () => {
    switch (type) {
        case 'safe': return 'Trustworthy'
        case 'fun': return 'Fun'
        case 'hot': return 'Hot'
        default: return type
    }
  }

  const getColor = () => {
      switch (type) {
          case 'safe': return 'bg-green-100 text-green-700 border-green-200'
          case 'fun': return 'bg-purple-100 text-purple-700 border-purple-200'
          case 'hot': return 'bg-orange-100 text-orange-700 border-orange-200'
          default: return 'bg-muted text-foreground'
      }
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getColor()}`}>
      {getIcon()}
      {count} {getLabel()}
    </span>
  )
}

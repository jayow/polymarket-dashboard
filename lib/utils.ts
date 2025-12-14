export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export function formatTimeUntil(endDate: string): string {
  try {
    const endDateObj = new Date(endDate)
    const now = new Date()
    const diffMs = endDateObj.getTime() - now.getTime()
    
    if (diffMs < 0) {
      // Already passed
      const absDiff = Math.abs(diffMs)
      const daysAgo = Math.floor(absDiff / (1000 * 60 * 60 * 24))
      const hoursAgo = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      if (daysAgo > 0) {
        return `${daysAgo}d ${hoursAgo}h ago`
      }
      if (hoursAgo > 0) {
        return `${hoursAgo}h ago`
      }
      const minutesAgo = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))
      return `${minutesAgo}m ago`
    }
    
    // Time remaining
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    if (days > 0) {
      return `${days}d ${hours}h`
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    if (seconds > 0) {
      return `${seconds}s`
    }
    
    return 'Resolving now'
  } catch {
    return 'N/A'
  }
}

export function getTimeUntilColor(endDate: string): string {
  try {
    const endDateObj = new Date(endDate)
    const now = new Date()
    const diffMs = endDateObj.getTime() - now.getTime()
    const hours = diffMs / (1000 * 60 * 60)
    const days = hours / 24
    
    if (diffMs < 0) {
      return 'text-gray-500' // Past
    }
    if (hours < 1) {
      return 'text-red-500 font-bold' // Less than 1 hour - urgent
    }
    if (hours < 6) {
      return 'text-red-400 font-semibold' // Less than 6 hours
    }
    if (days < 1) {
      return 'text-orange-400 font-semibold' // Less than 1 day
    }
    if (days < 7) {
      return 'text-red-400' // Less than 7 days
    }
    if (days < 30) {
      return 'text-yellow-400' // Less than 30 days
    }
    return 'text-green-400' // More than 30 days
  } catch {
    return 'text-gray-400'
  }
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}


export function formatCommentDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'agora'
  if (diffHour < 1) return `há ${diffMin} minuto${diffMin === 1 ? '' : 's'}`
  if (diffDay < 1) return `há ${diffHour} hora${diffHour === 1 ? '' : 's'}`
  if (diffDay < 30) return `há ${diffDay} dia${diffDay === 1 ? '' : 's'}`

  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `há ${diffMonth} mês${diffMonth === 1 ? '' : 'es'}`

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function localDayStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function classifyFollowUp(value, now = new Date()) {
  if (!value) return null
  const followUp = new Date(value)
  if (Number.isNaN(followUp.getTime())) return null
  if (followUp < now) return 'overdue'

  const today = localDayStart(now)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

  if (followUp < tomorrow) return 'today'
  if (followUp < dayAfterTomorrow) return 'tomorrow'
  return 'upcoming'
}

export function toLocalDateTimeInput(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function scheduledDate(option, now = new Date()) {
  const date = new Date(now)
  if (option === 'later') {
    date.setHours(Math.min(date.getHours() + 2, 23), Math.min(date.getMinutes(), 30), 0, 0)
  } else {
    const days = { tomorrow: 1, twoDays: 2, threeDays: 3, nextWeek: 7 }[option]
    date.setDate(date.getDate() + days)
    date.setHours(10, 0, 0, 0)
  }
  return toLocalDateTimeInput(date)
}

export function formatFollowUpParts(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: 'Not scheduled', time: '' }
  return {
    date: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date),
  }
}

import { useMemo, useState } from 'react'
import DailyFollowUpCard from '../components/DailyFollowUpCard'
import { classifyFollowUp, scheduledDate } from '../utils/followUpDates'

const tabs = ['Overdue', 'Today', 'Tomorrow', 'Upcoming', 'Completed']
const outcomes = ['Interested', 'Call Back', 'Meeting Fixed', 'Demo Given', 'Not Interested', 'No Answer', 'Owner Not Available', 'Think About It', 'Sale Closed', 'Other']
const requiresNextFollowUp = new Set(['Call Back', 'No Answer', 'Owner Not Available', 'Think About It', 'Interested'])
const scheduleOptions = [
  ['later', 'Later Today'], ['tomorrow', 'Tomorrow'], ['twoDays', '2 Days'],
  ['threeDays', '3 Days'], ['nextWeek', 'Next Week'], ['custom', 'Choose Date & Time'],
]

function FollowUps({ leads, activities, isLoading, onComplete, onReschedule, onOpenLead }) {
  const [activeTab, setActiveTab] = useState('Today')
  const [dialog, setDialog] = useState(null)
  const [outcome, setOutcome] = useState('')
  const [note, setNote] = useState('')
  const [scheduleChoice, setScheduleChoice] = useState('')
  const [customDate, setCustomDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const categorized = useMemo(() => {
    const groups = { Overdue: [], Today: [], Tomorrow: [], Upcoming: [] }
    for (const lead of leads) {
      const category = classifyFollowUp(lead.followUp)
      if (category) groups[category[0].toUpperCase() + category.slice(1)].push(lead)
    }
    for (const key of Object.keys(groups)) groups[key].sort((a, b) => a.followUp.localeCompare(b.followUp))
    return groups
  }, [leads])

  const completedItems = useMemo(() => activities
    .filter((activity) => activity.type === 'follow_up')
    .map((activity) => ({ activity, lead: leads.find((lead) => lead.id === activity.leadId) }))
    .filter((item) => item.lead), [activities, leads])

  const counts = { ...Object.fromEntries(Object.entries(categorized).map(([key, value]) => [key, value.length])), Completed: completedItems.length }
  const visibleLeads = activeTab === 'Completed' ? [] : categorized[activeTab]

  const closeDialog = () => {
    setDialog(null)
    setOutcome('')
    setNote('')
    setScheduleChoice('')
    setCustomDate('')
  }

  const resolveSchedule = () => scheduleChoice === 'custom' ? customDate : scheduleChoice ? scheduledDate(scheduleChoice) : ''

  const saveDone = async () => {
    if (!outcome || (requiresNextFollowUp.has(outcome) && !resolveSchedule())) return
    setIsSaving(true)
    const success = await onComplete(dialog.lead, outcome, note, resolveSchedule())
    setIsSaving(false)
    if (success) closeDialog()
  }

  const saveReschedule = async () => {
    const followUp = resolveSchedule()
    if (!followUp) return
    setIsSaving(true)
    const success = await onReschedule(dialog.lead, followUp)
    setIsSaving(false)
    if (success) closeDialog()
  }

  return (
    <main className="page follow-ups-page">
      <header className="simple-header"><p className="eyebrow">Daily sales plan</p><h1>Follow-ups</h1><p className="subtitle">Stay on top of every conversation.</p></header>
      <div className="follow-up-tabs" role="tablist" aria-label="Follow-up date filters">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}><span>{tab}</span><strong>{counts[tab]}</strong></button>)}
      </div>
      <section className="daily-follow-up-list" aria-label={`${activeTab} follow-ups`}>
        {isLoading && <div className="loading-leads" role="status"><span className="loading-indicator" aria-hidden="true" /><strong>Loading follow-ups…</strong></div>}
        {!isLoading && activeTab !== 'Completed' && visibleLeads.map((lead) => <DailyFollowUpCard key={lead.id} lead={lead} isOverdue={activeTab === 'Overdue'} onOpenLead={onOpenLead} onDone={(item) => setDialog({ type: 'done', lead: item })} onReschedule={(item) => setDialog({ type: 'reschedule', lead: item })} />)}
        {!isLoading && activeTab === 'Completed' && completedItems.map(({ lead, activity }) => <DailyFollowUpCard key={activity.id} lead={lead} activity={activity} onOpenLead={onOpenLead} />)}
        {!isLoading && ((activeTab !== 'Completed' && visibleLeads.length === 0) || (activeTab === 'Completed' && completedItems.length === 0)) && <div className="no-follow-ups"><span aria-hidden="true">✓</span><strong>Nothing here</strong><p>No {activeTab.toLowerCase()} follow-ups.</p></div>}
      </section>

      {dialog && (
        <div className="dialog-backdrop" role="presentation">
          <section className="follow-up-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="dialog-heading"><div><p className="eyebrow">{dialog.lead.businessName}</p><h2 id="dialog-title">{dialog.type === 'done' ? 'What happened?' : 'Reschedule follow-up'}</h2></div><button type="button" onClick={closeDialog} aria-label="Close">×</button></div>
            {dialog.type === 'done' && <><div className="outcome-grid">{outcomes.map((item) => <button key={item} type="button" className={outcome === item ? 'active' : ''} onClick={() => { setOutcome(item); setScheduleChoice('') }}>{item}</button>)}</div><label className="dialog-note">Optional note<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add details from the conversation" /></label></>}
            {(dialog.type === 'reschedule' || requiresNextFollowUp.has(outcome)) && <div className="schedule-section"><h3>{dialog.type === 'done' ? 'Schedule next follow-up' : 'Choose a new time'}</h3><div className="schedule-grid">{scheduleOptions.map(([value, label]) => <button key={value} type="button" className={scheduleChoice === value ? 'active' : ''} onClick={() => setScheduleChoice(value)}>{label}</button>)}</div>{scheduleChoice === 'custom' && <label>Follow-up date and time<input type="datetime-local" value={customDate} onChange={(event) => setCustomDate(event.target.value)} /></label>}</div>}
            <button className="dialog-save" type="button" disabled={isSaving || (dialog.type === 'done' ? !outcome || (requiresNextFollowUp.has(outcome) && !resolveSchedule()) : !resolveSchedule())} onClick={dialog.type === 'done' ? saveDone : saveReschedule}>{isSaving ? 'Saving…' : dialog.type === 'done' ? 'Save Follow-up' : 'Save New Time'}</button>
          </section>
        </div>
      )}
    </main>
  )
}

export default FollowUps

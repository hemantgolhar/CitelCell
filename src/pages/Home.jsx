import DashboardCard from '../components/DashboardCard'
import { classifyFollowUp, formatFollowUpParts } from '../utils/followUpDates'
import { formatCurrency, getPipelineSummary, getPotentialValue, getProducts, OPEN_PIPELINE_STAGES } from '../utils/pipeline'

function Home({ leads, onOpenLead, onOpenSettings, onAddLead, onOpenFollowUps }) {
  const today = leads.filter((lead) => classifyFollowUp(lead.followUp) === 'today')
  const overdue = leads.filter((lead) => classifyFollowUp(lead.followUp) === 'overdue').sort((a, b) => a.followUp.localeCompare(b.followUp))
  const pipeline = getPipelineSummary(leads)
  const metrics = [
    { label: "Today's Follow-ups", value: today.length, helper: 'Stay on track', icon: '◷', tone: 'blue' },
    { label: 'Overdue Follow-ups', value: overdue.length, helper: 'Needs attention', icon: '!', tone: 'violet' },
    { label: 'Open Pipeline', value: formatCurrency(pipeline.openValue), helper: 'Potential revenue', icon: '₹', tone: 'orange' },
    { label: 'Won This Month', value: formatCurrency(pipeline.wonThisMonth), helper: 'Great job!', icon: '✓', tone: 'green' },
  ]
  const monthKey = new Date().toISOString().slice(0, 7)
  const snapshot = [
    { label: 'New Leads', value: leads.filter((lead) => lead.createdAt?.startsWith(monthKey)).length, icon: '♟', tone: 'cyan' },
    { label: 'In Pipeline', value: pipeline.openCount, icon: '◆', tone: 'lime' },
    { label: 'Follow-ups', value: today.length, icon: '◷', tone: 'amber' },
    { label: 'Won', value: leads.filter((lead) => lead.pipelineStage === 'Won' && lead.wonAt?.startsWith(monthKey)).length, icon: '★', tone: 'pink' },
  ]
  const attention = [...overdue, ...today].slice(0, 4)
  const hot = leads.filter((lead) => OPEN_PIPELINE_STAGES.includes(lead.pipelineStage) && getPotentialValue(lead) > 0).sort((a, b) => getPotentialValue(b) - getPotentialValue(a)).slice(0, 3)

  return (
    <main className="page dashboard-page">
      <header className="page-header">
        <div className="dashboard-brand"><h1>CitelCell</h1><p className="subtitle">Today&apos;s Sales Activity</p></div>
        <button className="profile-avatar" type="button" onClick={onOpenSettings} aria-label="Open settings">⚙</button>
      </header>
      <section className="quick-actions" aria-label="Quick actions">
        <button className="scan" type="button" onClick={onAddLead}><span aria-hidden="true">▣</span><strong>Scan Card</strong><small>Capture leads</small><b aria-hidden="true">›</b></button>
        <button className="add" type="button" onClick={onAddLead}><span aria-hidden="true">＋</span><strong>Add Lead</strong><small>Manually</small><b aria-hidden="true">›</b></button>
        <button className="follow" type="button" onClick={onOpenFollowUps}><span aria-hidden="true">☎</span><strong>Quick Follow-up</strong><small>Call / WhatsApp</small><b aria-hidden="true">›</b></button>
        <button className="schedule" type="button" onClick={onOpenFollowUps}><span aria-hidden="true">▦</span><strong>Schedule</strong><small>Follow-up</small><b aria-hidden="true">›</b></button>
      </section>
      <section className="metrics-grid" aria-label="Today's sales summary">{metrics.map((metric) => <DashboardCard key={metric.label} {...metric} />)}</section>
      <section className="sales-snapshot" aria-label="Sales snapshot">
        <div className="snapshot-heading"><strong>Sales Snapshot</strong><span>This Month</span></div>
        <div className="snapshot-grid">{snapshot.map((item) => <div className={`snapshot-item ${item.tone}`} key={item.label}><span aria-hidden="true">{item.icon}</span><strong>{item.value}</strong><small>{item.label}</small></div>)}</div>
      </section>
      <section className="attention-section">
        <div className="section-heading"><div><p className="eyebrow">Priority queue</p><h2>Needs Attention</h2></div><span>{attention.length} items</span></div>
        <div className="attention-list">
          {attention.map((lead) => {
            const category = classifyFollowUp(lead.followUp)
            const parts = formatFollowUpParts(lead.followUp)
            return <button key={lead.id} type="button" onClick={() => onOpenLead(lead.id)} className={category === 'overdue' ? 'overdue' : ''}><span className="attention-marker" aria-hidden="true">{category === 'overdue' ? '!' : '◷'}</span><span><strong>{lead.businessName}</strong><small>{lead.contactName} · {getProducts(lead).join(', ')}</small></span><span className="attention-time"><strong>{parts.time}</strong><small>{category === 'overdue' ? 'Overdue' : 'Today'}</small></span></button>
          })}
          {attention.length === 0 && <div className="attention-empty"><span aria-hidden="true">✓</span><p>You&apos;re all caught up for now.</p></div>}
        </div>
      </section>
      <section className="hot-opportunities"><div className="section-heading"><div><p className="eyebrow">Highest potential</p><h2>Hot Opportunities</h2></div><span>{hot.length} leads</span></div>{hot.map((lead) => <button type="button" key={lead.id} onClick={() => onOpenLead(lead.id)}><span><strong>{lead.businessName}</strong><small>{lead.pipelineStage} · {getProducts(lead).join(', ')}</small></span><b>{formatCurrency(getPotentialValue(lead))}</b></button>)}{!hot.length && <div className="attention-empty">Add estimated deal values to see opportunities here.</div>}</section>
    </main>
  )
}

export default Home

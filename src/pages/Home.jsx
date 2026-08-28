import DashboardCard from '../components/DashboardCard'
import { classifyFollowUp, formatFollowUpParts } from '../utils/followUpDates'
import { formatCurrency, getPipelineSummary, getPotentialValue, getProducts, OPEN_PIPELINE_STAGES } from '../utils/pipeline'

function Home({ leads, onOpenLead, onOpenSettings }) {
  const today = leads.filter((lead) => classifyFollowUp(lead.followUp) === 'today')
  const overdue = leads.filter((lead) => classifyFollowUp(lead.followUp) === 'overdue').sort((a, b) => a.followUp.localeCompare(b.followUp))
  const pipeline = getPipelineSummary(leads)
  const metrics = [
    { label: "Today's Follow-ups", value: today.length, icon: '◷', tone: 'blue' },
    { label: 'Overdue Follow-ups', value: overdue.length, icon: '!', tone: 'violet' },
    { label: 'Open Pipeline', value: formatCurrency(pipeline.openValue), icon: '₹', tone: 'orange' },
    { label: 'Won This Month', value: formatCurrency(pipeline.wonThisMonth), icon: '✓', tone: 'green' },
  ]
  const attention = [...overdue, ...today].slice(0, 4)
  const hot = leads.filter((lead) => OPEN_PIPELINE_STAGES.includes(lead.pipelineStage) && getPotentialValue(lead) > 0).sort((a, b) => getPotentialValue(b) - getPotentialValue(a)).slice(0, 3)

  return (
    <main className="page dashboard-page">
      <header className="page-header">
        <div><p className="eyebrow">Your sales day</p><h1>CitelCell</h1><p className="subtitle">Today&apos;s Sales Activity</p></div>
        <button className="profile-avatar" type="button" onClick={onOpenSettings} aria-label="Open settings">⚙</button>
      </header>
      <section className="metrics-grid" aria-label="Today's sales summary">{metrics.map((metric) => <DashboardCard key={metric.label} {...metric} />)}</section>
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

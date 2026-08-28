import { formatFollowUpParts } from '../utils/followUpDates'
import { getProducts } from '../utils/pipeline'

function DailyFollowUpCard({ lead, activity, isOverdue, onOpenLead, onDone, onReschedule }) {
  const dateValue = activity?.createdAt || lead.followUp
  const parts = formatFollowUpParts(dateValue)
  const note = activity?.note || lead.followUpNote || lead.notes || 'No note added.'
  const phoneDigits = lead.phone.replace(/\D/g, '')

  return (
    <article className={`daily-follow-up-card${isOverdue ? ' overdue' : ''}${activity ? ' completed' : ''}`}>
      {isOverdue && <div className="overdue-label">Overdue</div>}
      <div className="daily-follow-up-heading">
        <div>
          <button type="button" onClick={() => onOpenLead(lead.id)}>{lead.businessName}</button>
          <p>{lead.contactName}</p>
        </div>
        <span className={`lead-status status-${lead.status.toLowerCase()}`}>{lead.status}</span>
      </div>
      <div className="daily-follow-up-info">
        <div><span>Products</span><strong>{getProducts(lead).join(', ')}</strong></div>
        <div><span>Phone</span><strong>{lead.phone}</strong></div>
        <div><span>{activity ? 'Completed' : 'Follow-up date'}</span><strong>{parts.date}</strong></div>
        <div><span>Time</span><strong>{parts.time}</strong></div>
      </div>
      {activity && <div className="completed-outcome"><span>Outcome</span><strong>{activity.outcome}</strong></div>}
      <div className="last-note"><span>Last note</span><p>{note}</p></div>
      {!activity && (
        <div className="follow-up-actions">
          <a href={`tel:${lead.phone}`}>☎ <span>Call</span></a>
          <a className="whatsapp" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">◉ <span>WhatsApp</span></a>
          <button className="done" type="button" onClick={() => onDone(lead)}>✓ <span>Done</span></button>
          <button type="button" onClick={() => onReschedule(lead)}>◷ <span>Reschedule</span></button>
        </div>
      )}
    </article>
  )
}

export default DailyFollowUpCard

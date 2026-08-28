import { formatFollowUp } from '../utils/formatters'
import { getProducts } from '../utils/pipeline'

function LeadCard({ lead, onOpen }) {
  const initials = lead.businessName.split(' ').map((word) => word[0]).slice(0, 2).join('')

  return (
    <button className="lead-card" type="button" onClick={onOpen}>
      <span className="lead-avatar" aria-hidden="true">{initials}</span>
      <span className="lead-card-content">
        <span className="lead-card-heading">
          <strong>{lead.businessName}</strong>
          <span className={`lead-status status-${lead.status.toLowerCase()}`}>{lead.status}</span>
        </span>
        <span className="lead-contact">{lead.contactName} · {getProducts(lead).join(', ')}</span>
        <span className="lead-meta"><span>☎ {lead.phone}</span><span>◷ {formatFollowUp(lead.followUp)}</span></span>
      </span>
      <span className="lead-chevron" aria-hidden="true">›</span>
    </button>
  )
}

export default LeadCard

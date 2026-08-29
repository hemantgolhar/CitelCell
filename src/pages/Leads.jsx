import { useMemo, useState } from 'react'
import LeadCard from '../components/LeadCard'
import LeadForm from '../components/LeadForm'
import FollowUpAssistant from '../components/FollowUpAssistant'
import DealClosingForm from '../components/DealClosingForm'
import CustomerSaleDetails from '../components/CustomerSaleDetails'
import { formatFollowUp } from '../utils/formatters'
import { formatCurrency, getPotentialValue, getProducts, PIPELINE_STAGES, PRODUCT_OPTIONS } from '../utils/pipeline'

const filters = ['All', 'New', 'Warm', 'Hot', 'Won']

function Leads({ leads, activities, isLoading, view, selectedLeadId, onViewChange, onSelectLead, onSaveLead, onSaveClosing, onDeleteLead }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [stageFilter, setStageFilter] = useState('All')
  const [productFilter, setProductFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId)
  const filteredLeads = useMemo(() => {
    const search = query.trim().toLowerCase()
    return leads.filter((lead) => (filter === 'All' || lead.status === filter)
      && (stageFilter === 'All' || lead.pipelineStage === stageFilter)
      && (productFilter === 'All' || getProducts(lead).includes(productFilter))
      && (categoryFilter === 'All' || lead.category === categoryFilter)
      && (!search || [lead.businessName, lead.contactName, lead.phone, lead.secondaryPhone, lead.email, lead.category, lead.address, lead.pipelineStage, lead.lostReason, lead.notes, ...getProducts(lead)].some((value) => (value || '').toLowerCase().includes(search))))
  }, [categoryFilter, filter, leads, productFilter, query, stageFilter])

  if (view === 'add') return <LeadForm onSave={onSaveLead} onCancel={() => onViewChange('list')} />
  if (view === 'edit' && selectedLead) return <LeadForm lead={selectedLead} onSave={onSaveLead} onCancel={() => onViewChange('detail')} />
  if (view === 'closing' && selectedLead) return <DealClosingForm lead={selectedLead} onSave={(details) => onSaveClosing(selectedLead, details)} onCancel={() => onViewChange('detail')} />

  if (view === 'detail' && selectedLead) {
    const websiteUrl = selectedLead.website && /^https?:\/\//i.test(selectedLead.website) ? selectedLead.website : selectedLead.website ? `https://${selectedLead.website}` : ''
    const leadActivities = [
      ...activities.filter((activity) => activity.leadId === selectedLead.id),
      { id: `created-${selectedLead.id}`, leadId: selectedLead.id, type: 'lead_created', outcome: '', note: '', createdAt: selectedLead.createdAt },
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return (
      <main className="page lead-detail-page">
        <header className="form-header"><button className="back-button" type="button" onClick={() => onViewChange('list')} aria-label="Back to leads">‹</button><div><p className="eyebrow">Lead details</p><h1>{selectedLead.businessName}</h1></div></header>
        <button className="deal-top-action" type="button" onClick={() => onViewChange('closing')}><span aria-hidden="true">✓</span><span><strong>{selectedLead.closingDetails ? 'Edit Customer Details' : selectedLead.pipelineStage === 'Won' ? 'Add Customer Details' : 'Close Deal'}</strong><small>{selectedLead.closingDetails ? 'Update this saved customer and sale record' : 'Capture customer, payment and fulfilment details'}</small></span><b aria-hidden="true">›</b></button>
        <section className="detail-card">
          <div className="detail-identity"><span className="lead-avatar large" aria-hidden="true">{selectedLead.businessName.slice(0, 2).toUpperCase()}</span><div><h2>{selectedLead.contactName}</h2><p>{selectedLead.designation || getProducts(selectedLead).join(', ')}</p></div><span className="pipeline-stage-badge">{selectedLead.pipelineStage}</span></div>
          <dl className="detail-list">
            <div><dt>Mobile Number</dt><dd><a href={`tel:${selectedLead.phone}`}>{selectedLead.phone}</a></dd></div>
            {selectedLead.secondaryPhone && <div><dt>Secondary Number</dt><dd><a href={`tel:${selectedLead.secondaryPhone}`}>{selectedLead.secondaryPhone}</a></dd></div>}
            {selectedLead.email && <div><dt>Email</dt><dd><a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a></dd></div>}
            {selectedLead.website && <div><dt>Website</dt><dd><a href={websiteUrl} target="_blank" rel="noreferrer">{selectedLead.website}</a></dd></div>}
            {selectedLead.category && <div><dt>Business Category</dt><dd>{selectedLead.category}</dd></div>}
            {selectedLead.address && <div><dt>Address</dt><dd>{selectedLead.address}<a className="maps-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLead.address)}`} target="_blank" rel="noreferrer">Open in Maps</a></dd></div>}
            <div><dt>Pipeline Stage</dt><dd>{selectedLead.pipelineStage}</dd></div><div><dt>Lead Source</dt><dd>{selectedLead.source}</dd></div><div><dt>Next Follow-up</dt><dd>{formatFollowUp(selectedLead.followUp)}</dd></div><div><dt>Notes</dt><dd>{selectedLead.notes || 'No notes added.'}</dd></div>
          </dl>
          <section className="opportunity-detail"><h2>Sales Opportunity</h2>{getProducts(selectedLead).map((product) => { const sold = selectedLead.soldProducts.find((item) => item.product === product); const state = selectedLead.pipelineStage === 'Won' ? sold ? 'SOLD' : 'NOT SOLD' : 'OPEN'; return <article key={product}><div><strong>{product}</strong><span className={`sale-state ${state.toLowerCase().replace(' ', '-')}`}>{state}</span></div><p><span>{sold ? 'Final value' : 'Estimated value'}</span><b>{formatCurrency(sold ? sold.amount : selectedLead.productDeals[product])}</b></p></article> })}<div className="opportunity-total"><span>{selectedLead.pipelineStage === 'Won' ? 'Final Sale Value' : 'Total Potential'}</span><strong>{formatCurrency(selectedLead.pipelineStage === 'Won' ? selectedLead.finalSaleValue : getPotentialValue(selectedLead))}</strong></div>{selectedLead.pipelineStage === 'Lost' && <p className="lost-detail"><strong>Lost reason:</strong> {selectedLead.lostReason}{selectedLead.lostNote ? ` — ${selectedLead.lostNote}` : ''}</p>}</section>
          {selectedLead.closingDetails && <CustomerSaleDetails details={selectedLead.closingDetails} />}
          <FollowUpAssistant key={selectedLead.id} lead={selectedLead} activities={leadActivities} />
          <section className="activity-history"><h2>Activity History</h2><div>{leadActivities.map((activity) => { const title = activity.type === 'lead_created' ? 'Lead Created' : activity.type === 'stage_change' ? `Stage changed to ${activity.toStage}` : activity.type === 'sale_won' ? `Sale Won — ${formatCurrency(activity.finalSaleValue)}` : activity.type === 'sale_closed' ? 'Sale Closed' : activity.type === 'sale_lost' ? `Sale Lost — ${activity.outcome}` : `${activity.type === 'follow_up' ? 'Follow-up' : 'Call'} — ${activity.outcome}`; return <article key={activity.id}><span className={`activity-dot ${activity.type}`} aria-hidden="true" /><div><strong>{title}</strong><time>{formatFollowUp(activity.createdAt)}</time>{activity.note && <p>&ldquo;{activity.note}&rdquo;</p>}</div></article> })}</div></section>
          <div className="contact-actions"><a className="primary-button" href={`tel:${selectedLead.phone.replace(/\s/g, '')}`}>☎ Call Lead</a><a className="whatsapp-detail-button" href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">◉ WhatsApp</a></div>
          <div className="record-actions"><button type="button" onClick={() => onViewChange('edit')}>Edit lead</button><button className="delete-button" type="button" onClick={() => onDeleteLead(selectedLead.id)}>Delete</button></div>
        </section>
      </main>
    )
  }

  return (
    <main className="page leads-page">
      <header className="leads-header"><div><p className="eyebrow">Lead management</p><h1>Leads</h1></div><span className="lead-count">{isLoading ? '…' : leads.length}</span></header>
      <label className="search-box"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads" aria-label="Search leads" /></label>
      <div className="filter-tabs" role="group" aria-label="Filter leads by status">{filters.map((item) => <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="advanced-filters"><select aria-label="Filter by pipeline stage" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option>All</option>{PIPELINE_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select><select aria-label="Filter by product" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option>All</option>{PRODUCT_OPTIONS.map((product) => <option key={product}>{product}</option>)}</select><select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All</option>{[...new Set(leads.map((lead) => lead.category).filter(Boolean))].sort().map((category) => <option key={category}>{category}</option>)}</select></div>
      <div className="leads-summary"><strong>{isLoading ? 'Loading leads' : `${filteredLeads.length} leads`}</strong><span>{isLoading ? 'Please wait' : 'Tap a lead to view details'}</span></div>
      <section className="lead-list" aria-label="Lead list">
        {isLoading ? <div className="loading-leads" role="status"><span className="loading-indicator" aria-hidden="true" /><strong>Loading your leads…</strong><p>Reading saved data from this device.</p></div> : filteredLeads.map((lead) => <LeadCard key={lead.id} lead={lead} onOpen={() => { onSelectLead(lead.id); onViewChange('detail') }} />)}
        {!isLoading && filteredLeads.length === 0 && <div className="no-results"><span aria-hidden="true">⌕</span><strong>No leads found</strong><p>Try another search or filter.</p></div>}
      </section>
    </main>
  )
}

export default Leads

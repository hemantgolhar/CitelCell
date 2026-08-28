import { useMemo, useState } from 'react'
import { formatCurrency, getPipelineSummary, getPotentialValue, getProducts, PIPELINE_STAGES, stageBreakdown } from '../utils/pipeline'

const lostReasons = ['Price too high', 'Chose competitor', 'No response', 'Not ready', 'No requirement', 'Other']

function Pipeline({ leads, isLoading, onMoveStage, onMarkWon, onMarkLost, onOpenLead }) {
  const [activeStage, setActiveStage] = useState('New Lead')
  const [dialog, setDialog] = useState(null)
  const [targetStage, setTargetStage] = useState('')
  const [sold, setSold] = useState({})
  const [note, setNote] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [saving, setSaving] = useState(false)
  const summary = useMemo(() => getPipelineSummary(leads), [leads])
  const breakdown = useMemo(() => stageBreakdown(leads), [leads])
  const visible = leads.filter((lead) => lead.pipelineStage === activeStage)
  const close = () => { setDialog(null); setTargetStage(''); setSold({}); setNote(''); setLostReason('') }
  const chooseMove = (lead) => { setDialog({ type: 'move', lead }); setTargetStage(lead.pipelineStage) }
  const continueMove = async () => {
    if (!targetStage || targetStage === dialog.lead.pipelineStage) return
    if (targetStage === 'Won') { setSold(Object.fromEntries(getProducts(dialog.lead).map((product) => [product, { checked: true, amount: dialog.lead.productDeals?.[product] || '' }]))); setDialog({ type: 'won', lead: dialog.lead }); return }
    if (targetStage === 'Lost') { setDialog({ type: 'lost', lead: dialog.lead }); return }
    setSaving(true); const ok = await onMoveStage(dialog.lead, targetStage); setSaving(false); if (ok) { setActiveStage(targetStage); close() }
  }
  const saveWon = async () => { const products = Object.entries(sold).filter(([, value]) => value.checked).map(([product, value]) => ({ product, amount: Number(value.amount) || 0 })); if (!products.length) return; setSaving(true); const ok = await onMarkWon(dialog.lead, products, note); setSaving(false); if (ok) { setActiveStage('Won'); close() } }
  const saveLost = async () => { if (!lostReason) return; setSaving(true); const ok = await onMarkLost(dialog.lead, lostReason, note); setSaving(false); if (ok) { setActiveStage('Lost'); close() } }
  const wonTotal = Object.values(sold).filter((value) => value.checked).reduce((total, value) => total + (Number(value.amount) || 0), 0)

  return <main className="page pipeline-page">
    <header className="simple-header"><p className="eyebrow">Sales opportunities</p><h1>Pipeline</h1><p className="subtitle">Move every opportunity toward a decision.</p></header>
    <section className="pipeline-summary"><article><span>Open Pipeline</span><strong>{formatCurrency(summary.openValue)}</strong></article><article><span>Won This Month</span><strong>{formatCurrency(summary.wonThisMonth)}</strong></article><article><span>Open Opportunities</span><strong>{summary.openCount}</strong></article><article><span>Conversion Rate</span><strong>{summary.conversionRate}%</strong></article></section>
    <div className="pipeline-tabs" role="tablist" aria-label="Pipeline stages">{PIPELINE_STAGES.map((stage) => <button type="button" role="tab" aria-selected={stage === activeStage} className={stage === activeStage ? 'active' : ''} key={stage} onClick={() => setActiveStage(stage)}><span>{stage}</span><small>{breakdown[stage].count} · {formatCurrency(breakdown[stage].value)}</small></button>)}</div>
    <section className="pipeline-list">{isLoading ? <div className="loading-leads"><span className="loading-indicator" /><strong>Loading pipeline…</strong></div> : visible.map((lead) => <article className="pipeline-card" key={lead.id}><div className="pipeline-card-heading"><div><h2>{lead.businessName}</h2><p>{lead.contactName}</p></div><strong>{formatCurrency(activeStage === 'Won' ? lead.finalSaleValue : getPotentialValue(lead))}</strong></div><div className="product-chips">{getProducts(lead).map((product) => <span key={product}>{product}</span>)}</div><div className="pipeline-actions"><a href={`tel:${lead.phone}`}>☎ Call</a><a className="whatsapp" href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">◉ WhatsApp</a><button type="button" onClick={() => chooseMove(lead)}>⇄ Move</button><button type="button" onClick={() => onOpenLead(lead.id)}>Open ›</button></div></article>)}{!isLoading && !visible.length && <div className="no-results"><span>▥</span><strong>No opportunities here</strong><p>Move a lead into this stage when it is ready.</p></div>}</section>
    {dialog && <div className="dialog-backdrop"><section className="follow-up-dialog pipeline-dialog" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">{dialog.lead.businessName}</p><h2>{dialog.type === 'move' ? 'Move opportunity' : dialog.type === 'won' ? 'Confirm sale won' : 'Mark opportunity lost'}</h2></div><button type="button" onClick={close}>×</button></div>
      {dialog.type === 'move' && <><label className="dialog-field">New stage<select value={targetStage} onChange={(event) => setTargetStage(event.target.value)}>{PIPELINE_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></label><button className="dialog-save" disabled={saving || targetStage === dialog.lead.pipelineStage} type="button" onClick={continueMove}>Continue</button></>}
      {dialog.type === 'won' && <><p className="dialog-help">Select products sold and enter the final sale amount.</p><div className="sold-products">{getProducts(dialog.lead).map((product) => <label key={product} className={sold[product]?.checked ? 'selected' : ''}><input type="checkbox" checked={Boolean(sold[product]?.checked)} onChange={(event) => setSold((current) => ({ ...current, [product]: { ...current[product], checked: event.target.checked } }))} /><span>{product}</span><div>₹ <input type="number" min="0" inputMode="numeric" value={sold[product]?.amount ?? ''} disabled={!sold[product]?.checked} onChange={(event) => setSold((current) => ({ ...current, [product]: { ...current[product], amount: event.target.value } }))} /></div></label>)}</div><div className="won-total"><span>Final Sale Value</span><strong>{formatCurrency(wonTotal)}</strong></div><label className="dialog-note">Sale note<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="dialog-save won" disabled={saving || !Object.values(sold).some((item) => item.checked)} type="button" onClick={saveWon}>{saving ? 'Saving…' : 'Confirm Won'}</button></>}
      {dialog.type === 'lost' && <><label className="dialog-field">Reason <span>*</span><select value={lostReason} onChange={(event) => setLostReason(event.target.value)}><option value="">Select reason</option>{lostReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label><label className="dialog-note">Optional note<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="dialog-save lost" disabled={saving || !lostReason} type="button" onClick={saveLost}>{saving ? 'Saving…' : 'Confirm Lost'}</button></>}
    </section></div>}
  </main>
}

export default Pipeline

import { useState } from 'react'
import { analyzeSalesStatement } from '../services/salesCoach'
import { getProducts } from '../utils/pipeline'

const languages = ['Auto', 'Marathi', 'Hindi', 'English']
const quickObjections = [
  ['PRICE', 'Price'], ['THINK_ABOUT_IT', 'Think About It'], ['NO_NEED', 'No Need'],
  ['OWNER_UNAVAILABLE', 'Owner Unavailable'], ['CALL_LATER', 'Call Later'], ['SEND_DETAILS', 'Send Details'],
]

function SalesCoach({ lead, onBack }) {
  const [statement, setStatement] = useState('')
  const [responseLanguage, setResponseLanguage] = useState('Auto')
  const [result, setResult] = useState(null)
  const products = getProducts(lead)

  const analyze = (objectionType = '') => {
    if (!statement.trim() && !objectionType) return
    setResult(analyzeSalesStatement(statement, { lead, responseLanguage, objectionType }))
  }

  const handleQuickObjection = (objectionType, label) => {
    setStatement(label)
    setResult(analyzeSalesStatement(label, { lead, responseLanguage, objectionType }))
  }

  return <main className="page sales-coach-page">
    <header className="form-header"><button className="back-button" type="button" onClick={onBack} aria-label="Back to lead details">‹</button><div><p className="eyebrow">Live conversation support</p><h1>Sales Coach</h1></div></header>

    <section className="coach-intro">
      <span aria-hidden="true">SC</span>
      <div><strong>{lead.contactName || lead.businessName || 'Current lead'}</strong><small>{[products.join(', '), lead.pipelineStage].filter(Boolean).join(' · ')}</small></div>
      <b>Offline</b>
    </section>

    <section className="coach-input-card">
      <div className="coach-card-heading"><div><p>Sales Coach</p><h2>What did the customer say?</h2></div><label>Response language<select value={responseLanguage} onChange={(event) => { setResponseLanguage(event.target.value); setResult(null) }}>{languages.map((language) => <option key={language}>{language}</option>)}</select></label></div>
      <label className="coach-statement">Customer said:<textarea rows="5" value={statement} onChange={(event) => { setStatement(event.target.value); setResult(null) }} placeholder="Type the customer's exact words…" /></label>
      <button className="coach-analyze" type="button" disabled={!statement.trim()} onClick={() => analyze()}>Analyze</button>
      <div className="coach-quick"><span>Quick objections</span><div>{quickObjections.map(([type, label]) => <button key={type} type="button" onClick={() => handleQuickObjection(type, label)}>{label}</button>)}</div></div>
    </section>

    {result && <section className="coach-result" aria-live="polite">
      <div className="coach-detected"><div><span>Detected objection</span><h2>{result.objectionType.replaceAll('_', ' ')}</h2></div><div><b className={`confidence-${result.confidence.toLowerCase()}`}>{result.confidence}</b><small>{result.responseLanguage}</small></div></div>
      <article className="coach-response"><span>Suggested response</span><p>{result.suggestedResponse}</p></article>
      <article className="coach-next"><span>Ask next</span><p>{result.nextQuestion}</p></article>
      <div className="coach-guidance"><article><span>Goal</span><p>{result.goal}</p></article><article><span>Avoid</span><p>{result.avoid}</p></article></div>
      <article className="coach-action"><span>Next action</span><strong>{result.recommendedAction}</strong></article>
    </section>}

    {!result && <section className="coach-empty"><span aria-hidden="true">◎</span><strong>Ready when you are</strong><p>Type the customer’s words or choose a quick objection for short, practical coaching.</p></section>}
    <p className="coach-safety">Suggestions only. Nothing is contacted, sent, recorded, scheduled, or changed automatically.</p>
  </main>
}

export default SalesCoach

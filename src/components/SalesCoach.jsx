import { useState } from 'react'
import { analyzeSalesStatement } from '../services/salesCoach'
import { analyzeSalesBrain } from '../services/salesBrain'
import { getProducts } from '../utils/pipeline'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const languages = ['Auto', 'Marathi', 'Hindi', 'English']
const recognitionLanguages = ['Auto / Mixed', 'Marathi', 'Hindi', 'English']
const quickObjections = [
  ['PRICE', 'Price'], ['THINK_ABOUT_IT', 'Think About It'], ['NO_NEED', 'No Need'],
  ['OWNER_UNAVAILABLE', 'Owner Unavailable'], ['CALL_LATER', 'Call Later'], ['SEND_DETAILS', 'Send Details'],
]

function SalesCoach({ lead, onBack }) {
  const [statement, setStatement] = useState('')
  const [responseLanguage, setResponseLanguage] = useState('Auto')
  const [recognitionLanguage, setRecognitionLanguage] = useState('Auto / Mixed')
  const [result, setResult] = useState(null)
  const [brain, setBrain] = useState(null)
  const products = getProducts(lead)

  const runCoach = (text, objectionType = '') => {
    const coaching = analyzeSalesStatement(text, { lead, responseLanguage, objectionType })
    setResult(coaching)
    setBrain(analyzeSalesBrain(text, { lead, objection: coaching, responseLanguage }))
  }

  const handleRecognizedSpeech = (text) => {
    const transcript = `${statement.trim()} ${text}`.trim().slice(-1200)
    setStatement(transcript)
    runCoach(transcript)
  }

  const speech = useSpeechRecognition({ language: recognitionLanguage, onFinalTranscript: handleRecognizedSpeech })

  const analyze = (objectionType = '') => {
    if (!statement.trim() && !objectionType) return
    runCoach(statement, objectionType)
  }

  const handleQuickObjection = (objectionType, label) => {
    setStatement(label)
    runCoach(label, objectionType)
  }

  return <main className="page sales-coach-page">
    <header className="form-header"><button className="back-button" type="button" onClick={onBack} aria-label="Back to lead details">‹</button><div><p className="eyebrow">Live conversation support</p><h1>Sales Coach</h1></div></header>

    <section className="coach-intro">
      <span aria-hidden="true">SC</span>
      <div><strong>{lead.contactName || lead.businessName || 'Current lead'}</strong><small>{[products.join(', '), lead.pipelineStage].filter(Boolean).join(' · ')}</small></div>
      <b>Offline</b>
    </section>

    <section className="coach-input-card">
      <div className="coach-card-heading"><div><p>Sales Coach</p><h2>What did the customer say?</h2></div><label>Response language<select value={responseLanguage} onChange={(event) => { setResponseLanguage(event.target.value); setResult(null); setBrain(null) }}>{languages.map((language) => <option key={language}>{language}</option>)}</select></label></div>
      <label className="coach-statement">Customer said:<textarea rows="5" value={statement} onChange={(event) => { setStatement(event.target.value); setResult(null); setBrain(null) }} placeholder="Type the customer's exact words…" /></label>
      <div className="coach-microphone">
        <div className="coach-mic-settings"><label>Recognition language<select value={recognitionLanguage} disabled={speech.active} onChange={(event) => setRecognitionLanguage(event.target.value)}>{recognitionLanguages.map((language) => <option key={language}>{language}</option>)}</select></label><div className={speech.active ? 'listening' : ''}><span aria-hidden="true">●</span><strong>{speech.status}</strong></div></div>
        {speech.interimTranscript && <div className="coach-interim"><span>Hearing now</span><p>{speech.interimTranscript}</p></div>}
        {speech.error && <p className="coach-mic-error" role="alert">{speech.error}</p>}
        {!speech.supported && <p className="coach-mic-unsupported">Speech recognition is not supported in this browser. Manual input and quick objections still work.</p>}
        <button className={speech.active ? 'coach-listen stop' : 'coach-listen'} type="button" disabled={!speech.supported} onClick={speech.active ? speech.stopListening : speech.startListening}>{speech.active ? '■ Stop Listening' : '🎙 Start Listening'}</button>
        <small>Auto / Mixed uses your browser or device recognition language ({speech.recognitionLanguageCode}). Browser-native recognition can understand some mixed speech, but it cannot guarantee perfect automatic multilingual detection.</small>
      </div>
      <button className="coach-analyze" type="button" disabled={!statement.trim()} onClick={() => analyze()}>Analyze</button>
      <div className="coach-quick"><span>Quick objections</span><div>{quickObjections.map(([type, label]) => <button key={type} type="button" onClick={() => handleQuickObjection(type, label)}>{label}</button>)}</div></div>
    </section>

    {result && brain && <section className="coach-result coach-brain" aria-live="polite">
      <div className="brain-title"><div><span>Sales Brain</span><strong>{brain.product}</strong></div>{brain.buyingSignal === 'Strong' && <b>🔥 BUYING SIGNAL</b>}</div>
      <div className="brain-summary"><div><span>Conversation Stage</span><strong>{brain.stage.replaceAll('_', ' ')}</strong></div><div><span>Customer Signal</span><strong>{brain.customerSignal}</strong></div><div><span>Technique</span><strong>{brain.technique}</strong></div></div>
      {brain.warning && <div className="brain-warning">⚠ {brain.warning}</div>}
      <article className="brain-best"><span>Best move</span><p>{brain.bestMove}</p></article>
      <article className="coach-next"><span>Ask next</span><p>{brain.askNext}</p></article>
      <div className="coach-guidance"><article><span>Why</span><p>{brain.why}</p></article><article><span>Avoid</span><p>{brain.avoid}</p></article></div>
      <article className="coach-action"><span>Next action</span><strong>{brain.nextAction}</strong></article>
      {brain.decisionMaker === 'Not Reached' && <div className="brain-decision"><span>Decision Maker</span><strong>Not Reached</strong></div>}
      <details className="brain-objection"><summary>Objection coaching</summary>
      <div className="coach-detected"><div><span>Detected objection</span><h2>{result.objectionType.replaceAll('_', ' ')}</h2></div><div><b className={`confidence-${result.confidence.toLowerCase()}`}>{result.confidence}</b><small>{result.responseLanguage}</small></div></div>
      <article className="coach-response"><span>Suggested response</span><p>{result.suggestedResponse}</p></article>
      </details>
    </section>}

    {!result && <section className="coach-empty"><span aria-hidden="true">◎</span><strong>Ready when you are</strong><p>Type the customer’s words or choose a quick objection for short, practical coaching.</p></section>}
    <p className="coach-privacy">Live coaching only. CitelCell does not intentionally save audio.</p>
    <p className="coach-safety">Suggestions only. No transcript is saved to CitelCell, and nothing is contacted, sent, scheduled, or changed automatically.</p>
  </main>
}

export default SalesCoach

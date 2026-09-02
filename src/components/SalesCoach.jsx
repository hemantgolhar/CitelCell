import { useEffect, useRef, useState } from 'react'
import { analyzeSalesStatement } from '../services/salesCoach'
import { analyzeSalesBrain } from '../services/salesBrain'
import { getProducts } from '../utils/pipeline'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { classifySalesIntent, classifySalesIntentFallback, getSemanticModelStatus } from '../services/semanticSalesClassifier'
import { createEarCoachSession, generateEarCue, getEarCoachTestCue, isEarCoachSupported } from '../services/earCoach'

const languages = ['Auto', 'Natural Mixed', 'Marathi', 'Hindi', 'English']
const coachStyles = ['Balanced', 'Consultative', 'Confident', 'Challenger', 'Friendly']
const earLanguages = ['Auto', 'English', 'Hindi', 'Marathi']
const speechRates = ['Slow', 'Normal', 'Fast']
const recognitionLanguages = ['Auto / Mixed', 'Marathi', 'Hindi', 'English']
const standaloneProducts = ['General', 'Aura Smart Business Card', 'Google Review Card', 'Smart Menu', 'Citeltech POS', 'Citelflow.ai']
const quickObjections = [
  ['PRICE', 'Price'], ['THINK_ABOUT_IT', 'Think About It'], ['NO_NEED', 'No Need'],
  ['OWNER_UNAVAILABLE', 'Owner Unavailable'], ['CALL_LATER', 'Call Later'], ['SEND_DETAILS', 'Send Details'],
]

function SalesCoach({ lead = {}, onBack }) {
  const [statement, setStatement] = useState('')
  const [responseLanguage, setResponseLanguage] = useState('Auto')
  const [coachStyle, setCoachStyle] = useState('Balanced')
  const [recognitionLanguage, setRecognitionLanguage] = useState('Auto / Mixed')
  const [result, setResult] = useState(null)
  const [brain, setBrain] = useState(null)
  const [turns, setTurns] = useState([])
  const [sessionActive, setSessionActive] = useState(true)
  const [semanticStatus, setSemanticStatus] = useState('idle')
  const [earEnabled, setEarEnabled] = useState(false)
  const [earMuted, setEarMuted] = useState(false)
  const [earLanguage, setEarLanguage] = useState('Auto')
  const [earRate, setEarRate] = useState('Normal')
  const [earStatus, setEarStatus] = useState(() => isEarCoachSupported() ? 'Off' : 'Unsupported')
  const [earCue, setEarCue] = useState(null)
  const [isEarCoachSpeaking, setIsEarCoachSpeaking] = useState(false)
  const [earSession] = useState(() => createEarCoachSession({ cooldownMs: 2500 }))
  const turnsRef = useRef([])
  const brainRef = useRef(null)
  const analysisSequenceRef = useRef(0)
  const interimTimerRef = useRef(null)
  const runCoachRef = useRef(null)
  const earSpeakingRef = useRef(false)
  const ignoreRecognitionRef = useRef(false)
  const feedbackTimerRef = useRef(null)
  const leadProducts = getProducts(lead)
  const [selectedProduct, setSelectedProduct] = useState(leadProducts[0] || 'General')
  const hasLead = Boolean(lead.id)
  const effectiveLead = hasLead || selectedProduct === 'General' ? lead : { productsInterested: [selectedProduct] }
  const products = getProducts(effectiveLead)

  const signalStrength = (value) => ({ None: 0, Weak: 1, Medium: 2, Strong: 3 }[value] || 0)

  const shouldShowInterim = (nextBrain) => {
    const current = brainRef.current
    if (!current) return true
    const currentIntent = current.semanticIntents?.[0]?.intent || current.detectedIntent
    const nextIntent = nextBrain.semanticIntents?.[0]?.intent || nextBrain.detectedIntent
    return currentIntent !== nextIntent
      || signalStrength(nextBrain.buyingSignal) > signalStrength(current.buyingSignal)
      || (nextBrain.semanticConfidence || 0) >= (current.semanticConfidence || 0) + 0.12
  }

  const showCoaching = (coaching, nextBrain, final) => {
    if (!final && !shouldShowInterim(nextBrain)) return
    brainRef.current = nextBrain
    setResult(coaching)
    setBrain(nextBrain)
  }

  const updateTurns = (nextTurns) => {
    const bounded = nextTurns.slice(-12)
    turnsRef.current = bounded
    setTurns(bounded)
    return bounded
  }

  const finishEarSpeech = () => {
    earSpeakingRef.current = false
    ignoreRecognitionRef.current = true
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => { ignoreRecognitionRef.current = false }, 700)
    setIsEarCoachSpeaking(false)
    setEarStatus(earMuted ? 'Muted' : earEnabled ? 'Ready' : 'Off')
  }

  const deliverEarCue = (nextBrain, turnId, transcript, speak = true) => {
    const primaryIntent = nextBrain.semanticIntents?.[0]?.intent || nextBrain.detectedIntent.split(' + ')[0] || 'GENERAL'
    const cue = generateEarCue({ primaryIntent, rankedIntents: nextBrain.semanticIntents, technique: nextBrain.technique, stage: nextBrain.stage, buyingSignal: nextBrain.buyingSignal, product: nextBrain.product, recentTurns: turnsRef.current, closingMove: nextBrain.closingMove, responseLanguage: nextBrain.responseLanguage, earLanguage })
    setEarCue(cue)
    if (!speak) return
    earSession.speak({
      turnId, transcript, cue, language: earLanguage, rate: earRate, enabled: earEnabled, muted: earMuted,
      onStart: () => { earSpeakingRef.current = true; setIsEarCoachSpeaking(true); setEarStatus('Speaking') },
      onEnd: finishEarSpeech,
    })
  }

  const runCoach = (text, objectionType = '', { final = false } = {}) => {
    const cleanText = text.trim()
    if (!cleanText) return
    const sequence = ++analysisSequenceRef.current
    const coaching = analyzeSalesStatement(text, { lead: effectiveLead, responseLanguage, objectionType })
    const fallbackIntents = classifySalesIntentFallback(cleanText)
    const turnId = final ? `customer-turn-${sequence}` : ''
    const recentTurns = final
      ? updateTurns([...turnsRef.current, { id: turnId, speaker: 'customer', text: cleanText, timestamp: sequence, final: true, intents: fallbackIntents, objection: coaching.objectionType, buyingSignal: 'None' }])
      : turnsRef.current
    const fallbackBrain = analyzeSalesBrain(cleanText, { lead: effectiveLead, objection: coaching, responseLanguage, coachStyle, semanticIntents: fallbackIntents, context: { latestTurn: recentTurns.at(-1), recentTurns } })
    if (final && turnId) updateTurns(recentTurns.map((turn) => turn.id === turnId ? { ...turn, buyingSignal: fallbackBrain.buyingSignal, technique: fallbackBrain.technique, sayThis: fallbackBrain.punchLine, askNext: fallbackBrain.askNext } : turn))
    showCoaching(coaching, fallbackBrain, final)
    if (final) deliverEarCue(fallbackBrain, turnId, cleanText, true)

    const modelStatus = getSemanticModelStatus()
    if (modelStatus.state !== 'failed') setSemanticStatus(modelStatus.state === 'ready' ? 'ready' : 'loading')
    classifySalesIntent(cleanText).then((semanticIntents) => {
      if (sequence !== analysisSequenceRef.current && !final) return
      const currentTurns = turnId
        ? updateTurns(turnsRef.current.map((turn) => turn.id === turnId ? { ...turn, intents: semanticIntents } : turn))
        : turnsRef.current
      const semanticBrain = analyzeSalesBrain(cleanText, { lead: effectiveLead, objection: coaching, responseLanguage, coachStyle, semanticIntents, context: { latestTurn: currentTurns.at(-1), recentTurns: currentTurns } })
      if (turnId) updateTurns(currentTurns.map((turn) => turn.id === turnId ? { ...turn, buyingSignal: semanticBrain.buyingSignal, technique: semanticBrain.technique, sayThis: semanticBrain.punchLine, askNext: semanticBrain.askNext } : turn))
      setSemanticStatus(getSemanticModelStatus().state)
      if (sequence === analysisSequenceRef.current) {
        showCoaching(coaching, semanticBrain, final)
        if (final) deliverEarCue(semanticBrain, turnId, cleanText, false)
      }
    })
  }

  const handleRecognizedSpeech = (text) => {
    if (earSpeakingRef.current || ignoreRecognitionRef.current) return
    setStatement(text)
    runCoach(text, '', { final: true })
  }

  const speech = useSpeechRecognition({ language: recognitionLanguage, onFinalTranscript: handleRecognizedSpeech })

  const analyze = (objectionType = '') => {
    if (!statement.trim() && !objectionType) return
    runCoach(statement, objectionType, { final: true })
  }

  const handleQuickObjection = (objectionType, label) => {
    setStatement(label)
    runCoach(label, objectionType, { final: true })
  }

  const resetSession = (active = true) => {
    analysisSequenceRef.current += 1
    updateTurns([])
    brainRef.current = null
    setBrain(null)
    setResult(null)
    setStatement('')
    setSessionActive(active)
    earSession.reset()
    setEarCue(null)
    setEarStatus(isEarCoachSupported() ? earEnabled ? earMuted ? 'Muted' : 'Ready' : 'Off' : 'Unsupported')
  }

  const toggleEarCoach = () => {
    if (!isEarCoachSupported()) return
    if (earEnabled) {
      earSession.cancel()
      earSpeakingRef.current = false
      setIsEarCoachSpeaking(false)
      setEarEnabled(false)
      setEarStatus('Off')
    } else {
      setEarEnabled(true)
      setEarMuted(false)
      setEarStatus('Ready')
    }
  }

  const toggleEarMute = () => {
    const nextMuted = !earMuted
    if (nextMuted) earSession.cancel()
    earSpeakingRef.current = false
    setIsEarCoachSpeaking(false)
    setEarMuted(nextMuted)
    setEarStatus(nextMuted ? 'Muted' : earEnabled ? 'Ready' : 'Off')
  }

  const testEarCoach = () => {
    const cue = getEarCoachTestCue(earLanguage === 'Auto' ? 'English' : earLanguage)
    setEarCue(cue)
    earSession.speak({ turnId: `ear-test-${earLanguage}-${earRate}`, cue, language: earLanguage, rate: earRate, enabled: true, muted: earMuted, force: true, onStart: () => { earSpeakingRef.current = true; setIsEarCoachSpeaking(true); setEarStatus('Speaking') }, onEnd: finishEarSpeech })
  }

  useEffect(() => { runCoachRef.current = runCoach })

  useEffect(() => {
    if (interimTimerRef.current) window.clearTimeout(interimTimerRef.current)
    if (!speech.active || !speech.interimTranscript.trim() || earSpeakingRef.current || ignoreRecognitionRef.current) return undefined
    interimTimerRef.current = window.setTimeout(() => runCoachRef.current?.(speech.interimTranscript, '', { final: false }), 425)
    return () => window.clearTimeout(interimTimerRef.current)
  }, [speech.active, speech.interimTranscript])

  useEffect(() => () => {
    earSession.cancel()
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
  }, [earSession])

  return <main className="page sales-coach-page">
    <header className="form-header"><button className="back-button" type="button" onClick={onBack} aria-label="Back to lead details">‹</button><div><p className="eyebrow">Live conversation support</p><h1>Sales Coach</h1></div></header>

    <section className="coach-intro">
      <span aria-hidden="true">SC</span>
      <div><strong>{lead.contactName || lead.businessName || 'Standalone coaching'}</strong><small>{[products.join(', ') || 'General', lead.pipelineStage].filter(Boolean).join(' · ')}</small></div>
      <b>Offline</b>
    </section>
    <section className="coach-session-bar"><div><strong>{sessionActive ? 'Live session active' : 'Session cleared'}</strong><small>{turns.length} finalized customer turns · memory stays on this screen only</small></div><button type="button" onClick={() => resetSession(true)}>Start Session</button><button type="button" onClick={() => resetSession(sessionActive)}>Clear Session</button></section>
    {semanticStatus === 'loading' && <div className="coach-model-status">Preparing Sales Brain… Immediate rule-based coaching remains available.</div>}
    {semanticStatus === 'failed' && <div className="coach-model-status fallback">Semantic model unavailable. Using local fallback coaching.</div>}
    <section className="ear-coach-panel">
      <div className="ear-coach-heading"><div><span aria-hidden="true">🎧</span><div><strong>Ear Coach</strong><small>{isEarCoachSpeaking ? 'Speaking' : earStatus}</small></div></div><button type="button" className={earEnabled ? 'on' : ''} disabled={!isEarCoachSupported()} onClick={toggleEarCoach}>{earEnabled ? 'ON' : 'OFF'}</button></div>
      {!isEarCoachSupported() && <p className="ear-coach-error">Speech synthesis is unsupported. Screen coaching still works.</p>}
      <div className="ear-coach-settings"><label>Voice Language<select value={earLanguage} onChange={(event) => setEarLanguage(event.target.value)}>{earLanguages.map((language) => <option key={language}>{language}</option>)}</select></label><label>Speech Rate<select value={earRate} onChange={(event) => setEarRate(event.target.value)}>{speechRates.map((rate) => <option key={rate}>{rate}</option>)}</select></label></div>
      <div className="ear-coach-buttons"><button type="button" disabled={!isEarCoachSupported()} onClick={toggleEarMute}>{earMuted ? '🔊 Unmute Ear Coach' : '🔇 Mute Ear Coach'}</button><button type="button" disabled={!isEarCoachSupported() || earMuted} onClick={testEarCoach}>Test Ear Coach</button></div>
      <small>Audio follows your phone&apos;s current media output. Connect your Bluetooth headset through Android settings before starting.</small>
    </section>

    <section className="coach-input-card">
      <div className="coach-card-heading"><div><p>Sales Coach</p><h2>What did the customer say?</h2></div><div className="coach-preferences"><label>Response language<select value={responseLanguage} onChange={(event) => { setResponseLanguage(event.target.value); setResult(null); setBrain(null) }}>{languages.map((language) => <option key={language}>{language}</option>)}</select></label><label>Coach Style<select value={coachStyle} onChange={(event) => { setCoachStyle(event.target.value); setResult(null); setBrain(null) }}>{coachStyles.map((style) => <option key={style}>{style}</option>)}</select></label></div></div>
      {!hasLead && <label className="coach-product-select">Select Product<select value={selectedProduct} onChange={(event) => { setSelectedProduct(event.target.value); setResult(null); setBrain(null) }}>{standaloneProducts.map((product) => <option key={product}>{product}</option>)}</select></label>}
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
      <div className="brain-title"><div><span>Sales Brain</span><strong>{brain.product} · {turns.length} turns</strong></div>{brain.buyingSignal === 'Strong' && <b>🔥 BUYING SIGNAL</b>}</div>
      <div className="brain-summary"><div><span>Conversation Stage</span><strong>{brain.stage.replaceAll('_', ' ')}</strong></div><div><span>Customer Signal</span><strong>{brain.customerSignal}</strong></div><div><span>Technique</span><strong>{brain.technique}</strong></div></div>
      {brain.warning && <div className="brain-warning">⚠ {brain.warning}</div>}
      <article className="brain-punch"><span>🔥 Say This</span><p>{brain.punchLine}</p></article>
      <article className="coach-next brain-ask"><span>❓ Ask Next</span><p>{brain.askNext}</p></article>
      {earCue && <article className="ear-cue-card"><span>🎧 Ear Cue</span><p>{earCue.text}</p><small>{earCue.priority} priority · {earCue.language}</small></article>}
      <div className="brain-details"><article><span>Detected</span><p>{brain.detectedIntent}</p></article><article><span>Technique</span><p>{brain.technique}</p></article><article><span>Customer Signal</span><p>{brain.customerSignal}</p></article><article><span>Closing Move</span><p>{brain.closingMove}</p></article><article><span>Why</span><p>{brain.why}</p></article><article><span>Avoid</span><p>{brain.avoid}</p></article></div>
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

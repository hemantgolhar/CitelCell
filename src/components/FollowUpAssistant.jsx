import { useState } from 'react'
import { generateFollowUpSuggestion } from '../services/followUpAssistant'

function FollowUpAssistant({ lead, activities }) {
  const [generation, setGeneration] = useState(0)
  const [suggestion, setSuggestion] = useState(() => generateFollowUpSuggestion(lead, activities, 0))
  const [message, setMessage] = useState(suggestion.message)
  const [copyState, setCopyState] = useState('')

  const generate = () => {
    const nextGeneration = generation + 1
    const next = generateFollowUpSuggestion(lead, activities, nextGeneration)
    setGeneration(nextGeneration)
    setSuggestion(next)
    setMessage(next.message)
    setCopyState('')
  }

  const copy = async () => {
    if (!message.trim() || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(message)
      setCopyState('Copied')
    } catch {
      setCopyState('Copy unavailable')
    }
  }

  return (
    <section className="follow-up-assistant" aria-labelledby="assistant-title">
      <div className="assistant-heading">
        <span aria-hidden="true">AI</span>
        <div><p>Local suggestion</p><h2 id="assistant-title">AI Follow-up Assistant</h2></div>
        <b>{suggestion.tone}</b>
      </div>
      <label>Recommended message<textarea rows="6" value={message} onChange={(event) => { setMessage(event.target.value); setCopyState('') }} /></label>
      <div className="assistant-reason"><strong>Why this message:</strong><p>{suggestion.reason}</p></div>
      <div className="assistant-actions">
        <button type="button" onClick={generate}>Generate Message</button>
        <button className="copy" type="button" onClick={copy} disabled={!message.trim() || !navigator.clipboard?.writeText}>{copyState || 'Copy Message'}</button>
      </div>
      <small className="assistant-safety">Suggestion only — nothing is sent or saved automatically.</small>
    </section>
  )
}

export default FollowUpAssistant

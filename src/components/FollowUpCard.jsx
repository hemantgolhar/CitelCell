import { useState } from 'react'

function FollowUpCard({ followUp }) {
  const [isDone, setIsDone] = useState(false)

  return (
    <article className={`follow-up-card${isDone ? ' is-done' : ''}`}>
      <div className="follow-up-topline">
        <div>
          <h3>{followUp.business}</h3>
          <p>{followUp.contact}</p>
        </div>
        <span className="follow-up-time">{followUp.time}</span>
      </div>

      <dl className="follow-up-details">
        <div>
          <dt>Phone</dt>
          <dd>{followUp.phone}</dd>
        </div>
        <div>
          <dt>Product</dt>
          <dd>{followUp.product}</dd>
        </div>
      </dl>

      <div className="status-row">
        <span className="status-dot" aria-hidden="true" />
        {isDone ? 'Completed' : followUp.status}
      </div>

      <div className="quick-actions">
        <a className="action-button call" href={`tel:${followUp.phoneLink}`}>
          <span aria-hidden="true">☎</span> Call
        </a>
        <a
          className="action-button whatsapp"
          href={`https://wa.me/${followUp.phoneLink.replace('+', '')}`}
          target="_blank"
          rel="noreferrer"
        >
          <span aria-hidden="true">◉</span> WhatsApp
        </a>
        <button
          className="action-button done"
          type="button"
          onClick={() => setIsDone((current) => !current)}
          aria-pressed={isDone}
        >
          <span aria-hidden="true">✓</span> {isDone ? 'Undo' : 'Done'}
        </button>
      </div>
    </article>
  )
}

export default FollowUpCard

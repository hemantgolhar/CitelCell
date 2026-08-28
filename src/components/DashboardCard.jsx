function DashboardCard({ label, value, helper, icon, tone }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="metric-copy"><strong>{value}</strong><span>{label}</span><small>{helper}</small></span>
      <span className={`metric-spark ${tone}`} aria-hidden="true">⌁</span>
      <span className="metric-chevron" aria-hidden="true">›</span>
    </article>
  )
}

export default DashboardCard

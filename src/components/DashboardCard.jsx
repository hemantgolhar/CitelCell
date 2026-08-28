function DashboardCard({ label, value, icon, tone }) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`} aria-hidden="true">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  )
}

export default DashboardCard

function PlaceholderPage({ title, description, icon }) {
  return (
    <main className="page placeholder-page">
      <header className="simple-header">
        <p className="eyebrow">CitelCell</p>
        <h1>{title}</h1>
      </header>
      <section className="empty-state">
        <span aria-hidden="true">{icon}</span>
        <h2>{title} is ready for the next step</h2>
        <p>{description}</p>
      </section>
    </main>
  )
}

export default PlaceholderPage

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
  { id: 'leads', label: 'Leads', icon: '♙' },
  { id: 'pipeline', label: 'Pipeline', icon: '▥' },
  { id: 'followups', label: 'Follow-ups', icon: '◷' },
  { id: 'reports', label: 'Reports', icon: '▥' },
]

function BottomNavigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-navigation" aria-label="Primary navigation">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={activePage === item.id ? 'active' : ''}
          onClick={() => onNavigate(item.id)}
          aria-current={activePage === item.id ? 'page' : undefined}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNavigation

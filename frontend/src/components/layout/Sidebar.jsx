const NAV_ITEMS = [
  { id: 'Dashboard',       icon: '⊞', label: 'Dashboard' },
  { id: 'New Evaluation',  icon: '⊕', label: 'New Evaluation' },
  { id: 'My Documents',    icon: '🗂', label: 'My Documents' },
  { id: 'History',         icon: '🕐', label: 'History' },
  { id: 'Reports',         icon: '📊', label: 'Reports' },
  { id: 'Settings',        icon: '⚙', label: 'Settings' },
]

export default function Sidebar({ active = 'New Evaluation' }) {
  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🧠</span>
          <div>
            <div style={{
              fontWeight: '700',
              fontSize: '16px',
              color: 'var(--color-text)',
              letterSpacing: '-0.01em',
            }}>
              EssayAI
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              marginTop: '1px',
            }}>
              Academic Assistant
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const isActive = item.id === active
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                marginBottom: '2px',
                cursor: 'pointer',
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                backgroundColor: isActive ? 'rgba(108,99,255,0.08)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: isActive ? '600' : '400',
                fontSize: '14px',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#F1F5F9'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>
                {item.icon}
              </span>
              {item.label}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

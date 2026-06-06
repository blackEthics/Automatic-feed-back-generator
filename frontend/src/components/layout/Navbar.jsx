export default function Navbar({ title = 'New Evaluation' }) {
  return (
    <header style={{
      height: '56px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      {/* Page title */}
      <span style={{
        fontWeight: '600',
        fontSize: '15px',
        color: 'var(--color-text)',
      }}>
        {title}
      </span>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Bell */}
        <button
          aria-label="Notifications"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            padding: '4px',
            borderRadius: '6px',
            color: 'var(--color-text-muted)',
          }}
        >
          🔔
        </button>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '700',
            fontSize: '13px',
          }}>
            U
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--color-text)',
          }}>
            Guest User
          </span>
        </div>
      </div>
    </header>
  )
}

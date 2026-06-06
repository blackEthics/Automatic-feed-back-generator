import { useAuth } from '../../contexts/AuthContext'

export default function Navbar({ title = 'New Evaluation' }) {
  const { user, loading, login, logout } = useAuth()

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

        {/* User area */}
        {loading ? (
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>...</span>
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                referrerPolicy="no-referrer"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
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
            )}
            <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text)' }}>
              {user.name?.split(' ')[0]}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#ef4444',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            style={{
              background: '#fff',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#3c4043',
            }}
          >
            G Sign in
          </button>
        )}
      </div>
    </header>
  )
}

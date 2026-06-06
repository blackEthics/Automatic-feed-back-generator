import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getHistory, clearHistory } from '../utils/historyStorage'

const PREFS_KEY = 'essayai_prefs'

const DEFAULT_PREFS = {
  autoSaveHistory: true,
  showImprovementTips: true,
  compactView: false,
}

const CARD = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '24px',
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        width: '44px', height: '24px', borderRadius: '9999px',
        background: on ? 'var(--color-primary)' : '#d1d5db',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: '2px',
        left: on ? '22px' : '2px',
        width: '20px', height: '20px',
        borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <h2 style={{
      fontSize: '16px', fontWeight: 700, color: 'var(--color-text)',
      margin: '0 0 20px 0', paddingBottom: '12px',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {title}
    </h2>
  )
}

function formatMemberSince(dateString) {
  if (!dateString) return 'Recently'
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function Modal({ title, titleColor, body, onCancel, onConfirm, confirmLabel, confirmColor }) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--color-surface)', borderRadius: '12px',
        padding: '28px', width: '380px', zIndex: 201,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <p style={{ fontSize: '17px', fontWeight: 700, color: titleColor ?? 'var(--color-text)', margin: '0 0 10px 0' }}>
          {title}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 22px 0', lineHeight: 1.6 }}>
          {body}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: '#fff', color: '#374151',
              border: '1px solid var(--color-border)', borderRadius: '8px',
              padding: '10px 0', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, background: confirmColor ?? '#DC2626', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '10px 0',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

export default function SettingsPage() {
  const { user, login, logout } = useAuth()
  const [prefs, setPrefs] = useState(loadPrefs)
  const [toast, setToast] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const totalEssays = getHistory().length

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handlePrefChange(key, value) {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  }

  function handleExport() {
    const history = getHistory()
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `essayai_export_${today}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported successfully')
  }

  function handleClearHistory() {
    clearHistory()
    setShowClearConfirm(false)
    showToast('Local history cleared')
  }

  function handleDeleteAccount() {
    setShowDeleteConfirm(false)
    showToast('Feature coming soon', 'info')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>

      {/* SECTION A — Account */}
      <div style={CARD}>
        <SectionTitle title="Account" />
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {user.picture ? (
              <img
                src={user.picture}
                alt="Profile"
                style={{
                  width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                  border: '2px solid var(--color-border)',
                }}
              />
            ) : (
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: 700, flexShrink: 0,
              }}>
                {(user.name || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 3px 0' }}>
                {user.name || 'User'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 3px 0' }}>
                {user.email}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 3px 0' }}>
                Member since {formatMemberSince(user.created_at)}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                {totalEssays} essay{totalEssays !== 1 ? 's' : ''} scored
              </p>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'none', border: '1px solid #FECACA', color: '#DC2626',
                borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', background: '#e5e7eb',
              color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700, flexShrink: 0,
            }}>
              U
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px 0' }}>
                Guest User
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                Sign in to save your progress
              </p>
            </div>
            <button
              onClick={login}
              style={{
                background: '#fff', border: '1px solid #dadce0', borderRadius: '8px',
                padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                color: '#3c4043', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* SECTION B — Preferences */}
      <div style={CARD}>
        <SectionTitle title="Display Preferences" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {[
            {
              key: 'autoSaveHistory',
              label: 'Auto-save to History',
              desc: 'Automatically save each scored essay to your history',
            },
            {
              key: 'showImprovementTips',
              label: 'Show Improvement Tips',
              desc: 'Show writing tips after scoring',
            },
            {
              key: 'compactView',
              label: 'Compact View',
              desc: 'Use compact layout for history cards',
            },
          ].map(({ key, label, desc }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 3px 0' }}>
                  {label}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                  {desc}
                </p>
              </div>
              <Toggle on={prefs[key]} onChange={v => handlePrefChange(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* SECTION C — Data & Privacy */}
      <div style={CARD}>
        <SectionTitle title="Data & Privacy" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px', paddingBottom: '16px',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 3px 0' }}>
                Export My Data
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Download all your essay history as JSON
              </p>
            </div>
            <button
              onClick={handleExport}
              style={{
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              Export My Data
            </button>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px', paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626', margin: '0 0 3px 0' }}>
                Clear Local History
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Delete all locally stored essays
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{
                background: 'none', border: '1px solid #FECACA', borderRadius: '8px',
                padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', color: '#DC2626', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              Clear Local History
            </button>
          </div>
        </div>
      </div>

      {/* SECTION D — About */}
      <div style={CARD}>
        <SectionTitle title="About EssayAI" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '28px' }}>🧠</span>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 2px 0' }}>
              EssayAI
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
              Version 1.0.0
            </p>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px 0', lineHeight: 1.65 }}>
          NLP-powered essay scoring system trained on 50,724 essays (ASAP 2.0 + PERSUADE 2.0).
          Best MAE: 0.4420 — exceeds human rater agreement.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {['Python', 'FastAPI', 'XGBoost', 'spaCy', 'React', 'Tailwind'].map(tech => (
            <span key={tech} style={{
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderRadius: '9999px', padding: '3px 10px',
              fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
            }}>
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* SECTION E — Danger Zone (logged-in only) */}
      {user && (
        <div style={{ ...CARD, border: '1px solid #FECACA' }}>
          <SectionTitle title="Danger Zone" />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 3px 0' }}>
                Delete Account
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Permanently delete your account and all cloud history
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: '#DC2626', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '10px 18px', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#B91C1C' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#DC2626' }}
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showClearConfirm && (
        <Modal
          title="Clear Local History?"
          body="This will delete all locally stored essays. Cloud history (if signed in) is not affected."
          confirmLabel="Clear History"
          confirmColor="#DC2626"
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={handleClearHistory}
        />
      )}

      {showDeleteConfirm && (
        <Modal
          title="Delete Account?"
          titleColor="#DC2626"
          body="Are you sure? This will permanently delete your account and all cloud history."
          confirmLabel="Delete Account"
          confirmColor="#DC2626"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAccount}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: toast.type === 'info' ? '#1e3a5f' : '#14532d',
          color: '#fff', borderRadius: '10px', padding: '12px 20px',
          fontSize: '13px', fontWeight: 500, zIndex: 300,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          animation: 'fadeInUp 0.2s ease',
        }}>
          {toast.type === 'info' ? 'ℹ️' : '✅'} {toast.message}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

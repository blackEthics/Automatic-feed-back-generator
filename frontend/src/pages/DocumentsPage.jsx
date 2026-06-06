import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getHistory, deleteEntry } from '../utils/historyStorage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const DIMS = [
  { key: 'grammar',      label: 'Grammar',      max: 20 },
  { key: 'relevance',    label: 'Relevance',     max: 25 },
  { key: 'organization', label: 'Organization',  max: 20 },
  { key: 'clarity',      label: 'Clarity',       max: 20 },
  { key: 'vocabulary',   label: 'Vocabulary',    max: 15 },
]

const CARD = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    date: entry.date,
    topic: entry.topic || 'General',
    essayPreview: entry.essay_preview || entry.essayPreview || 'No preview available',
    wordCount: entry.word_count || entry.wordCount || 0,
    overallScore: parseFloat(entry.overall_score ?? entry.overallScore ?? 0),
    asapGrade: parseFloat(entry.asap_grade ?? entry.asapGrade ?? 0),
    dimensions: typeof entry.dimensions === 'string'
      ? JSON.parse(entry.dimensions)
      : entry.dimensions || {},
    feedback: typeof entry.feedback === 'string'
      ? JSON.parse(entry.feedback)
      : entry.feedback || {},
    hasImprovement: entry.has_improvement || entry.hasImprovement || false,
    improvementSummary: entry.improvement_summary || entry.improvementSummary || null,
    scoreBefore: entry.score_before || entry.scoreBefore || null,
    scoreAfter: entry.score_after || entry.scoreAfter || null,
  }
}

function ScoreRing({ score, size = 60 }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  const c = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size > 55 ? '14px' : '12px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: '9px', color: '#9ca3af', lineHeight: 1, marginTop: '1px' }}>/100</span>
      </div>
    </div>
  )
}

function TopicBadge({ topic }) {
  return (
    <span style={{
      background: '#EEF2FF', color: '#4338CA', fontSize: '11px', fontWeight: 600,
      borderRadius: '9999px', padding: '3px 10px', border: '1px solid #C7D2FE',
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {topic || 'General'}
    </span>
  )
}

function ImprovedBadge() {
  return (
    <span style={{
      background: '#F5F3FF', color: '#7C3AED', fontSize: '11px', fontWeight: 600,
      borderRadius: '9999px', padding: '3px 10px', border: '1px solid #DDD6FE',
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      ✨ Improved
    </span>
  )
}

function DocumentCard({ doc, onOpen, onDelete }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        ...CARD,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'box-shadow 0.15s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <TopicBadge topic={doc.topic} />
        {doc.hasImprovement && <ImprovedBadge />}
      </div>

      <p style={{
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
        marginBottom: '12px',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        margin: 0, flex: 1,
      }}>
        {doc.essayPreview}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ScoreRing score={doc.overallScore || 0} size={60} />
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 3px 0' }}>
            ASAP:{' '}
            <span style={{ color: 'var(--color-primary)' }}>
              {typeof doc.asapGrade === 'number' ? doc.asapGrade.toFixed(1) : doc.asapGrade}
            </span>/6
          </p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
            {formatDateShort(doc.date)} · {doc.wordCount} words
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={() => onOpen(doc)}
          style={{
            flex: 1, background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '7px', padding: '7px 0',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
        >
          Open
        </button>
        <button
          onClick={() => onDelete(doc)}
          style={{
            background: 'none', border: '1px solid #FECACA', borderRadius: '7px',
            padding: '7px 12px', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', color: '#DC2626',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function DocumentRow({ doc, onOpen, onDelete }) {
  return (
    <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <ScoreRing score={doc.overallScore || 0} size={50} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <TopicBadge topic={doc.topic} />
          {doc.hasImprovement && <ImprovedBadge />}
        </div>
        <p style={{
          fontSize: '13px', color: 'var(--color-text)', margin: '0 0 3px 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {(doc.essayPreview || '').slice(0, 100)}
          {(doc.essayPreview || '').length > 100 ? '…' : ''}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
          {formatDateShort(doc.date)} · {doc.wordCount} words
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        <span style={{
          background: '#EEF2FF', color: '#4338CA', fontSize: '11px', fontWeight: 700,
          borderRadius: '6px', padding: '3px 8px',
        }}>
          ASAP {typeof doc.asapGrade === 'number' ? doc.asapGrade.toFixed(1) : doc.asapGrade}/6
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onOpen(doc)}
            style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: '6px', padding: '5px 12px', fontSize: '12px',
              fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
          >
            Open
          </button>
          <button
            onClick={() => onDelete(doc)}
            style={{
              background: 'none', border: '1px solid #FECACA', borderRadius: '6px',
              padding: '5px 12px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', color: '#DC2626',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentModal({ doc, onClose, onDelete }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--color-surface)',
        borderRadius: '14px',
        width: '90%', maxWidth: '600px', maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 1001,
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <TopicBadge topic={doc.topic} />
              {doc.hasImprovement && <ImprovedBadge />}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
              {formatDateShort(doc.date)} · {doc.wordCount} words
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '18px', color: 'var(--color-text-muted)', padding: '2px 6px',
              borderRadius: '6px', lineHeight: 1, flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1 }}>
          {/* Overall score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <ScoreRing score={doc.overallScore || 0} size={64} />
            <div>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 3px 0' }}>
                {Math.round(doc.overallScore || 0)}/100
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                ASAP: {typeof doc.asapGrade === 'number' ? doc.asapGrade.toFixed(1) : (doc.asapGrade || '—')}/6
              </p>
            </div>
          </div>

          {/* Dimension scores */}
          {doc.dimensions && Object.keys(doc.dimensions).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 0',
              }}>
                Score Breakdown
              </p>
              {DIMS.map(({ key, label, max }) => {
                const score = doc.dimensions?.[key]?.score ?? 0
                const pct = Math.round((score / max) * 100)
                const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '90px', fontSize: '12px', color: '#374151', fontWeight: 500, flexShrink: 0 }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: '6px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '9999px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color, width: '38px', textAlign: 'right', flexShrink: 0 }}>
                      {score}/{max}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Feedback */}
          {doc.feedback && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0',
              }}>
                Feedback
              </p>
              <p style={{
                fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.65', margin: 0,
                background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.15)',
                borderRadius: '8px', padding: '12px',
              }}>
                {typeof doc.feedback === 'object'
                  ? (doc.feedback.overall || doc.feedback.priority || JSON.stringify(doc.feedback))
                  : doc.feedback}
              </p>
            </div>
          )}

          {/* Improvement */}
          {doc.hasImprovement && doc.scoreBefore != null && doc.scoreAfter != null && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0',
              }}>
                Improvement
              </p>
              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '12px' }}>
                <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                  Score improved:{' '}
                  <span style={{ fontWeight: 600 }}>
                    {typeof doc.scoreBefore === 'number' ? doc.scoreBefore.toFixed(1) : doc.scoreBefore}
                  </span>
                  {' → '}
                  <strong style={{ color: '#7C3AED' }}>
                    {typeof doc.scoreAfter === 'number' ? doc.scoreAfter.toFixed(1) : doc.scoreAfter}
                  </strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: '10px', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: '#fff', color: '#374151',
              border: '1px solid var(--color-border)', borderRadius: '8px',
              padding: '10px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
          >
            Close
          </button>
          <button
            onClick={() => onDelete(doc.id)}
            style={{
              flex: 1, background: '#DC2626', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '10px 0',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#b91c1c' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#DC2626' }}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

function DeleteConfirmModal({ doc, onCancel, onConfirm }) {
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
        padding: '24px', width: '360px', zIndex: 201,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px 0' }}>
          Delete this document?
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
          This cannot be undone.
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
            onClick={() => onConfirm(doc.id)}
            style={{
              flex: 1, background: '#DC2626', color: '#fff',
              border: 'none', borderRadius: '8px', padding: '10px 0',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

export default function DocumentsPage({ onNavigate }) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    loadDocuments()
  }, [user])

  async function loadDocuments() {
    setLoading(true)
    try {
      if (user) {
        console.log('Fetching history for user:', user)
        const res = await fetch(`${API_URL}/history/list`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          console.log('History response:', data)
          const normalized = (Array.isArray(data) ? data : []).map(normalizeEntry)
          setDocuments(normalized)
          setLoading(false)
          return
        }
      }
      setDocuments(getHistory().map(normalizeEntry))
    } catch {
      setDocuments(getHistory())
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter(d =>
      (d.topic || '').toLowerCase().includes(q) ||
      (d.essayPreview || '').toLowerCase().includes(q)
    )
  }, [documents, searchQuery])

  async function handleDelete(id) {
    if (user) {
      await fetch(`${API_URL}/history/${id}`, {
        method: 'DELETE', credentials: 'include',
      }).catch(() => {})
    } else {
      deleteEntry(id)
    }
    setDocuments(prev => prev.filter(d => d.id !== id))
    if (selectedDoc?.id === id) setSelectedDoc(null)
    setDeleteTarget(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {!user && (
        <div style={{
          backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: '10px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400E' }}>
            Sign in to sync documents across devices. Showing local storage only.
          </p>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
          My Documents
        </h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { mode: 'grid', icon: '⊞', title: 'Grid view' },
            { mode: 'list', icon: '☰', title: 'List view' },
          ].map(({ mode, icon, title }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={title}
              style={{
                background: viewMode === mode ? 'rgba(108,99,255,0.1)' : 'none',
                border: viewMode === mode ? '1px solid rgba(108,99,255,0.3)' : '1px solid var(--color-border)',
                borderRadius: '7px', padding: '6px 10px', fontSize: '16px',
                cursor: 'pointer',
                color: viewMode === mode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search documents..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        style={{
          width: '100%', border: '1px solid var(--color-border)',
          borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
          color: 'var(--color-text)', background: 'var(--color-surface)',
          outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Content */}
      {loading ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 0',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '4px solid rgba(108,99,255,0.2)',
            borderTopColor: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
            Loading documents…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          ...CARD, padding: '80px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '48px', margin: '0 0 14px 0' }}>📄</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>
            {searchQuery ? 'No documents match your search' : 'No documents yet'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 22px 0' }}>
            {searchQuery ? 'Try a different search term' : 'Your scored essays will appear here'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => onNavigate('new-evaluation')}
              style={{
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '10px 22px', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
            >
              Score Your First Essay
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {filtered.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={setSelectedDoc}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={setSelectedDoc}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Card-level delete confirm (not from panel) */}
      {deleteTarget && !selectedDoc && (
        <DeleteConfirmModal
          doc={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Document detail modal */}
      {selectedDoc && (
        <DocumentModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={handleDelete}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

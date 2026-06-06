import { useState, useRef, useCallback } from 'react'

export default function FileUploader({ onTextExtracted }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]       = useState(null)
  const [file, setFile]         = useState(null)   // { name, sizeKB }
  const inputRef = useRef(null)

  const processFile = useCallback((f) => {
    setError(null)

    if (!f.name.endsWith('.txt')) {
      setError('Only .txt files supported. DOCX and PDF coming soon.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setFile({ name: f.name, sizeKB: (f.size / 1024).toFixed(1) })
      onTextExtracted(e.target.result, f.name)
    }
    reader.readAsText(f)
  }, [onTextExtracted])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [processFile])

  const handleChange = (e) => {
    const f = e.target.files[0]
    if (f) processFile(f)
    e.target.value = ''
  }

  const handleReset = () => {
    setFile(null)
    setError(null)
  }

  if (file) {
    return (
      <div style={{
        border: '2px solid #22c55e',
        borderRadius: '12px',
        padding: '28px 24px',
        textAlign: 'center',
        background: '#f0fdf4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '2rem' }}>✅</span>
        <p style={{ fontWeight: 600, color: '#15803d', margin: 0 }}>{file.name}</p>
        <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>{file.sizeKB} KB</p>
        <button
          onClick={handleReset}
          style={{
            marginTop: '8px',
            fontSize: '0.75rem',
            color: '#6b7280',
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '4px 12px',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#9ca3af'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}
        >
          Remove file
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          background: dragOver
            ? 'rgba(108,99,255,0.07)'
            : 'var(--color-bg)',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          if (!dragOver) {
            e.currentTarget.style.borderColor = 'var(--color-primary)'
            e.currentTarget.style.background   = 'rgba(108,99,255,0.04)'
          }
        }}
        onMouseLeave={e => {
          if (!dragOver) {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.background   = 'var(--color-bg)'
          }
        }}
      >
        <span style={{ fontSize: '2.25rem', display: 'block', marginBottom: '10px' }}>📄</span>
        <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px' }}>
          Drag &amp; drop a .txt file
        </p>
        <p style={{ fontSize: '0.82rem', color: '#9ca3af', margin: 0 }}>
          or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <p style={{
          marginTop: '10px',
          fontSize: '0.82rem',
          color: '#dc2626',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '8px 12px',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

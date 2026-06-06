import { useState, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const ALLOWED_EXTS = ['.txt', '.pdf', '.docx']

export default function FileUploader({ onTextExtracted }) {
  const [dragOver, setDragOver]   = useState(false)
  const [error, setError]         = useState(null)
  const [file, setFile]           = useState(null)   // { name, wordCount }
  const [loading, setLoading]     = useState(false)
  const inputRef = useRef(null)

  const getExt = (name) => {
    const m = name.match(/(\.[^.]+)$/)
    return m ? m[1].toLowerCase() : ''
  }

  const processFile = useCallback(async (f) => {
    setError(null)

    const ext = getExt(f.name)
    if (!ALLOWED_EXTS.includes(ext)) {
      setError('Only .txt, .pdf, and .docx files are supported.')
      return
    }

    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', f)

      console.log('Uploading to:', `${API_URL}/upload-file`)
      const response = await fetch(`${API_URL}/upload-file`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Failed to extract text from file.')
        return
      }

      setFile({ name: data.filename, wordCount: data.word_count })
      onTextExtracted(data.extracted_text, data.filename)
    } catch {
      setError('Upload failed. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [onTextExtracted])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (loading) return
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [processFile, loading])

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
        <p style={{ fontWeight: 600, color: '#15803d', margin: 0 }}>
          {file.name} loaded — {file.wordCount} words extracted
        </p>
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

  if (loading) {
    return (
      <div style={{
        border: '2px dashed var(--color-border)',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '2rem' }}>⏳</span>
        <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          Extracting text…
        </p>
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
          Drag &amp; drop your essay file here
        </p>
        <p style={{ fontSize: '0.82rem', color: '#9ca3af', margin: 0 }}>
          Supports .txt, .pdf, and .docx files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx"
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

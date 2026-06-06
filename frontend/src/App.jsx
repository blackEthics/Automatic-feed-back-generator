import { useState, useCallback } from 'react'
import ResultsSection from './components/ResultsSection'
import Sidebar from './components/layout/Sidebar'
import Navbar from './components/layout/Navbar'
import FileUploader from './components/ui/FileUploader'
import ReportView from './components/ReportView'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const TOPICS = [
  { label: 'General (no specific topic)', value: '' },
  { label: 'Exploring Venus',              value: 'Exploring Venus' },
  { label: 'Driverless cars',              value: 'Driverless cars' },
  { label: 'Facial action coding system',  value: 'Facial action coding system' },
  { label: 'The Face on Mars',             value: 'The Face on Mars' },
  { label: 'A Cowboy Who Rode the Waves',  value: '"A Cowboy Who Rode the Waves"' },
  { label: 'Does the electoral college work?', value: 'Does the electoral college work?' },
  { label: 'Car-free cities',              value: 'Car-free cities' },
]

const SAMPLE_ESSAY = `Driverless cars represent one of the most significant technological advances of the twenty-first century. These autonomous vehicles rely on a combination of sensors, cameras, radar systems, and sophisticated artificial intelligence to navigate roads without any human input. Proponents argue that self-driving technology could dramatically reduce traffic accidents, which currently cause over a million deaths worldwide each year. Because the vast majority of crashes result from human error, eliminating that error could make roads far safer for everyone.

Beyond safety, autonomous vehicles offer considerable benefits for people who cannot drive, including elderly individuals and those with disabilities. They could also reduce traffic congestion by coordinating routes and maintaining optimal speeds across a network of vehicles.

However, critics raise legitimate concerns. Cybersecurity vulnerabilities could be exploited by malicious actors. The technology may displace millions of professional drivers, creating serious unemployment. Ethical questions also arise about how an autonomous system should respond when an accident becomes unavoidable.

Despite these challenges, careful regulation and continued investment in research could unlock the enormous potential of driverless technology, ultimately transforming how society moves.`

function wordCount(text) {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export default function App() {
  const [essay, setEssay] = useState('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [improvementResult, setImprovementResult] = useState(null)
  const [error, setError] = useState(null)
  const [inputTab, setInputTab] = useState('type')       // 'type' | 'upload'
  const [fileNotice, setFileNotice] = useState(null)     // { name } | null

  const wc = wordCount(essay)
  const cc = essay.length
  const tooShort = wc > 0 && wc < 20

  const handleSubmit = useCallback(async () => {
    if (wc < 20) return
    setLoading(true)
    setError(null)
    setResults(null)
    setImprovementResult(null)

    try {
      const res = await fetch(`${API_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essay_text: essay,
          prompt_name: topic || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? `HTTP ${res.status}`)
      }

      setResults(await res.json())
    } catch {
      setError('Scoring failed. Please check your essay and try again.')
    } finally {
      setLoading(false)
    }
  }, [essay, topic, wc])

  const handleTextExtracted = useCallback((text, fileName) => {
    setEssay(text)
    setFileNotice({ name: fileName })
    setInputTab('type')
  }, [])

  const handleReset = () => {
    setEssay('')
    setTopic('')
    setResults(null)
    setImprovementResult(null)
    setError(null)
    setFileNotice(null)
    setInputTab('type')
  }

  const handleSample = () => {
    setEssay(SAMPLE_ESSAY)
    setTopic('Driverless cars')
    setResults(null)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar title="New Evaluation" />

        <main style={{ padding: '24px', background: 'var(--color-bg)' }}>
            {/* Input form — hidden once results arrive */}
            {!results && !loading && (
              <div style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
                className="space-y-5"
              >
                {/* Tab switcher */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: '4px',
                }}>
                  {[
                    { id: 'type',   label: '📝 Type / Paste' },
                    { id: 'upload', label: '📄 Upload File'   },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setInputTab(tab.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: inputTab === tab.id
                          ? '2px solid var(--color-primary)'
                          : '2px solid transparent',
                        color: inputTab === tab.id
                          ? 'var(--color-primary)'
                          : '#6b7280',
                        fontWeight: inputTab === tab.id ? 600 : 400,
                        fontSize: '0.85rem',
                        padding: '6px 14px 10px',
                        cursor: 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                        marginBottom: '-1px',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Upload tab */}
                {inputTab === 'upload' && (
                  <FileUploader onTextExtracted={handleTextExtracted} />
                )}

                {/* Type / Paste tab */}
                {inputTab === 'type' && (
                  <div>
                    {fileNotice && (
                      <p style={{
                        fontSize: '0.82rem',
                        color: '#15803d',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '10px',
                      }}>
                        ✅ Text loaded from <strong>{fileNotice.name}</strong> — review below then click Analyse Essay
                      </p>
                    )}
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="text-sm font-medium text-gray-700">Essay text</label>
                      <span className={`text-xs ${tooShort ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {wc} word{wc !== 1 ? 's' : ''} &middot; {cc} character{cc !== 1 ? 's' : ''}
                        {tooShort ? ' — minimum 20 words' : ''}
                      </span>
                    </div>
                    <textarea
                      value={essay}
                      onChange={e => { setEssay(e.target.value); setFileNotice(null) }}
                      placeholder="Paste or type your essay here…"
                      rows={12}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent resize-y"
                      style={{ '--tw-ring-color': 'var(--color-primary)', minHeight: '280px' }}
                    />
                  </div>
                )}

                {/* Topic dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
                  <select
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': 'var(--color-primary)' }}
                  >
                    {TOPICS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={wc < 20}
                    className="flex-1 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: wc < 20 ? '#A5A0F5' : 'var(--color-primary)',
                    }}
                    onMouseEnter={e => { if (wc >= 20) e.currentTarget.style.backgroundColor = 'var(--color-primary-dark)' }}
                    onMouseLeave={e => { if (wc >= 20) e.currentTarget.style.backgroundColor = 'var(--color-primary)' }}
                  >
                    Analyse Essay
                  </button>
                  <button
                    onClick={handleSample}
                    className="text-sm font-medium rounded-lg px-4 py-2.5 transition-colors whitespace-nowrap border"
                    style={{
                      color: 'var(--color-primary)',
                      borderColor: 'rgba(108,99,255,0.35)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.35)' }}
                  >
                    Try Sample Essay
                  </button>
                </div>
              </div>
            )}

            {/* Loading spinner */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <div
                  className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
                  style={{
                    borderColor: 'rgba(108,99,255,0.2)',
                    borderTopColor: 'var(--color-primary)',
                  }}
                />
                <p className="text-sm">Analysing your essay…</p>
              </div>
            )}

            {/* Results */}
            {results && !loading && (
              <ResultsSection
                results={results}
                onReset={handleReset}
                originalText={essay}
                promptName={topic}
                setImprovementResult={setImprovementResult}
              />
            )}

        </main>
      </div>

      <ReportView
        scoreData={results}
        improvementData={improvementResult}
        essayText={essay}
      />
    </div>
  )
}

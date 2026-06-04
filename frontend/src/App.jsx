import { useState, useCallback } from 'react'
import ResultsSection from './components/ResultsSection'

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
  const [error, setError] = useState(null)

  const wc = wordCount(essay)
  const cc = essay.length
  const tooShort = wc > 0 && wc < 20

  const handleSubmit = useCallback(async () => {
    if (wc < 20) return
    setLoading(true)
    setError(null)
    setResults(null)

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

  const handleReset = () => {
    setEssay('')
    setTopic('')
    setResults(null)
    setError(null)
  }

  const handleSample = () => {
    setEssay(SAMPLE_ESSAY)
    setTopic('Driverless cars')
    setResults(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold text-white">Essay Scorer</h1>
          <p className="text-sm text-indigo-200 mt-0.5">Automated NLP-based essay analysis</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Input form — hidden once results arrive */}
        {!results && !loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

            {/* Textarea */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-sm font-medium text-gray-700">Essay text</label>
                <span className={`text-xs ${tooShort ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {wc} word{wc !== 1 ? 's' : ''} &middot; {cc} character{cc !== 1 ? 's' : ''}
                  {tooShort ? ' — minimum 20 words' : ''}
                </span>
              </div>
              <textarea
                value={essay}
                onChange={e => setEssay(e.target.value)}
                placeholder="Paste or type your essay here…"
                rows={12}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-y"
              />
            </div>

            {/* Topic dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic</label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
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
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
              >
                Analyse Essay
              </button>
              <button
                onClick={handleSample}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-lg px-4 py-2.5 transition-colors whitespace-nowrap"
              >
                Try Sample Essay
              </button>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-sm">Analysing your essay…</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <ResultsSection results={results} onReset={handleReset} />
        )}

      </main>
    </div>
  )
}

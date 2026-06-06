const STORAGE_KEY = 'essayai_history'
const MAX_ENTRIES = 50

export function saveEssayResult(essayText, topic, scoreData, improvementData = null) {
  const entry = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    topic,
    essayPreview: essayText.slice(0, 150) + '...',
    wordCount: essayText.split(' ').length,
    overallScore: scoreData.overall_score,
    asapGrade: scoreData.asap_score,
    dimensions: scoreData.dimensions,
    feedback: scoreData.feedback,
    hasImprovement: improvementData !== null,
    improvementSummary: improvementData?.summary || null,
    scoreBefore: improvementData?.score_before || null,
    scoreAfter: improvementData?.score_after || null,
  }

  const history = getHistory()
  const updated = [entry, ...history].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return entry
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return [...parsed].sort((a, b) => new Date(b.date) - new Date(a.date))
  } catch {
    return []
  }
}

export function deleteEntry(id) {
  const history = getHistory()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.filter(e => e.id !== id)))
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getStats() {
  const history = getHistory()
  if (history.length === 0) {
    return { totalEssays: 0, averageScore: 0, bestScore: 0, topicBreakdown: {}, averageByTopic: {}, improvementCount: 0 }
  }

  const totalEssays = history.length
  const averageScore = parseFloat((history.reduce((s, e) => s + e.overallScore, 0) / totalEssays).toFixed(1))
  const bestScore = Math.max(...history.map(e => e.overallScore))
  const improvementCount = history.filter(e => e.hasImprovement).length
  const topicBreakdown = {}
  const topicScores = {}

  for (const entry of history) {
    const t = entry.topic || 'General'
    topicBreakdown[t] = (topicBreakdown[t] || 0) + 1
    if (!topicScores[t]) topicScores[t] = []
    topicScores[t].push(entry.overallScore)
  }

  const averageByTopic = Object.fromEntries(
    Object.entries(topicScores).map(([t, scores]) => [
      t,
      parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)),
    ])
  )

  return { totalEssays, averageScore, bestScore, topicBreakdown, averageByTopic, improvementCount }
}

export function updateLatestImprovement(improvementData) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const history = JSON.parse(raw)
    if (history.length === 0) return
    history.sort((a, b) => new Date(b.date) - new Date(a.date))
    history[0] = {
      ...history[0],
      hasImprovement: true,
      improvementSummary: improvementData?.summary || null,
      scoreBefore: improvementData?.score_before || null,
      scoreAfter: improvementData?.score_after || null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // ignore storage errors
  }
}

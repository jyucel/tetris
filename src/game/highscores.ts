export interface HighScore {
  name: string
  score: number
  lines: number
  level: number
  date: string
}

const KEY = 'tetris.highscores'
const NAME_KEY = 'tetris.lastName'
export const MAX_HIGH_SCORES = 10

export function loadHighScores(): HighScore[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as HighScore[]) : []
  } catch {
    return []
  }
}

export function qualifies(scores: HighScore[], score: number): boolean {
  if (score <= 0) return false
  return scores.length < MAX_HIGH_SCORES || score > scores[scores.length - 1].score
}

/** Insert a score and persist; returns the new list. */
export function saveHighScore(entry: HighScore): HighScore[] {
  const scores = [...loadHighScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES)
  try {
    localStorage.setItem(KEY, JSON.stringify(scores))
    localStorage.setItem(NAME_KEY, entry.name)
  } catch {
    // Storage unavailable; keep the list in memory only.
  }
  return scores
}

export function lastName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

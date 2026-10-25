import type { HighScore } from '../game/highscores'

interface Props {
  scores: HighScore[]
  highlight?: HighScore | null
}

export function HighScores({ scores, highlight }: Props) {
  if (!scores.length) return <p className="muted small">No scores yet — be the first!</p>
  return (
    <ol className="highscores">
      {scores.map((s, i) => (
        <li key={`${s.date}-${i}`} className={s === highlight ? 'highlight' : ''}>
          <span className="hs-rank">{i + 1}</span>
          <span className="hs-name">{s.name || '—'}</span>
          <span className="hs-score">{s.score.toLocaleString()}</span>
        </li>
      ))}
    </ol>
  )
}

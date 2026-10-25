import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Board } from './components/Board'
import { HighScores } from './components/HighScores'
import { EyeIcon, EyeOffIcon, PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from './components/Icons'
import { PiecePreview } from './components/PiecePreview'
import { TouchControls } from './components/TouchControls'
import type { GameEvent } from './game/engine'
import { lastName, loadHighScores, qualifies, saveHighScore, type HighScore } from './game/highscores'
import { loadShowNext, saveShowNext } from './game/settings'
import { useGame } from './hooks/useGame'

interface Popup {
  id: number
  lines: string[]
}

const CLEAR_NAMES = ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS']
let popupId = 0

function describe(e: GameEvent): string[] | null {
  switch (e.type) {
    case 'clear': {
      const spin = e.tSpin === 'full' ? 'T-SPIN ' : e.tSpin === 'mini' ? 'MINI T-SPIN ' : ''
      const lines = [spin + CLEAR_NAMES[e.rows.length]]
      if (e.backToBack) lines.unshift('BACK-TO-BACK')
      if (e.combo > 0) lines.push(`${e.combo} COMBO`)
      lines.push(`+${e.points.toLocaleString()}`)
      return lines
    }
    case 'tSpin':
      return [e.tSpin === 'mini' ? 'MINI T-SPIN' : 'T-SPIN', `+${e.points.toLocaleString()}`]
    case 'levelUp':
      return [`LEVEL ${e.level}`]
    default:
      return null
  }
}

export default function App() {
  const { game, input, muted, start, togglePause, toggleMute } = useGame()
  const [startLevel, setStartLevel] = useState(1)
  const [scores, setScores] = useState<HighScore[]>(loadHighScores)
  const [submitted, setSubmitted] = useState<HighScore | null>(null)
  const [name, setName] = useState(lastName)
  const [popups, setPopups] = useState<Popup[]>([])
  const [showNext, setShowNext] = useState(loadShowNext)

  const toggleShowNext = useCallback(
    () =>
      setShowNext((show) => {
        saveShowNext(!show)
        return !show
      }),
    [],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyN' && !e.repeat && !(e.target instanceof HTMLInputElement)) toggleShowNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleShowNext])

  useEffect(
    () =>
      game.onEvent((e) => {
        const lines = describe(e)
        if (!lines) return
        const id = ++popupId
        setPopups((p) => [...p.slice(-2), { id, lines }])
        setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 1400)
      }),
    [game],
  )

  const newGame = () => {
    setSubmitted(null)
    setPopups([])
    start(startLevel)
  }

  const canSubmit = game.status === 'over' && !submitted && qualifies(scores, game.score)

  const submitScore = (e: FormEvent) => {
    e.preventDefault()
    const entry: HighScore = {
      name: name.trim().slice(0, 12),
      score: game.score,
      lines: game.lines,
      level: game.level,
      date: new Date().toISOString(),
    }
    setScores(saveHighScore(entry))
    setSubmitted(entry)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          {'TETRIS'.split('').map((c, i) => (
            <span key={i} className={`logo-${i}`}>
              {c}
            </span>
          ))}
        </h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title="Sound (M)">
            {muted ? <SoundOffIcon /> : <SoundOnIcon />}
          </button>
          {(game.status === 'playing' || game.status === 'paused') && (
            <button className="icon-btn" onClick={togglePause} aria-label="Pause" title="Pause (P)">
              {game.status === 'paused' ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
        </div>
      </header>

      <main className="game">
        <div className="side side-left">
          <section className="panel hold-panel">
            <h2>Hold</h2>
            <PiecePreview type={game.hold} dimmed={!game.canHold} />
          </section>

          <section className="panel stats-panel">
            <Stat label="Score" value={game.score.toLocaleString()} />
            <Stat label="Level" value={game.level} />
            <Stat label="Lines" value={game.lines} />
          </section>
        </div>

        <div className="board-wrap">
          <Board game={game} />

          <div className="popups" aria-live="polite">
            {popups.map((p) => (
              <div key={p.id} className="popup">
                {p.lines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            ))}
          </div>

          {game.status !== 'playing' && (
            <div className="overlay">
              {game.status === 'ready' && (
                <>
                  <h2 className="overlay-title">Ready?</h2>
                  <LevelPicker value={startLevel} onChange={setStartLevel} />
                  <button className="primary" onClick={newGame} autoFocus>
                    Start
                  </button>
                  <ControlsHelp />
                </>
              )}

              {game.status === 'paused' && (
                <>
                  <h2 className="overlay-title">Paused</h2>
                  <button className="primary" onClick={togglePause} autoFocus>
                    Resume
                  </button>
                  <button onClick={newGame}>Restart</button>
                </>
              )}

              {game.status === 'over' && (
                <>
                  <h2 className="overlay-title">Game over</h2>
                  <p className="final-score">{game.score.toLocaleString()}</p>
                  {canSubmit ? (
                    <form className="name-form" onSubmit={submitScore}>
                      <label htmlFor="name">New high score! Your name:</label>
                      <div className="name-row">
                        <input
                          id="name"
                          value={name}
                          maxLength={12}
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                          autoComplete="nickname"
                        />
                        <button className="primary" type="submit">
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <HighScores scores={scores} highlight={submitted} />
                      <LevelPicker value={startLevel} onChange={setStartLevel} />
                      <button className="primary" onClick={newGame} autoFocus>
                        Play again
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="side side-right">
          <section className="panel next-panel">
            <h2 className="panel-title">
              Next
              <button
                className="toggle-btn"
                onClick={toggleShowNext}
                aria-pressed={showNext}
                aria-label={showNext ? 'Hide next pieces' : 'Show next pieces'}
                title="Show/hide next pieces (N)"
              >
                {showNext ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </h2>
            <div className="next-list">
              {!showNext ? (
                <span className="muted small">Off</span>
              ) : game.status === 'ready' ? null : (
                game.queue.slice(0, 5).map((type, i) => <PiecePreview key={i} type={type} />)
              )}
            </div>
          </section>

          <section className="panel scores-panel">
            <h2>High scores</h2>
            <HighScores scores={scores} highlight={submitted} />
          </section>
        </div>
      </main>

      <TouchControls input={input} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

function LevelPicker({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  return (
    <label className="level-picker">
      Start level
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: 15 }, (_, i) => i + 1).map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

function ControlsHelp() {
  return (
    <dl className="controls-help">
      <dt>← →</dt>
      <dd>Move</dd>
      <dt>↓</dt>
      <dd>Soft drop</dd>
      <dt>Space</dt>
      <dd>Hard drop</dd>
      <dt>↑ / X</dt>
      <dd>Rotate right</dd>
      <dt>Z / Ctrl</dt>
      <dd>Rotate left</dd>
      <dt>C / Shift</dt>
      <dd>Hold</dd>
      <dt>P / Esc</dt>
      <dd>Pause</dd>
      <dt>N</dt>
      <dd>Show/hide next</dd>
      <dt>M</dt>
      <dd>Mute</dd>
    </dl>
  )
}

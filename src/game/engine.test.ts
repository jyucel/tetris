import { describe, expect, it } from 'vitest'
import { COLS, Game, gravityInterval, pieceCells, ROWS, type Cell } from './engine'
import { createBag, PIECE_TYPES, SHAPES } from './pieces'

/** Deterministic PRNG so tests get a stable piece sequence. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function newGame() {
  const game = new Game({ random: seeded() })
  game.start()
  return game
}

/** Fill a board row except for the given columns. */
function fillRow(game: Game, y: number, holes: number[] = []) {
  game.board[y] = Array.from({ length: COLS }, (_, x) => (holes.includes(x) ? null : 'Z')) as Cell[]
}

describe('pieces', () => {
  it('every rotation of every piece has 4 blocks', () => {
    for (const type of PIECE_TYPES) {
      for (const m of SHAPES[type]) expect(m.flat().filter(Boolean)).toHaveLength(4)
    }
  })

  it('7-bag contains each piece exactly once', () => {
    expect([...createBag(seeded(42))].sort()).toEqual([...PIECE_TYPES].sort())
  })
})

describe('Game', () => {
  it('starts with an active piece and a filled queue', () => {
    const game = newGame()
    expect(game.status).toBe('playing')
    expect(game.active).not.toBeNull()
    expect(game.queue.length).toBeGreaterThanOrEqual(5)
  })

  it('moves are blocked by walls', () => {
    const game = newGame()
    for (let i = 0; i < 20; i++) game.moveLeft()
    expect(Math.min(...pieceCells(game.active!).map(([x]) => x))).toBe(0)
    for (let i = 0; i < 20; i++) game.moveRight()
    expect(Math.max(...pieceCells(game.active!).map(([x]) => x))).toBe(COLS - 1)
  })

  it('hard drop lands the piece on the floor and awards 2 points per row', () => {
    const game = newGame()
    const type = game.active!.type
    const startY = game.active!.y
    const ghost = game.ghostY()
    game.hardDrop()
    expect(game.score).toBe((ghost - startY) * 2)
    expect(game.board[ROWS - 1].some((c) => c === type)).toBe(true)
  })

  it('gravity moves the piece down over time and locks after the lock delay', () => {
    const game = newGame()
    const y = game.active!.y
    game.update(gravityInterval(1) + 1)
    expect(game.active!.y).toBe(y + 1)
    const type = game.active!.type
    for (let i = 0; i < 400; i++) game.update(100)
    expect(game.board.flat().some((c) => c === type)).toBe(true)
  })

  it('clears a full line and scores it', () => {
    const game = newGame()
    game.active = { type: 'I', rotation: 0, x: 3, y: 0 }
    fillRow(game, ROWS - 1, [3, 4, 5, 6])
    game.hardDrop()
    expect(game.lines).toBe(1)
    expect(game.board[ROWS - 1].every((c) => c === null)).toBe(true)
  })

  it('scores a tetris as 800 × level, plus hard drop points', () => {
    const game = newGame()
    for (let y = ROWS - 4; y < ROWS; y++) fillRow(game, y, [0])
    game.active = { type: 'I', rotation: 1, x: -2, y: 0 }
    const dropScore = (game.ghostY() - game.active.y) * 2
    game.hardDrop()
    expect(game.lines).toBe(4)
    expect(game.score).toBe(800 + dropScore)
    expect(game.backToBack).toBe(true)
  })

  it('hold swaps pieces and can only be used once per drop', () => {
    const game = newGame()
    const first = game.active!.type
    const next = game.queue[0]
    game.holdPiece()
    expect(game.hold).toBe(first)
    expect(game.active!.type).toBe(next)
    game.holdPiece()
    expect(game.active!.type).toBe(next)
  })

  it('detects a T-spin double', () => {
    const game = newGame()
    // Classic T-slot: two rows with a T-shaped hole at columns 3-5.
    fillRow(game, ROWS - 1, [4])
    fillRow(game, ROWS - 2, [3, 4, 5])
    game.board[ROWS - 3][3] = 'Z'
    game.active = { type: 'T', rotation: 1, x: 3, y: ROWS - 3 }
    // Rotate from R into the slot (pointing down).
    expect(game.rotateCW()).toBe(true)
    const events: string[] = []
    game.onEvent((e) => {
      if (e.type === 'clear') events.push(`${e.tSpin}:${e.rows.length}`)
    })
    game.hardDrop()
    expect(events).toEqual(['full:2'])
    expect(game.lines).toBe(2)
  })

  it('ends the game when pieces stack to the top', () => {
    const game = newGame()
    for (let i = 0; i < 100 && game.status === 'playing'; i++) game.hardDrop()
    expect(game.status).toBe('over')
  })

  it('pause stops gravity', () => {
    const game = newGame()
    const y = game.active!.y
    game.togglePause()
    game.update(5000)
    expect(game.active!.y).toBe(y)
  })
})

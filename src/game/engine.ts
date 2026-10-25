import { createBag, getKicks, SHAPES, type PieceType, type Rotation } from './pieces'

export const COLS = 10
export const VISIBLE_ROWS = 20
/** Extra rows above the visible field where pieces spawn. */
export const HIDDEN_ROWS = 2
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS
export const QUEUE_SIZE = 5
export const LOCK_DELAY = 500
export const MAX_LOCK_RESETS = 15
export const LINES_PER_LEVEL = 10

export type Cell = PieceType | null
export type Board = Cell[][]

export interface ActivePiece {
  type: PieceType
  rotation: Rotation
  x: number
  y: number
}

export type Status = 'ready' | 'playing' | 'paused' | 'over'

export type TSpin = 'none' | 'mini' | 'full'

export type GameEvent =
  | { type: 'move' }
  | { type: 'rotate' }
  | { type: 'hold' }
  | { type: 'lock' }
  | { type: 'hardDrop'; distance: number }
  | { type: 'clear'; rows: number[]; tSpin: TSpin; backToBack: boolean; combo: number; points: number }
  | { type: 'tSpin'; tSpin: TSpin; points: number }
  | { type: 'levelUp'; level: number }
  | { type: 'gameOver' }

const LINE_POINTS = [0, 100, 300, 500, 800]
const T_SPIN_POINTS = [400, 800, 1200, 1600]
const T_SPIN_MINI_POINTS = [100, 200, 400]

/** Milliseconds per row at a given level (Tetris guideline formula). */
export function gravityInterval(level: number): number {
  return Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000
}

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null))
}

/** Absolute board coordinates of each block of a piece. */
export function pieceCells(piece: ActivePiece): [number, number][] {
  const cells: [number, number][] = []
  SHAPES[piece.type][piece.rotation].forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v) cells.push([piece.x + dx, piece.y + dy])
    }),
  )
  return cells
}

export function collides(board: Board, piece: ActivePiece): boolean {
  return pieceCells(piece).some(
    ([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null),
  )
}

export interface GameOptions {
  startLevel?: number
  random?: () => number
}

export class Game {
  board: Board = emptyBoard()
  active: ActivePiece | null = null
  hold: PieceType | null = null
  canHold = true
  queue: PieceType[] = []
  status: Status = 'ready'
  score = 0
  lines = 0
  level = 1
  startLevel = 1
  combo = -1
  backToBack = false
  softDropping = false

  /** Increments on every visible state change; used by React to re-render. */
  version = 0

  private random: () => number
  private gravityAcc = 0
  private lockTimer = 0
  private lockResets = 0
  private lowestY = 0
  private lastMoveWasRotation = false
  private lastKickIndex = 0
  private listeners = new Set<() => void>()
  private eventListeners = new Set<(e: GameEvent) => void>()

  constructor(options: GameOptions = {}) {
    this.random = options.random ?? Math.random
    this.startLevel = options.startLevel ?? 1
    this.level = this.startLevel
  }

  // --- subscriptions -------------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  onEvent(listener: (e: GameEvent) => void) {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  private changed() {
    this.version++
    this.listeners.forEach((l) => l())
  }

  private emit(event: GameEvent) {
    this.eventListeners.forEach((l) => l(event))
  }

  // --- lifecycle -----------------------------------------------------------

  start(startLevel = this.startLevel) {
    this.board = emptyBoard()
    this.hold = null
    this.canHold = true
    this.queue = []
    this.score = 0
    this.lines = 0
    this.startLevel = startLevel
    this.level = startLevel
    this.combo = -1
    this.backToBack = false
    this.softDropping = false
    this.status = 'playing'
    this.fillQueue()
    this.spawn(this.nextFromQueue())
    this.changed()
  }

  togglePause() {
    if (this.status === 'playing') this.status = 'paused'
    else if (this.status === 'paused') this.status = 'playing'
    else return
    this.changed()
  }

  /** Advance the simulation by `dt` milliseconds. */
  update(dt: number) {
    if (this.status !== 'playing' || !this.active) return

    const normal = gravityInterval(this.level)
    const interval = this.softDropping ? Math.min(normal, normal / 20) : normal
    this.gravityAcc += dt

    let moved = false
    while (this.gravityAcc >= interval) {
      this.gravityAcc -= interval
      if (!this.tryMove(0, 1)) {
        this.gravityAcc = 0
        break
      }
      moved = true
      if (this.softDropping) this.score += 1
    }

    if (this.isGrounded()) {
      this.lockTimer += dt
      if (this.lockTimer >= LOCK_DELAY) this.lock()
    } else {
      this.lockTimer = 0
    }

    if (moved) this.changed()
  }

  // --- player actions ------------------------------------------------------

  moveLeft() {
    return this.shift(-1)
  }

  moveRight() {
    return this.shift(1)
  }

  rotateCW() {
    return this.rotate(1)
  }

  rotateCCW() {
    return this.rotate(-1)
  }

  setSoftDrop(on: boolean) {
    if (this.softDropping === on) return
    this.softDropping = on
    // Make the first soft-drop step happen immediately.
    if (on) this.gravityAcc = Math.max(this.gravityAcc, gravityInterval(this.level) / 20)
  }

  hardDrop() {
    if (!this.canAct()) return
    const piece = this.active!
    const distance = this.ghostY() - piece.y
    piece.y += distance
    if (distance > 0) this.lastMoveWasRotation = false
    this.score += distance * 2
    this.emit({ type: 'hardDrop', distance })
    this.lock()
  }

  holdPiece() {
    if (!this.canAct() || !this.canHold) return
    const current = this.active!.type
    const next = this.hold ?? this.nextFromQueue()
    this.hold = current
    this.canHold = false
    this.spawn(next)
    this.emit({ type: 'hold' })
    this.changed()
  }

  // --- queries -------------------------------------------------------------

  /** Row where the active piece would land if hard-dropped. */
  ghostY(): number {
    const piece = this.active
    if (!piece) return 0
    let y = piece.y
    while (!collides(this.board, { ...piece, y: y + 1 })) y++
    return y
  }

  isGrounded(): boolean {
    const piece = this.active
    return !!piece && collides(this.board, { ...piece, y: piece.y + 1 })
  }

  // --- internals -----------------------------------------------------------

  private canAct() {
    return this.status === 'playing' && this.active !== null
  }

  private fillQueue() {
    while (this.queue.length < QUEUE_SIZE + 7) this.queue.push(...createBag(this.random))
  }

  private nextFromQueue(): PieceType {
    const next = this.queue.shift()!
    this.fillQueue()
    return next
  }

  private spawn(type: PieceType) {
    const width = SHAPES[type][0][0].length
    const piece: ActivePiece = { type, rotation: 0, x: Math.floor((COLS - width) / 2), y: 0 }
    if (collides(this.board, piece)) {
      this.active = piece
      this.gameOver()
      return
    }
    this.active = piece
    // Guideline: drop one row immediately if there is room.
    if (!collides(this.board, { ...piece, y: 1 })) piece.y = 1
    this.gravityAcc = 0
    this.lockTimer = 0
    this.lockResets = 0
    this.lowestY = piece.y
    this.lastMoveWasRotation = false
  }

  private tryMove(dx: number, dy: number): boolean {
    const piece = this.active!
    const moved = { ...piece, x: piece.x + dx, y: piece.y + dy }
    if (collides(this.board, moved)) return false
    this.active = moved
    this.lastMoveWasRotation = false
    if (moved.y > this.lowestY) {
      this.lowestY = moved.y
      this.lockResets = 0
    }
    return true
  }

  private shift(dx: number): boolean {
    if (!this.canAct()) return false
    if (!this.tryMove(dx, 0)) return false
    this.onSuccessfulManipulation()
    this.emit({ type: 'move' })
    this.changed()
    return true
  }

  private rotate(dir: 1 | -1): boolean {
    if (!this.canAct()) return false
    const piece = this.active!
    const to = ((piece.rotation + dir + 4) % 4) as Rotation
    const kicks = getKicks(piece.type, piece.rotation, to)
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i]
      const candidate = { ...piece, rotation: to, x: piece.x + kx, y: piece.y + ky }
      if (!collides(this.board, candidate)) {
        this.active = candidate
        this.lastMoveWasRotation = true
        this.lastKickIndex = i
        if (candidate.y > this.lowestY) {
          this.lowestY = candidate.y
          this.lockResets = 0
        }
        this.onSuccessfulManipulation()
        this.emit({ type: 'rotate' })
        this.changed()
        return true
      }
    }
    return false
  }

  /** Move/rotate resets the lock delay, up to MAX_LOCK_RESETS times. */
  private onSuccessfulManipulation() {
    if (this.lockTimer > 0 && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0
      this.lockResets++
    }
  }

  /** 3-corner T-spin detection. */
  private detectTSpin(): TSpin {
    const piece = this.active!
    if (piece.type !== 'T' || !this.lastMoveWasRotation) return 'none'
    const filled = (dx: number, dy: number) => {
      const x = piece.x + dx
      const y = piece.y + dy
      return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x] !== null)
    }
    // Corners: top-left, top-right, bottom-right, bottom-left (clockwise order).
    const corners = [filled(0, 0), filled(2, 0), filled(2, 2), filled(0, 2)]
    if (corners.filter(Boolean).length < 3) return 'none'
    // The two corners on the side the T points to.
    const front = [corners[piece.rotation], corners[(piece.rotation + 1) % 4]]
    if (front.every(Boolean) || this.lastKickIndex === 4) return 'full'
    return 'mini'
  }

  private lock() {
    const piece = this.active!
    const tSpin = this.detectTSpin()
    const cells = pieceCells(piece)
    for (const [x, y] of cells) {
      if (y >= 0) this.board[y][x] = piece.type
    }
    this.emit({ type: 'lock' })

    // Lock out: the whole piece locked above the visible field.
    if (cells.every(([, y]) => y < HIDDEN_ROWS)) {
      this.gameOver()
      return
    }

    const rows = this.clearLines()
    this.awardPoints(rows, tSpin)
    this.canHold = true
    this.spawn(this.nextFromQueue())
    this.changed()
  }

  private clearLines(): number[] {
    const full: number[] = []
    this.board.forEach((row, y) => {
      if (row.every((c) => c !== null)) full.push(y)
    })
    if (full.length) {
      const remaining = this.board.filter((_, y) => !full.includes(y))
      const fresh = Array.from({ length: full.length }, () => Array<Cell>(COLS).fill(null))
      this.board = [...fresh, ...remaining]
    }
    return full
  }

  private awardPoints(rows: number[], tSpin: TSpin) {
    const count = rows.length
    let points: number
    if (tSpin === 'full') points = T_SPIN_POINTS[count]
    else if (tSpin === 'mini') points = T_SPIN_MINI_POINTS[count]
    else points = LINE_POINTS[count]
    points *= this.level

    if (count === 0) {
      this.combo = -1
      if (points > 0) {
        this.score += points
        this.emit({ type: 'tSpin', tSpin, points })
      }
      return
    }

    const difficult = count === 4 || tSpin !== 'none'
    const b2b = difficult && this.backToBack
    if (b2b) points = Math.floor(points * 1.5)
    this.backToBack = difficult

    this.combo++
    if (this.combo > 0) points += 50 * this.combo * this.level

    this.score += points
    this.emit({ type: 'clear', rows, tSpin, backToBack: b2b, combo: this.combo, points })

    const prevLevel = this.level
    this.lines += count
    this.level = Math.max(this.startLevel, Math.floor(this.lines / LINES_PER_LEVEL) + 1)
    if (this.level > prevLevel) this.emit({ type: 'levelUp', level: this.level })
  }

  private gameOver() {
    this.status = 'over'
    this.softDropping = false
    this.emit({ type: 'gameOver' })
    this.changed()
  }
}

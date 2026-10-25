import type { Game } from './engine'

/** Delayed Auto Shift: how long a direction is held before it repeats. */
export const DAS = 160
/** Auto Repeat Rate: interval between repeats once DAS has charged. */
export const ARR = 35

export type Action =
  | 'left'
  | 'right'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'

/**
 * Translates press/release of abstract actions (from keyboard or touch)
 * into game commands, including auto-repeat for sideways movement.
 */
export class InputController {
  private game: Game
  private direction: 'left' | 'right' | null = null
  private held = new Set<Action>()
  private dasTimer = 0
  private arrTimer = 0

  constructor(game: Game) {
    this.game = game
  }

  press(action: Action) {
    if (this.held.has(action)) return
    this.held.add(action)
    switch (action) {
      case 'left':
      case 'right':
        this.direction = action
        this.dasTimer = 0
        this.arrTimer = 0
        this.shift(action)
        break
      case 'softDrop':
        this.game.setSoftDrop(true)
        break
      case 'hardDrop':
        this.game.hardDrop()
        break
      case 'rotateCW':
        this.game.rotateCW()
        break
      case 'rotateCCW':
        this.game.rotateCCW()
        break
      case 'hold':
        this.game.holdPiece()
        break
    }
  }

  release(action: Action) {
    this.held.delete(action)
    if (action === 'softDrop') this.game.setSoftDrop(false)
    if (action === this.direction) {
      // Fall back to the other direction if it is still held.
      const other = action === 'left' ? 'right' : 'left'
      this.direction = this.held.has(other) ? other : null
      this.dasTimer = 0
      this.arrTimer = 0
    }
  }

  releaseAll() {
    for (const action of [...this.held]) this.release(action)
  }

  update(dt: number) {
    if (!this.direction) return
    this.dasTimer += dt
    if (this.dasTimer < DAS) return
    this.arrTimer += dt
    while (this.arrTimer >= ARR) {
      this.arrTimer -= ARR
      if (!this.shift(this.direction)) {
        this.arrTimer = 0
        break
      }
    }
  }

  private shift(dir: 'left' | 'right') {
    return dir === 'left' ? this.game.moveLeft() : this.game.moveRight()
  }
}

export const KEY_BINDINGS: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'softDrop',
  Space: 'hardDrop',
  ArrowUp: 'rotateCW',
  KeyX: 'rotateCW',
  KeyZ: 'rotateCCW',
  ControlLeft: 'rotateCCW',
  ControlRight: 'rotateCCW',
  KeyC: 'hold',
  ShiftLeft: 'hold',
  ShiftRight: 'hold',
}

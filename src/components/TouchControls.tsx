import type { Action, InputController } from '../game/input'

interface Props {
  input: InputController
}

const BUTTONS: { action: Action; label: string; title: string }[] = [
  { action: 'hold', label: 'HOLD', title: 'Hold' },
  { action: 'rotateCCW', label: '⟲', title: 'Rotate left' },
  { action: 'rotateCW', label: '⟳', title: 'Rotate right' },
  { action: 'hardDrop', label: '⤓', title: 'Hard drop' },
  { action: 'left', label: '◀', title: 'Move left' },
  { action: 'softDrop', label: '▼', title: 'Soft drop' },
  { action: 'right', label: '▶', title: 'Move right' },
]

export function TouchControls({ input }: Props) {
  return (
    <div className="touch-controls">
      {BUTTONS.map(({ action, label, title }) => (
        <button
          key={action}
          className={`touch-btn touch-${action}`}
          aria-label={title}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            input.press(action)
          }}
          onPointerUp={() => input.release(action)}
          onPointerCancel={() => input.release(action)}
          onContextMenu={(e) => e.preventDefault()}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

import { COLORS, SHAPES, type PieceType } from '../game/pieces'

interface Props {
  type: PieceType | null
  dimmed?: boolean
}

/** Renders a piece in its spawn orientation, trimmed to its filled rows. */
export function PiecePreview({ type, dimmed }: Props) {
  if (!type) return <div className="preview" />
  const rows = SHAPES[type][0].filter((row) => row.some(Boolean))
  return (
    <div
      className={`preview${dimmed ? ' dimmed' : ''}`}
      style={{ gridTemplateColumns: `repeat(${rows[0].length}, var(--mini))` }}
      aria-label={`${type} piece`}
    >
      {rows.flat().map((v, i) => (
        <span key={i} className={v ? 'mini-block' : ''} style={v ? { background: COLORS[type] } : undefined} />
      ))}
    </div>
  )
}

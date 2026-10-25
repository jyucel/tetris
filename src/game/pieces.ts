export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

export const PIECE_TYPES: readonly PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

/** Rotation state: 0 = spawn, 1 = right (CW), 2 = 180, 3 = left (CCW). */
export type Rotation = 0 | 1 | 2 | 3

export type Matrix = number[][]

/** Spawn orientations, as defined by the SRS guideline. */
const SPAWN_SHAPES: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
}

function rotateClockwise(m: Matrix): Matrix {
  const n = m.length
  return m.map((_, y) => m.map((_, x) => m[n - 1 - x][y]))
}

/** SHAPES[type][rotation] — precomputed matrices for every rotation state. */
export const SHAPES: Record<PieceType, Matrix[]> = Object.fromEntries(
  PIECE_TYPES.map((type) => {
    const states = [SPAWN_SHAPES[type]]
    for (let i = 1; i < 4; i++) states.push(rotateClockwise(states[i - 1]))
    return [type, states]
  }),
) as Record<PieceType, Matrix[]>

export const COLORS: Record<PieceType, string> = {
  I: '#22d3ee',
  J: '#3b82f6',
  L: '#f97316',
  O: '#facc15',
  S: '#4ade80',
  T: '#c084fc',
  Z: '#f43f5e',
}

type Kick = readonly [number, number]

// SRS wall kick offsets, written with y pointing UP as in the guideline.
// Keyed by "from>to" rotation states.
const JLSTZ_KICKS: Record<string, readonly Kick[]> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

const I_KICKS: Record<string, readonly Kick[]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

/** Kick offsets to try, converted to screen coordinates (y pointing down). */
export function getKicks(type: PieceType, from: Rotation, to: Rotation): Kick[] {
  if (type === 'O') return [[0, 0]]
  const table = type === 'I' ? I_KICKS : JLSTZ_KICKS
  return table[`${from}>${to}`].map(([x, y]) => [x, -y] as const)
}

/** 7-bag randomizer: every piece appears once in each group of seven. */
export function createBag(random: () => number = Math.random): PieceType[] {
  const bag = [...PIECE_TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

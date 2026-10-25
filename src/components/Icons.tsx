const common = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function SoundOnIcon() {
  return (
    <svg {...common}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </svg>
  )
}

export function SoundOffIcon() {
  return (
    <svg {...common}>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg {...common}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  )
}

export function PlayIcon() {
  return (
    <svg {...common}>
      <path d="M7 4l13 8-13 8V4z" />
    </svg>
  )
}

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

export function EyeIcon() {
  return (
    <svg {...common} width={14} height={14}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg {...common} width={14} height={14}>
      <path d="M9.9 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M2 2l20 20" />
    </svg>
  )
}

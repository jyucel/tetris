import type { GameEvent } from './engine'

const MUTE_KEY = 'tetris.muted'

/** Tiny Web Audio synth — no audio files needed. */
export class Sound {
  muted: boolean
  private ctx: AudioContext | null = null
  private out: AudioNode | null = null

  constructor() {
    this.muted = readMuted()
  }

  setMuted(muted: boolean) {
    this.muted = muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      // Storage unavailable; the setting just won't persist.
    }
  }

  /** Must be called from a user gesture so browsers allow audio. */
  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      // Master volume into a compressor so stacked sounds don't clip.
      const master = this.ctx.createGain()
      master.gain.value = 0.8
      const compressor = this.ctx.createDynamicsCompressor()
      master.connect(compressor).connect(this.ctx.destination)
      this.out = master
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  play(event: GameEvent) {
    switch (event.type) {
      case 'move':
        return this.tone(520, 0.05, 'square', 0.12)
      case 'rotate':
        return this.tone(780, 0.07, 'square', 0.13)
      case 'hold':
        return this.sweep(500, 1000, 0.12, 0.25)
      case 'hardDrop':
        return this.sweep(900, 200, 0.15, 0.35)
      case 'lock':
        return this.tone(300, 0.08, 'square', 0.15)
      case 'tSpin':
        return this.arpeggio([392, 523], 0.07)
      case 'clear': {
        const n = event.rows.length
        const notes = n >= 4 ? [523, 659, 784, 1047, 1319] : [440, 554, 659, 880].slice(0, n + 1)
        return this.arpeggio(notes, 0.06)
      }
      case 'levelUp':
        return this.arpeggio([523, 659, 784, 1047], 0.09)
      case 'gameOver':
        return this.arpeggio([392, 330, 262, 196], 0.18, 'triangle')
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
    const ctx = this.ctx
    if (this.muted || !ctx || !this.out || ctx.state !== 'running') return
    const t = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(this.out)
    osc.start(t)
    osc.stop(t + duration)
  }

  private sweep(from: number, to: number, duration: number, volume: number) {
    const ctx = this.ctx
    if (this.muted || !ctx || !this.out || ctx.state !== 'running') return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(to, t + duration)
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(this.out)
    osc.start(t)
    osc.stop(t + duration)
  }

  private arpeggio(notes: number[], step: number, type: OscillatorType = 'square') {
    notes.forEach((f, i) => this.tone(f, step * 1.6, type, 0.16, i * step))
  }
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

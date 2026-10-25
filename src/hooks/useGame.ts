import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Game } from '../game/engine'
import { InputController, KEY_BINDINGS } from '../game/input'
import { Sound } from '../game/sound'

/** Owns the game, sound and input instances and drives the main loop. */
export function useGame() {
  const [{ game, sound, input }] = useState(() => {
    const game = new Game()
    return { game, sound: new Sound(), input: new InputController(game) }
  })
  const [muted, setMutedState] = useState(sound.muted)

  // Re-render whenever the game reports a change.
  useSyncExternalStore(game.subscribe, () => game.version)

  const start = useCallback(
    (level?: number) => {
      sound.unlock()
      input.releaseAll()
      game.start(level)
    },
    [game, sound, input],
  )

  const toggleMute = useCallback(() => {
    sound.setMuted(!sound.muted)
    setMutedState(sound.muted)
  }, [sound])

  const togglePause = useCallback(() => {
    input.releaseAll()
    game.togglePause()
  }, [game, input])

  useEffect(() => game.onEvent((e) => sound.play(e)), [game, sound])

  // Browsers only allow audio after a user gesture; unlock on any input.
  useEffect(() => {
    const unlock = () => sound.unlock()
    window.addEventListener('keydown', unlock)
    window.addEventListener('pointerdown', unlock)
    return () => {
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pointerdown', unlock)
    }
  }, [sound])

  // Main loop.
  useEffect(() => {
    let last = performance.now()
    let frame = requestAnimationFrame(function loop(now) {
      // Clamp dt so a stalled tab doesn't fast-forward the game.
      const dt = Math.min(now - last, 100)
      last = now
      input.update(dt)
      game.update(dt)
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [game, input])

  // Keyboard.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      const action = KEY_BINDINGS[e.code]
      if (action) {
        e.preventDefault()
        if (!e.repeat && game.status === 'playing') input.press(action)
        return
      }
      if (e.repeat) return
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause()
      else if (e.code === 'KeyM') toggleMute()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_BINDINGS[e.code]
      if (action) input.release(action)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [game, input, togglePause, toggleMute])

  // Auto-pause when the tab or window loses focus.
  useEffect(() => {
    const pause = () => {
      input.releaseAll()
      if (game.status === 'playing') game.togglePause()
    }
    const onVisibility = () => document.hidden && pause()
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [game, input])

  return { game, input, muted, start, togglePause, toggleMute }
}

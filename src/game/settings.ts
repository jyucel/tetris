const SHOW_NEXT_KEY = 'tetris.showNext'

export function loadShowNext(): boolean {
  try {
    return localStorage.getItem(SHOW_NEXT_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveShowNext(show: boolean) {
  try {
    localStorage.setItem(SHOW_NEXT_KEY, show ? '1' : '0')
  } catch {
    // Storage unavailable; the setting just won't persist.
  }
}

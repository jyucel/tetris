# Tetris

A modern Tetris game for the browser, built with **React 19 + TypeScript + Vite**.

**▶ Play it here: https://jyucel.github.io/tetris/**

## Features

- Rules from the Tetris guideline: **SRS rotation with wall kicks**, 7-bag randomizer, lock delay (500 ms, 15 move resets)
- **Hold piece**, **5-piece next queue**, **ghost piece**
- Scoring with **T-spins** (incl. mini), **back-to-back** bonus and **combos**
- Level progression every 10 lines, using the guideline gravity curve; selectable start level
- **High scores** saved locally in the browser
- **Sound effects**, synthesized live with the Web Audio API (no audio files)
- **Mobile support**: on-screen buttons plus gestures on the board
- Auto-pause when the tab loses focus

## Controls

| Action       | Keyboard  | Touch                       |
| ------------ | --------- | --------------------------- |
| Move         | ← →       | ◀ ▶ buttons / drag sideways |
| Soft drop    | ↓         | ▼ button / drag down        |
| Hard drop    | Space     | ⤓ button / flick down       |
| Rotate right | ↑ / X     | ⟳ button / tap the board    |
| Rotate left  | Z / Ctrl  | ⟲ button                    |
| Hold         | C / Shift | HOLD button                 |
| Pause        | P / Esc   | pause button                |
| Mute         | M         | speaker button              |

## Development

```bash
npm install
npm run dev      # start dev server
npm test         # run engine unit tests (Vitest)
npm run lint     # lint (oxlint)
npm run build    # production build into dist/
```

Every push to `main` is tested and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Project structure

```
src/
  game/              framework-free game logic
    pieces.ts        tetromino shapes, colors, SRS kick tables, 7-bag
    engine.ts        Game class: gravity, locking, line clears, scoring, hold
    input.ts         keyboard/touch → actions, with DAS/ARR auto-repeat
    sound.ts         Web Audio sound effects
    highscores.ts    localStorage high score table
    engine.test.ts   unit tests
  hooks/useGame.ts   wires the engine into React (main loop, keyboard)
  components/        Board (canvas), previews, touch controls, high scores
  App.tsx            layout, overlays, score popups
```

The engine doesn't depend on React, so it can be unit tested on its own. React only re-renders the side panels when something changes. The board is drawn to a `<canvas>` on every animation frame.

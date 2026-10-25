import { useEffect, useRef } from 'react'
import { COLS, HIDDEN_ROWS, pieceCells, VISIBLE_ROWS, type Game } from '../game/engine'
import { COLORS } from '../game/pieces'

const FLASH_MS = 220

interface Props {
  game: Game
}

export function Board({ game }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Render loop.
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let flash: { rows: number[]; until: number } | null = null

    const unsubscribe = game.onEvent((e) => {
      if (e.type === 'clear') flash = { rows: e.rows, until: performance.now() + FLASH_MS }
    })

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    let frame = requestAnimationFrame(function draw(now) {
      const size = canvas.width / COLS
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Grid.
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let x = 1; x < COLS; x++) line(ctx, x * size, 0, x * size, canvas.height)
      for (let y = 1; y < VISIBLE_ROWS; y++) line(ctx, 0, y * size, canvas.width, y * size)

      // Locked blocks.
      game.board.forEach((row, y) =>
        row.forEach((cell, x) => {
          if (cell && y >= HIDDEN_ROWS) drawBlock(ctx, x, y - HIDDEN_ROWS, size, COLORS[cell])
        }),
      )

      const piece = game.active
      if (piece && game.status !== 'ready') {
        const color = COLORS[piece.type]
        if (game.status === 'playing') {
          const ghost = { ...piece, y: game.ghostY() }
          for (const [x, y] of pieceCells(ghost)) {
            if (y >= HIDDEN_ROWS) drawGhost(ctx, x, y - HIDDEN_ROWS, size, color)
          }
        }
        for (const [x, y] of pieceCells(piece)) {
          if (y >= HIDDEN_ROWS) drawBlock(ctx, x, y - HIDDEN_ROWS, size, color)
        }
      }

      if (flash && now < flash.until) {
        ctx.fillStyle = `rgba(255,255,255,${(0.7 * (flash.until - now)) / FLASH_MS})`
        for (const y of flash.rows) ctx.fillRect(0, (y - HIDDEN_ROWS) * size, canvas.width, size)
      }

      frame = requestAnimationFrame(draw)
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
    }
  }, [game])

  // Touch gestures: tap = rotate, drag sideways = move, drag down = soft drop,
  // flick down = hard drop.
  useEffect(() => {
    const canvas = canvasRef.current!
    let touch: { id: number; x: number; y: number; t: number; cols: number; moved: boolean } | null = null

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || touch) return
      touch = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), cols: 0, moved: false }
    }
    const onMove = (e: PointerEvent) => {
      if (!touch || e.pointerId !== touch.id) return
      const cell = canvas.getBoundingClientRect().width / COLS
      const dx = e.clientX - touch.x
      const dy = e.clientY - touch.y
      const target = Math.round(dx / cell)
      while (touch.cols < target && game.moveRight()) touch.cols++
      while (touch.cols > target && game.moveLeft()) touch.cols--
      if (touch.cols !== target) touch.cols = target
      if (Math.abs(dx) > cell / 2 || Math.abs(dy) > cell / 2) touch.moved = true
      game.setSoftDrop(dy > cell * 1.5 && Math.abs(dy) > Math.abs(dx))
    }
    const onUp = (e: PointerEvent) => {
      if (!touch || e.pointerId !== touch.id) return
      const dt = performance.now() - touch.t
      const dx = e.clientX - touch.x
      const dy = e.clientY - touch.y
      game.setSoftDrop(false)
      if (!touch.moved && dt < 300) game.rotateCW()
      else if (dy > 60 && dy / dt > 0.8 && Math.abs(dy) > Math.abs(dx) * 2) game.hardDrop()
      touch = null
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [game])

  return <canvas ref={canvasRef} className="board" aria-label="Tetris board" />
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5)
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5)
  ctx.stroke()
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const px = x * size
  const py = y * size
  const bevel = Math.max(2, size * 0.12)
  ctx.fillStyle = color
  ctx.fillRect(px, py, size, size)
  // Light top-left, dark bottom-right bevel.
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(px, py, size, bevel)
  ctx.fillRect(px, py, bevel, size)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(px, py + size - bevel, size, bevel)
  ctx.fillRect(px + size - bevel, py, bevel, size)
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 1
  ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)
}

function drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const inset = Math.max(1, size * 0.06)
  ctx.globalAlpha = 0.18
  ctx.fillStyle = color
  ctx.fillRect(x * size, y * size, size, size)
  ctx.globalAlpha = 0.7
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, size * 0.06)
  ctx.strokeRect(x * size + inset, y * size + inset, size - inset * 2, size - inset * 2)
  ctx.globalAlpha = 1
}

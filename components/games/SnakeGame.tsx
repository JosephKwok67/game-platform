'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveScore } from '@/lib/actions'
import SnakeLeaderboard from '@/components/SnakeLeaderboard'

const GRID_SIZE = 20
const TILE_COUNT = 30
const CANVAS_SIZE = 600

const DIFFICULTY = {
  easy: { name: '简单', obstacleCount: 0, baseDelay: 120, speedUp: 0, multiplier: 1.0, color: '#4ade80' },
  medium: { name: '中等', obstacleCount: 8, baseDelay: 100, speedUp: 2, multiplier: 1.25, color: '#ff9e00' },
  hard: { name: '困难', obstacleCount: 18, baseDelay: 80, speedUp: 4, multiplier: 1.5, color: '#f87171' },
}

type GameMode = 'endless' | 'level'
type Difficulty = keyof typeof DIFFICULTY
type MobileControl = 'swipe' | 'arrows' | 'joystick'

interface SnakeGameProps {
  userId?: string
  gameMode?: GameMode
  difficulty?: Difficulty
  level?: number
  onScore?: (score: number) => void
  onGameOver?: (score: number) => void
}

export default function SnakeGame({
  userId,
  gameMode = 'endless',
  difficulty = 'easy',
  level: startLevel = 1,
  onScore,
  onGameOver,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const loopRef = useRef<number | null>(null)

  const snakeRef = useRef<{ x: number; y: number }[]>([])
  const dxRef = useRef(GRID_SIZE)
  const dyRef = useRef(0)
  const nextDxRef = useRef(GRID_SIZE)
  const nextDyRef = useRef(0)
  const scoreRef = useRef(0)
  const levelRef = useRef(startLevel)
  const obstaclesRef = useRef<{ x: number; y: number }[]>([])
  const foodsRef = useRef<{ x: number; y: number; color: string }[]>([])
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[]>([])
  const runningRef = useRef(false)
  const pausedRef = useRef(false)
  const hueRef = useRef(0)

  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [paused, setPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [countdown, setCountdown] = useState<string | null>(null)
  const [controlMode, setControlMode] = useState<MobileControl>('swipe')
  const [isTouch, setIsTouch] = useState(false)
  const [joystickActive, setJoystickActive] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'guest' | 'error' | null>(null)
  const [showBoard, setShowBoard] = useState(false)
  const joystickOriginRef = useRef({ x: 0, y: 0 })
  const joystickTouchIdRef = useRef<number | null>(null)

  // Touch swipe refs
  const activeTouchIdRef = useRef<number | null>(null)
  const lastSwipeRef = useRef({ x: 0, y: 0 })
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  const endlessDifficultyRef = useRef<Difficulty>(difficulty)

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null)
  const musicTimerRef = useRef<number | null>(null)
  const musicPlayingRef = useRef(false)
  const melodyRef = useRef([261.63, 329.63, 392, 523.25, 392, 329.63, 261.63, 196])
  const melodyIndexRef = useRef(0)

  const initAudio = () => {
    if (typeof window === 'undefined') return
    if (!audioCtxRef.current) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      audioCtxRef.current = new AudioContextClass()
    }
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
  }

  const playTone = (freq: number, type: OscillatorType, duration: number, volume: number) => {
    if (!audioCtxRef.current) return
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  const playEatSound = () => {
    playTone(880, 'sine', 0.08, 0.1)
    setTimeout(() => playTone(1100, 'sine', 0.1, 0.08), 40)
  }

  const playGameOverSound = () => {
    playTone(200, 'sawtooth', 0.4, 0.12)
    setTimeout(() => playTone(150, 'sawtooth', 0.5, 0.12), 200)
    setTimeout(() => playTone(100, 'sawtooth', 0.6, 0.12), 400)
  }

  const playRespawnSound = () => {
    playTone(440, 'sine', 0.1, 0.1)
    setTimeout(() => playTone(660, 'sine', 0.15, 0.1), 100)
  }

  const startMusic = () => {
    if (musicPlayingRef.current) return
    initAudio()
    musicPlayingRef.current = true
    melodyIndexRef.current = 0
    musicTimerRef.current = window.setInterval(() => {
      if (!musicPlayingRef.current || pausedRef.current || !runningRef.current) return
      const freq = melodyRef.current[melodyIndexRef.current % melodyRef.current.length]
      playTone(freq, 'sine', 0.18, 0.04)
      melodyIndexRef.current++
    }, 280)
  }

  const stopMusic = () => {
    musicPlayingRef.current = false
    if (musicTimerRef.current) {
      clearInterval(musicTimerRef.current)
      musicTimerRef.current = null
    }
  }

  useEffect(() => {
    setIsTouch('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('snakeMobileControl') as MobileControl
    if (saved === 'arrows' || saved === 'joystick') setControlMode(saved)
  }, [])

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    ctxRef.current = c.getContext('2d')
    initGame()

    return () => {
      if (loopRef.current) clearInterval(loopRef.current)
      stopMusic()
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, difficulty, startLevel])

  // 首次用户交互后解锁音频上下文
  useEffect(() => {
    const unlock = () => initAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) e.preventDefault()
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dyRef.current === 0) { nextDxRef.current = 0; nextDyRef.current = -GRID_SIZE }
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dyRef.current === 0) { nextDxRef.current = 0; nextDyRef.current = GRID_SIZE }
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dxRef.current === 0) { nextDxRef.current = -GRID_SIZE; nextDyRef.current = 0 }
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dxRef.current === 0) { nextDxRef.current = GRID_SIZE; nextDyRef.current = 0 }
          break
        case ' ':
          initAudio()
          togglePause()
          break
        case 'r':
        case 'R':
          initAudio()
          restartGame()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Swipe handling
  useEffect(() => {
    if (!isTouch || controlMode !== 'swipe') return
    const interactive = (el: EventTarget | null) =>
      el instanceof Element &&
      el.closest('button, .dpad-btn, .control-option, #joystick, .joystick-base, #pauseBtn')

    const onStart = (e: TouchEvent) => {
      if (interactive(e.target)) return
      const t = e.touches[0]
      activeTouchIdRef.current = t.identifier
      lastSwipeRef.current = { x: t.clientX, y: t.clientY }
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
    }
    const onMove = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return
      const t = Array.from(e.changedTouches).find((x) => x.identifier === activeTouchIdRef.current)
      if (!t) return
      const dx = t.clientX - lastSwipeRef.current.x
      const dy = t.clientY - lastSwipeRef.current.y
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 22) {
        handleSwipe(dx, dy)
        lastSwipeRef.current = { x: t.clientX, y: t.clientY }
      }
    }
    const onEnd = (e: TouchEvent) => {
      if (activeTouchIdRef.current === null) return
      const t = Array.from(e.changedTouches).find((x) => x.identifier === activeTouchIdRef.current)
      if (!t) return
      activeTouchIdRef.current = null
      handleSwipe(t.clientX - touchStartRef.current.x, t.clientY - touchStartRef.current.y)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [isTouch, controlMode])

  const handleSwipe = (dx: number, dy: number) => {
    initAudio()
    if (!runningRef.current || pausedRef.current) return
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) >= 22 && dxRef.current === 0) {
        nextDxRef.current = dx > 0 ? GRID_SIZE : -GRID_SIZE
        nextDyRef.current = 0
      }
    } else {
      if (Math.abs(dy) >= 22 && dyRef.current === 0) {
        nextDxRef.current = 0
        nextDyRef.current = dy > 0 ? GRID_SIZE : -GRID_SIZE
      }
    }
  }

  const setDirection = (dir: string) => {
    initAudio()
    if (!runningRef.current || pausedRef.current) return
    if (dir === 'up' && dyRef.current === 0) { nextDxRef.current = 0; nextDyRef.current = -GRID_SIZE }
    if (dir === 'down' && dyRef.current === 0) { nextDxRef.current = 0; nextDyRef.current = GRID_SIZE }
    if (dir === 'left' && dxRef.current === 0) { nextDxRef.current = -GRID_SIZE; nextDyRef.current = 0 }
    if (dir === 'right' && dxRef.current === 0) { nextDxRef.current = GRID_SIZE; nextDyRef.current = 0 }
  }

  const generateObstacles = (count: number) => {
    obstaclesRef.current = []
    const safe: { x: number; y: number }[] = []
    for (let x = 3; x <= 16; x++) for (let y = 5; y <= 15; y++) safe.push({ x: x * GRID_SIZE, y: y * GRID_SIZE })
    for (let x = 12; x <= 18; x++) for (let y = 12; y <= 18; y++) safe.push({ x: x * GRID_SIZE, y: y * GRID_SIZE })

    const margin = gameMode === 'endless' && DIFFICULTY[endlessDifficultyRef.current].obstacleCount >= 8 ? 2 : 1
    const minTile = margin
    const maxTile = TILE_COUNT - margin
    let attempts = 0
    while (obstaclesRef.current.length < count && attempts < count * 150) {
      attempts++
      const candidate = {
        x: (minTile + Math.floor(Math.random() * (maxTile - minTile))) * GRID_SIZE,
        y: (minTile + Math.floor(Math.random() * (maxTile - minTile))) * GRID_SIZE,
      }
      const inSafe = safe.some((p) => p.x === candidate.x && p.y === candidate.y)
      const dup = obstaclesRef.current.some((o) => o.x === candidate.x && o.y === candidate.y)
      if (!inSafe && !dup) obstaclesRef.current.push(candidate)
    }
  }

  const spawnFoods = (count: number) => {
    const occupied = (x: number, y: number) =>
      snakeRef.current.some((s) => s.x === x && s.y === y) ||
      obstaclesRef.current.some((o) => o.x === x && o.y === y) ||
      foodsRef.current.some((f) => f.x === x && f.y === y)

    let attempts = 0
    while (foodsRef.current.length < count && attempts < 200) {
      attempts++
      const x = Math.floor(Math.random() * TILE_COUNT) * GRID_SIZE
      const y = Math.floor(Math.random() * TILE_COUNT) * GRID_SIZE
      if (!occupied(x, y)) {
        foodsRef.current.push({ x, y, color: `hsl(${(hueRef.current + 180) % 360}, 100%, 60%)` })
      }
    }
  }

  const getEndlessFoodCount = () =>
    gameMode === 'endless' && DIFFICULTY[endlessDifficultyRef.current].obstacleCount > 0 ? 2 : 1

  const getBaseDelay = () => {
    if (gameMode === 'endless') return DIFFICULTY[endlessDifficultyRef.current].baseDelay
    return Math.max(45, 100 - levelRef.current * 2)
  }

  const initGame = () => {
    snakeRef.current = [
      { x: 10 * GRID_SIZE, y: 10 * GRID_SIZE },
      { x: 9 * GRID_SIZE, y: 10 * GRID_SIZE },
      { x: 8 * GRID_SIZE, y: 10 * GRID_SIZE },
    ]
    dxRef.current = GRID_SIZE
    dyRef.current = 0
    nextDxRef.current = GRID_SIZE
    nextDyRef.current = 0
    scoreRef.current = 0
    setScore(0)
    particlesRef.current = []
    foodsRef.current = []
    obstaclesRef.current = []
    levelRef.current = gameMode === 'level' ? startLevel : 1
    runningRef.current = true
    pausedRef.current = false
    setPaused(false)
    setIsGameOver(false)
    setSaveStatus(null)
    endlessDifficultyRef.current = difficulty

    if (gameMode === 'level') {
      generateObstacles(levelRef.current * 2 + 2)
      spawnFoods(1)
    } else if (gameMode === 'endless') {
      const d = DIFFICULTY[endlessDifficultyRef.current]
      if (d.obstacleCount > 0) generateObstacles(d.obstacleCount)
      spawnFoods(getEndlessFoodCount())
    }

    if (loopRef.current) clearInterval(loopRef.current)
    loopRef.current = window.setInterval(gameLoop, getBaseDelay())
    startMusic()
  }

  const restartGame = () => {
    if (gameMode === 'endless' && !endlessDifficultyRef.current) endlessDifficultyRef.current = 'easy'
    playRespawnSound()
    initGame()
  }

  const gameLoop = () => {
    update()
    draw()
    hueRef.current = (hueRef.current + 1) % 360
  }

  const addScore = (points: number) => {
    if (gameMode === 'endless') {
      scoreRef.current += Math.round(points * DIFFICULTY[endlessDifficultyRef.current].multiplier)
    } else {
      scoreRef.current += points
    }
    setScore(scoreRef.current)
    onScore?.(scoreRef.current)
  }

  const update = () => {
    if (!runningRef.current || pausedRef.current) return

    dxRef.current = nextDxRef.current
    dyRef.current = nextDyRef.current

    const head = { x: snakeRef.current[0].x + dxRef.current, y: snakeRef.current[0].y + dyRef.current }

    if (head.x < 0 || head.x >= CANVAS_SIZE || head.y < 0 || head.y >= CANVAS_SIZE) {
      doGameOver()
      return
    }
    if (snakeRef.current.some((s) => s.x === head.x && s.y === head.y)) {
      doGameOver()
      return
    }
    if (obstaclesRef.current.some((o) => o.x === head.x && o.y === head.y)) {
      doGameOver()
      return
    }

    snakeRef.current.unshift(head)

    const eatenIdx = foodsRef.current.findIndex((f) => f.x === head.x && f.y === head.y)
    if (eatenIdx !== -1) {
      const eaten = foodsRef.current[eatenIdx]
      foodsRef.current.splice(eatenIdx, 1)
      addScore(10 + (gameMode === 'level' ? levelRef.current : 0))
      playEatSound()
      createParticles(eaten.x, eaten.y, eaten.color)
      spawnFoods(getEndlessFoodCount())
      if (gameMode === 'endless') {
        const d = DIFFICULTY[endlessDifficultyRef.current]
        if (d.speedUp > 0 && scoreRef.current > 0 && scoreRef.current % (d.speedUp * 10) === 0) {
          speedUp()
        }
      }
    } else {
      snakeRef.current.pop()
    }

    // update particles
    particlesRef.current = particlesRef.current
      .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.02 }))
      .filter((p) => p.life > 0)
  }

  const speedUp = () => {
    if (!loopRef.current) return
    clearInterval(loopRef.current)
    const d = DIFFICULTY[endlessDifficultyRef.current]
    const reductions = Math.floor(scoreRef.current / (d.speedUp * 10))
    const newDelay = Math.max(45, d.baseDelay - reductions * 2)
    loopRef.current = window.setInterval(gameLoop, newDelay)
  }

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: x + GRID_SIZE / 2,
        y: y + GRID_SIZE / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color,
        size: Math.random() * 4 + 2,
      })
    }
  }

  const doGameOver = async () => {
    runningRef.current = false
    pausedRef.current = false
    setPaused(false)
    setIsGameOver(true)
    if (loopRef.current) clearInterval(loopRef.current)
    stopMusic()
    playGameOverSound()

    const hs = Math.max(highScore, scoreRef.current)
    setHighScore(hs)
    localStorage.setItem('snakeHighScore', String(hs))

    if (userId) {
      try {
        const result = await saveScore({
          game: 'snake',
          mode: gameMode === 'endless' ? endlessDifficultyRef.current : `level-${levelRef.current}`,
          score: scoreRef.current,
          level: levelRef.current,
        })
        if (result.success) {
          setSaveStatus('saved')
        } else {
          console.error('分数上传失败:', result.error)
          setSaveStatus('error')
        }
      } catch (e) {
        console.error('分数上传异常:', e)
        setSaveStatus('error')
      }
    } else {
      // 未登录时存到本地榜单
      const local = JSON.parse(localStorage.getItem('snakeLocalScores') || '[]')
      local.push({ score: scoreRef.current, mode: gameMode, date: new Date().toLocaleDateString() })
      local.sort((a: any, b: any) => b.score - a.score)
      localStorage.setItem('snakeLocalScores', JSON.stringify(local.slice(0, 20)))
      setSaveStatus('guest')
    }
    onGameOver?.(scoreRef.current)
  }

  const draw = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    drawGrid(ctx)
    drawObstacles(ctx)
    drawFood(ctx)
    drawSnake(ctx)
    drawParticles(ctx)
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 0; i <= TILE_COUNT; i++) {
      ctx.beginPath()
      ctx.moveTo(i * GRID_SIZE, 0)
      ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * GRID_SIZE)
      ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE)
      ctx.stroke()
    }
  }

  const drawSnake = (ctx: CanvasRenderingContext2D) => {
    snakeRef.current.forEach((seg, i) => {
      const grad = ctx.createLinearGradient(seg.x, seg.y, seg.x + GRID_SIZE, seg.y + GRID_SIZE)
      grad.addColorStop(0, i === 0 ? '#ff6b35' : '#ff9e00')
      grad.addColorStop(1, i === 0 ? '#9d4edd' : '#ff6b35')
      ctx.fillStyle = grad
      ctx.shadowBlur = i === 0 ? 15 : 8
      ctx.shadowColor = '#ff6b35'
      ctx.beginPath()
      ctx.roundRect(seg.x + 1, seg.y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4)
      ctx.fill()
      ctx.shadowBlur = 0
    })
  }

  const drawFood = (ctx: CanvasRenderingContext2D) => {
    foodsRef.current.forEach((f) => {
      ctx.fillStyle = f.color
      ctx.shadowBlur = 15
      ctx.shadowColor = f.color
      ctx.beginPath()
      ctx.arc(f.x + GRID_SIZE / 2, f.y + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })
  }

  const drawObstacles = (ctx: CanvasRenderingContext2D) => {
    obstaclesRef.current.forEach((o) => {
      const x = o.x + 1
      const y = o.y + 1
      const size = GRID_SIZE - 2
      ctx.fillStyle = '#8B5A2B'
      ctx.shadowBlur = 6
      ctx.shadowColor = '#5C3A1E'
      ctx.beginPath()
      ctx.roundRect(x, y, size, size, 3)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#6B4226'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x + 3, y + 4)
      ctx.lineTo(x + size - 3, y + 4)
      ctx.moveTo(x + 2, y + 9)
      ctx.lineTo(x + size - 2, y + 9)
      ctx.stroke()
    })
  }

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }

  const togglePause = () => {
    if (!runningRef.current) return
    if (pausedRef.current) {
      resumeWithCountdown()
    } else {
      pausedRef.current = true
      setPaused(true)
      stopMusic()
    }
  }

  const resumeWithCountdown = () => {
    let count = 3
    setCountdown(String(count))
    const timer = window.setInterval(() => {
      count--
      if (count > 0) setCountdown(String(count))
      else if (count === 0) {
        setCountdown('GO!')
        startMusic()
      } else {
        clearInterval(timer)
        setCountdown(null)
        pausedRef.current = false
        setPaused(false)
      }
    }, 1000)
  }

  const setMobileControlMode = (mode: MobileControl) => {
    setControlMode(mode)
    localStorage.setItem('snakeMobileControl', mode)
  }

  // Joystick handlers
  const onJoystickStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    joystickTouchIdRef.current = t.identifier
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    joystickOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    setJoystickActive(true)
    updateJoystick(t.clientX, t.clientY)
  }
  const onJoystickMove = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current === null) return
    const t = Array.from(e.changedTouches).find((x) => x.identifier === joystickTouchIdRef.current)
    if (!t) return
    updateJoystick(t.clientX, t.clientY)
  }
  const onJoystickEnd = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current === null) return
    if (!Array.from(e.changedTouches).find((x) => x.identifier === joystickTouchIdRef.current)) return
    joystickTouchIdRef.current = null
    setJoystickActive(false)
  }
  const updateJoystick = (x: number, y: number) => {
    initAudio()
    const max = 35
    const dead = 12
    const dx = x - joystickOriginRef.current.x
    const dy = y - joystickOriginRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const clamped = Math.min(dist, max)
    const angle = Math.atan2(dy, dx)
    const stick = document.getElementById('snake-joystick-stick')
    if (stick) {
      stick.style.transform = `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`
    }
    if (dist < dead) return
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dxRef.current === 0) { nextDxRef.current = dx > 0 ? GRID_SIZE : -GRID_SIZE; nextDyRef.current = 0 }
    } else {
      if (dyRef.current === 0) { nextDxRef.current = 0; nextDyRef.current = dy > 0 ? GRID_SIZE : -GRID_SIZE }
    }
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* 未登录提示：说明分数为什么"保存不了" */}
      {!userId && (
        <div className="mb-3 flex w-full max-w-[600px] items-center justify-between gap-3 rounded-xl border border-[#ff9e00]/40 bg-[#ff9e00]/10 px-4 py-2 text-sm text-[#ffd07a]">
          <span>⚠️ 你正在以「访客」身份游戏，分数<b>不会上传</b>到全球排行榜，仅保存在本机。</span>
          <a
            href="/"
            className="shrink-0 rounded-full border border-[#ff6b35]/60 bg-[#ff6b35]/20 px-3 py-1 text-xs font-semibold text-[#ff9e00] transition hover:bg-[#ff6b35]/30"
          >
            去登录 →
          </a>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">🍎 得分: {score}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">👑 最高: {highScore}</span>
        <button
          onClick={() => setShowBoard(true)}
          className="rounded-full border border-[#ffd700]/40 bg-[#ffd700]/10 px-3 py-1 font-semibold text-[#ffd700] transition hover:bg-[#ffd700]/20"
        >
          🏆 排行榜
        </button>
        {isTouch && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            控制: {controlMode === 'swipe' ? '滑动' : controlMode === 'arrows' ? '箭头' : '摇杆'}
          </span>
        )}
      </div>

      {isTouch && (
        <div className="mb-3 flex items-center gap-2">
          {(['swipe', 'arrows', 'joystick'] as MobileControl[]).map((m) => (
            <button
              key={m}
              onClick={() => setMobileControlMode(m)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                controlMode === m
                  ? 'border-[#ff6b35] bg-[#ff6b35]/20 text-[#ff9e00]'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {m === 'swipe' ? '滑动' : m === 'arrows' ? '箭头' : '摇杆'}
            </button>
          ))}
        </div>
      )}

      {isTouch && controlMode === 'arrows' && (
        <div className="mb-3 flex flex-col items-center gap-2 select-none">
          <button className="dpad-btn" onTouchStart={() => setDirection('up')}>▲</button>
          <div className="flex gap-2">
            <button className="dpad-btn" onTouchStart={() => setDirection('left')}>◀</button>
            <button className="dpad-btn mt-1" onTouchStart={() => setDirection('down')}>▼</button>
            <button className="dpad-btn" onTouchStart={() => setDirection('right')}>▶</button>
          </div>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="max-h-[65vh] max-w-[95vw] rounded-xl border border-transparent bg-gradient-to-br from-[#241525] to-[#0f0814]"
          style={{
            background:
              'linear-gradient(#241525, #0f0814) padding-box, linear-gradient(135deg, #ff6b35, #9d4edd, #ff6b35) border-box',
          }}
        />
        {countdown && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="animate-pulse text-7xl font-black text-white drop-shadow-[0_0_30px_#ff6b35]">{countdown}</span>
          </div>
        )}
        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-xl bg-black/85 p-4 text-center">
            <h2 className="mb-1 text-2xl font-bold text-[#ff9e00]">游戏结束</h2>
            <p className="mb-1 text-lg text-white">得分: {score}</p>
            {saveStatus === 'saved' && <p className="mb-2 text-xs text-green-400">✓ 分数已保存到排行榜</p>}
            {saveStatus === 'guest' && (
              <p className="mb-2 text-xs text-[#ff9e00]">
                未登录：分数仅存本机，
                <a href="/" className="underline hover:text-[#ffd700]">
                  登录后可上榜
                </a>
              </p>
            )}
            {saveStatus === 'error' && <p className="mb-2 text-xs text-red-400">上传失败，请检查网络或稍后再试</p>}

            <div className="mb-3 w-full max-w-[300px]">
              <p className="mb-1 text-xs uppercase tracking-widest text-white/50">🏆 贪吃蛇排行榜</p>
              <SnakeLeaderboard limit={5} currentUserId={userId} />
            </div>

            <button
              onClick={restartGame}
              className="rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#9d4edd] px-6 py-2 font-bold text-white shadow-lg"
            >
              重新开始
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={togglePause}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
        >
          {paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={restartGame}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          重新开始
        </button>
      </div>

      {/* 排行榜弹窗（游戏中随时查看） */}
      {showBoard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowBoard(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#140a18]/95 p-5 shadow-[0_0_50px_rgba(255,215,0,0.2)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-center text-xl font-black tracking-widest text-[#ffd700] drop-shadow-[0_0_10px_#ffd700]">
              🏆 贪吃蛇排行榜
            </h3>
            <SnakeLeaderboard limit={10} currentUserId={userId} />
            <button
              onClick={() => setShowBoard(false)}
              className="absolute right-3 top-3 text-2xl text-white/50 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isTouch && controlMode === 'joystick' && (
        <div
          className="fixed bottom-5 left-1/2 z-20 h-[130px] w-[130px] -translate-x-1/2"
          onTouchStart={onJoystickStart}
          onTouchMove={onJoystickMove}
          onTouchEnd={onJoystickEnd}
        >
          <div className="absolute inset-0 rounded-full border-2 border-[#ff6b35]/35 bg-white/[0.06] shadow-[0_0_25px_rgba(255,107,53,0.2)] backdrop-blur-sm" />
          <div
            id="snake-joystick-stick"
            className={`absolute left-1/2 top-1/2 h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25 bg-gradient-to-br from-[#ff6b35]/60 to-[#9d4edd]/60 shadow-[0_0_20px_rgba(255,107,53,0.5)] transition-transform ${
              joystickActive ? 'scale-110' : ''
            }`}
          />
        </div>
      )}
    </div>
  )
}

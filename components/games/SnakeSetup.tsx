'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DIFFICULTY = [
  { key: 'easy', name: '简单', icon: '🌱', desc: '无障碍物，轻松上手', color: '#4ade80' },
  { key: 'medium', name: '中等', icon: '🔥', desc: '少量障碍物，1.25× 分数', color: '#ff9e00' },
  { key: 'hard', name: '困难', icon: '☠️', desc: '大量障碍物，1.5× 分数', color: '#f87171' },
]

export default function SnakeSetup() {
  const router = useRouter()
  const [mode, setMode] = useState<'endless' | 'level' | null>(null)

  const startEndless = (difficulty: string) => {
    router.push(`/game/snake?mode=endless&difficulty=${difficulty}`)
  }

  const startLevel = (level: number) => {
    router.push(`/game/snake?mode=level&level=${level}`)
  }

  return (
    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 text-center">
      <h2 className="mb-6 text-2xl font-bold text-white">选择模式</h2>

      {!mode && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('endless')}
            className="rounded-2xl border border-[#ff6b35]/40 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#ff6b35] hover:bg-[#ff6b35]/10"
          >
            <div className="mb-2 text-3xl">♾️</div>
            <div className="font-bold text-white">无尽模式</div>
            <div className="text-xs text-white/50">挑战最高分</div>
          </button>
          <button
            onClick={() => setMode('level')}
            className="rounded-2xl border border-[#9d4edd]/40 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#9d4edd] hover:bg-[#9d4edd]/10"
          >
            <div className="mb-2 text-3xl">🏰</div>
            <div className="font-bold text-white">闯关模式</div>
            <div className="text-xs text-white/50">层层闯关</div>
          </button>
        </div>
      )}

      {mode === 'endless' && (
        <div className="space-y-3">
          <p className="text-sm text-white/60">选择难度</p>
          {DIFFICULTY.map((d) => (
            <button
              key={d.key}
              onClick={() => startEndless(d.key)}
              className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
            >
              <span className="text-2xl">{d.icon}</span>
              <div className="text-left">
                <div className="font-bold" style={{ color: d.color }}>{d.name}</div>
                <div className="text-xs text-white/50">{d.desc}</div>
              </div>
            </button>
          ))}
          <button onClick={() => setMode(null)} className="text-sm text-white/50 hover:text-white">← 返回</button>
        </div>
      )}

      {mode === 'level' && (
        <div className="space-y-3">
          <p className="text-sm text-white/60">选择关卡</p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <button
                key={i}
                onClick={() => startLevel(i + 1)}
                className="rounded-lg border border-white/10 bg-white/5 py-3 text-white transition hover:border-[#9d4edd] hover:bg-[#9d4edd]/20"
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => setMode(null)} className="text-sm text-white/50 hover:text-white">← 返回</button>
        </div>
      )}
    </div>
  )
}

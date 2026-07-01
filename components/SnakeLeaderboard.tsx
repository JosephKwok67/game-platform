'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ScoreRow {
  user_id: string
  score: number
  mode: string
  profiles: { username: string } | null
}

export default function SnakeLeaderboard({ limit = 5 }: { limit?: number }) {
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('scores')
        .select('user_id, score, mode, profiles(username)')
        .eq('game', 'snake')
        .order('score', { ascending: false })
        .limit(200)
      const best = new Map<string, ScoreRow>()
      ;(data || []).forEach((s: any) => {
        if (!best.has(s.user_id) || s.score > best.get(s.user_id)!.score) {
          best.set(s.user_id, s as ScoreRow)
        }
      })
      setScores(Array.from(best.values()).sort((a, b) => b.score - a.score).slice(0, limit))
      setLoading(false)
    }
    load()
  }, [limit])

  if (loading) return <p className="text-center text-sm text-white/50">加载中...</p>
  if (scores.length === 0) return <p className="text-center text-sm text-white/50">暂无记录</p>

  return (
    <ul className="space-y-2">
      {scores.map((s, i) => (
        <li
          key={s.user_id}
          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
            i === 0
              ? 'border-[#ffd700]/40 bg-[#ffd700]/10 text-[#ffd700]'
              : i === 1
              ? 'border-gray-400/30 bg-gray-400/10 text-gray-200'
              : i === 2
              ? 'border-[#cd7f32]/40 bg-[#cd7f32]/10 text-[#e6a96c]'
              : 'border-white/10 bg-white/5 text-white/80'
          }`}
        >
          <span className="font-bold">#{i + 1}</span>
          <span>{s.profiles?.username || '匿名'}</span>
          <span className="font-mono font-bold">{s.score}</span>
        </li>
      ))}
    </ul>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ScoreRow {
  user_id: string
  score: number
  mode: string
  level: number | null
  created_at: string | null
  profiles: { username: string } | null
}

type ModeTab = 'all' | 'endless' | 'level'

interface SnakeLeaderboardProps {
  limit?: number
  /** 固定只显示某个 mode（例如 "easy"），传入后隐藏切换标签 */
  modeFilter?: string
  /** 当前登录玩家的 user_id，用于高亮"我"的名次 */
  currentUserId?: string
  /** 是否显示"无尽 / 闯关"切换标签，默认显示 */
  showTabs?: boolean
}

const isEndlessMode = (m: string) => ['easy', 'medium', 'hard'].includes(m)
const isLevelMode = (m: string) => typeof m === 'string' && m.startsWith('level')

const modeLabel = (m: string) => {
  if (m === 'easy') return '简单'
  if (m === 'medium') return '中等'
  if (m === 'hard') return '困难'
  if (isLevelMode(m)) return m.replace('level-', '第 ') + ' 关'
  return m
}

const fmtDate = (s: string | null) => {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  } catch {
    return ''
  }
}

export default function SnakeLeaderboard({
  limit = 5,
  modeFilter,
  currentUserId,
  showTabs = true,
}: SnakeLeaderboardProps) {
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<ModeTab>('all')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('scores')
        .select('user_id, score, mode, level, created_at, profiles(username)')
        .eq('game', 'snake')

      if (modeFilter) {
        query = query.eq('mode', modeFilter)
      }

      const { data } = await query.order('score', { ascending: false }).limit(500)
      if (cancelled) return
      setRows((data || []) as unknown as ScoreRow[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [modeFilter])

  // 根据当前标签过滤，再对每个用户只保留最高分
  const filtered = rows.filter((s) => {
    if (modeFilter) return true
    if (tab === 'endless') return isEndlessMode(s.mode)
    if (tab === 'level') return isLevelMode(s.mode)
    return true
  })

  const best = new Map<string, ScoreRow>()
  filtered.forEach((s) => {
    const key = s.user_id || JSON.stringify(s)
    if (!best.has(key) || s.score > best.get(key)!.score) best.set(key, s)
  })
  const scores = Array.from(best.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  // 找出"我"的全局名次（即使不在前 limit 名内也能提示）
  const myRankAll = Array.from(best.values()).sort((a, b) => b.score - a.score)
  const myIndex = currentUserId ? myRankAll.findIndex((s) => s.user_id === currentUserId) : -1
  const myInTop = myIndex >= 0 && myIndex < limit

  return (
    <div className="w-full">
      {showTabs && !modeFilter && (
        <div className="mb-2 flex items-center justify-center gap-1.5">
          {([
            ['all', '全部'],
            ['endless', '无尽'],
            ['level', '闯关'],
          ] as [ModeTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                tab === key
                  ? 'border-[#ff6b35] bg-[#ff6b35]/20 text-[#ff9e00]'
                  : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="py-3 text-center text-sm text-white/50">加载中...</p>
      ) : scores.length === 0 ? (
        <p className="py-3 text-center text-sm text-white/50">暂无记录，快来抢占榜首！</p>
      ) : (
        <ul className="space-y-1.5">
          {scores.map((s, i) => {
            const isMe = currentUserId && s.user_id === currentUserId
            return (
              <li
                key={s.user_id || i}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  isMe
                    ? 'border-[#00ffff]/50 bg-[#00ffff]/10 text-[#7ff]'
                    : i === 0
                    ? 'border-[#ffd700]/40 bg-[#ffd700]/10 text-[#ffd700]'
                    : i === 1
                    ? 'border-gray-400/30 bg-gray-400/10 text-gray-200'
                    : i === 2
                    ? 'border-[#cd7f32]/40 bg-[#cd7f32]/10 text-[#e6a96c]'
                    : 'border-white/10 bg-white/5 text-white/80'
                }`}
              >
                <span className="w-6 shrink-0 font-bold">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="flex-1 truncate">
                  {s.profiles?.username || '匿名'}
                  {isMe && <span className="ml-1 text-[10px] text-[#00ffff]">(我)</span>}
                </span>
                <span className="shrink-0 font-mono font-bold">{s.score}</span>
                <span className="w-12 shrink-0 text-right text-[10px] text-white/40">
                  {modeLabel(s.mode)}
                </span>
                <span className="w-9 shrink-0 text-right text-[10px] text-white/30">
                  {fmtDate(s.created_at)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* 我不在前 limit 名内时，单独提示我的名次 */}
      {!loading && currentUserId && myIndex >= 0 && !myInTop && (
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#00ffff]/40 bg-[#00ffff]/10 px-3 py-2 text-sm text-[#7ff]">
          <span className="w-6 shrink-0 font-bold">#{myIndex + 1}</span>
          <span className="flex-1 truncate">
            {myRankAll[myIndex].profiles?.username || '我'}
            <span className="ml-1 text-[10px] text-[#00ffff]">(我)</span>
          </span>
          <span className="shrink-0 font-mono font-bold">{myRankAll[myIndex].score}</span>
        </div>
      )}
    </div>
  )
}

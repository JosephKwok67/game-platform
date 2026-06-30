import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('scores')
    .select('score, mode, level, created_at, profiles(username)')
    .eq('game', 'snake')
    .order('score', { ascending: false })
    .limit(50)

  const scores = rows || []

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-[#ff9e00]">
          ← 返回大厅
        </Link>
        <h2 className="text-2xl font-bold text-[#ffd700]">🏆 全球排行榜</h2>
      </div>

      <div className="glass-panel w-full max-w-2xl rounded-2xl p-4">
        {scores.length === 0 ? (
          <p className="py-8 text-center text-white/50">暂无记录</p>
        ) : (
          <ul className="space-y-2">
            {scores.map((s: any, i: number) => (
              <li
                key={i}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
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
                <span className="font-mono font-bold">{s.score} 分</span>
                <span className="text-xs text-white/50">{s.mode}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

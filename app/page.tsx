import { createClient } from '@/lib/supabase/server'
import AuthButton from '@/components/AuthButton'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user?.id).single()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <h1 className="neon-title mb-2 text-center">
        ARCADE <span className="text-[#00ffff]">HUB</span>
      </h1>
      <p className="mb-8 text-center text-sm uppercase tracking-[0.3em] text-white/50">赛博朋克小游戏平台</p>

      <div className="glass-panel w-full max-w-4xl rounded-3xl p-6 md:p-10">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">当前玩家</p>
            <p className="text-xl font-bold text-[#ff9e00]">{profile?.username || '访客'}</p>
          </div>
          <AuthButton />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/game/snake"
            className="group relative overflow-hidden rounded-2xl border border-[#ff6b35]/30 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#ff6b35] hover:shadow-[0_0_30px_rgba(255,107,53,0.3)]"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ff6b35]/10 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="mb-3 text-4xl">🐍</div>
            <h3 className="text-xl font-bold text-white">霓虹贪吃蛇</h3>
            <p className="mt-1 text-sm text-white/60">无尽 / 闯关 / 排行榜</p>
          </Link>

          <Link
            href="/leaderboard"
            className="group relative overflow-hidden rounded-2xl border border-[#ffd700]/30 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#ffd700] hover:shadow-[0_0_30px_rgba(255,215,0,0.25)]"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ffd700]/10 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="mb-3 text-4xl">🏆</div>
            <h3 className="text-xl font-bold text-white">全球排行榜</h3>
            <p className="mt-1 text-sm text-white/60">查看各游戏 TOP 玩家</p>
          </Link>

          <Link
            href="/friends"
            className="group relative overflow-hidden rounded-2xl border border-[#00ffff]/30 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-[#00ffff] hover:shadow-[0_0_30px_rgba(0,255,255,0.25)]"
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#00ffff]/10 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="mb-3 text-4xl">👥</div>
            <h3 className="text-xl font-bold text-white">好友系统</h3>
            <p className="mt-1 text-sm text-white/60">添加好友、一起游戏</p>
          </Link>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/room"
            className="rounded-full border border-[#9d4edd]/50 bg-[#9d4edd]/10 px-8 py-3 font-bold text-[#c77dff] shadow-[0_0_20px_rgba(157,78,237,0.25)] transition hover:scale-105 hover:bg-[#9d4edd]/20"
          >
            🎮 创建 / 加入房间
          </Link>
        </div>
      </div>
    </main>
  )
}

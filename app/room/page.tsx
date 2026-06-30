'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RoomLobbyPage() {
  const supabase = createClient()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const createRoom = async () => {
    setLoading(true)
    setMessage('')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setMessage('请先登录')
      setLoading(false)
      return
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ code, host_id: userData.user.id, game: 'snake', status: 'waiting' })
      .select()
      .single()
    if (error || !room) {
      setMessage(error?.message || '创建失败')
      setLoading(false)
      return
    }
    await supabase.from('room_players').insert({ room_id: room.id, user_id: userData.user.id })
    router.push(`/room/${room.id}`)
  }

  const joinRoom = async () => {
    if (!code.trim()) return
    setLoading(true)
    setMessage('')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setMessage('请先登录')
      setLoading(false)
      return
    }
    const { data: room } = await supabase.from('rooms').select('id').eq('code', code.trim().toUpperCase()).single()
    if (!room) {
      setMessage('房间不存在')
      setLoading(false)
      return
    }
    await supabase.from('room_players').insert({ room_id: room.id, user_id: userData.user.id }).select()
    router.push(`/room/${room.id}`)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <Link href="/" className="fixed left-6 top-6 text-sm text-white/60 hover:text-[#ff9e00]">
        ← 返回大厅
      </Link>

      <h2 className="neon-title mb-2 text-center text-4xl">房间</h2>
      <p className="mb-8 text-center text-white/50">创建或加入房间，与好友一起游戏</p>

      <div className="glass-panel w-full max-w-md rounded-2xl p-6">
        <button
          onClick={createRoom}
          disabled={loading}
          className="mb-4 w-full rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#9d4edd] py-3 font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '创建中...' : '创建房间'}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/40">或</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="输入房间号"
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center uppercase tracking-widest text-white placeholder-white/40 outline-none focus:border-[#ff6b35]"
        />
        <button
          onClick={joinRoom}
          disabled={loading}
          className="w-full rounded-xl border border-[#ff6b35]/50 bg-[#ff6b35]/10 py-3 font-bold text-[#ff9e00] transition hover:bg-[#ff6b35]/20 disabled:opacity-50"
        >
          加入房间
        </button>
        {message && <p className="mt-3 text-center text-sm text-[#ff9e00]">{message}</p>}
      </div>
    </main>
  )
}

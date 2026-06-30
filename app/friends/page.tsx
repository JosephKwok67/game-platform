'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Friend {
  id: string
  username: string
  status: string
}

export default function FriendsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<Friend[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        loadFriends(data.user.id)
      }
    })
  }, [])

  const loadFriends = async (uid: string) => {
    const { data: sent } = await supabase
      .from('friendships')
      .select('id, friend_id, status, profiles!friendships_friend_id_fkey(username)')
      .eq('user_id', uid)
    const { data: received } = await supabase
      .from('friendships')
      .select('id, user_id, status, profiles!friendships_user_id_fkey(username)')
      .eq('friend_id', uid)
      .eq('status', 'pending')

    const accepted = (sent || [])
      .filter((f: any) => f.status === 'accepted')
      .map((f: any) => ({ id: f.id, username: f.profiles?.username, status: f.status }))
    const pending = (received || []).map((f: any) => ({ id: f.id, username: f.profiles?.username, status: f.status }))
    setFriends(accepted)
    setRequests(pending)
  }

  const addFriend = async () => {
    if (!search.trim() || !userId) return
    setMessage('')
    const { data: target } = await supabase.from('profiles').select('id').eq('username', search.trim()).single()
    if (!target) {
      setMessage('用户不存在')
      return
    }
    if (target.id === userId) {
      setMessage('不能添加自己')
      return
    }
    const { error } = await supabase.from('friendships').insert({ user_id: userId, friend_id: target.id })
    if (error) setMessage(error.message)
    else {
      setMessage('好友请求已发送')
      setSearch('')
    }
  }

  const accept = async (id: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    if (userId) loadFriends(userId)
  }

  const reject = async (id: string) => {
    await supabase.from('friendships').delete().eq('id', id)
    if (userId) loadFriends(userId)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-[#ff9e00]">
          ← 返回大厅
        </Link>
        <h2 className="text-2xl font-bold text-[#00ffff]">👥 好友系统</h2>
      </div>

      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6">
        <div className="mb-6 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="输入用户名添加好友"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none focus:border-[#00ffff]"
          />
          <button
            onClick={addFriend}
            className="rounded-xl bg-gradient-to-r from-[#00ffff]/80 to-[#9d4edd] px-5 py-2 font-bold text-white"
          >
            添加
          </button>
        </div>
        {message && <p className="mb-4 text-center text-sm text-[#ff9e00]">{message}</p>}

        <h3 className="mb-2 text-lg font-bold text-white">好友请求</h3>
        {requests.length === 0 ? (
          <p className="mb-6 text-sm text-white/50">暂无请求</p>
        ) : (
          <ul className="mb-6 space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <span className="text-white">{r.username}</span>
                <div className="flex gap-2">
                  <button onClick={() => accept(r.id)} className="rounded-lg bg-green-500/20 px-3 py-1 text-sm text-green-400">接受</button>
                  <button onClick={() => reject(r.id)} className="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-400">拒绝</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mb-2 text-lg font-bold text-white">我的好友</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-white/50">还没有好友</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white">
                {f.username}
                <button onClick={() => reject(f.id)} className="text-sm text-white/50 hover:text-red-400">删除</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

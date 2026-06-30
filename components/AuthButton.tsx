'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export default function AuthButton() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadUser(data.user)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUser(session.user)
      else {
        setUser(null)
        setUsername('')
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadUser = async (u: User) => {
    setUser(u)
    const { data } = await supabase.from('profiles').select('username').eq('id', u.id).single()
    setUsername(data?.username || u.email?.split('@')[0] || '玩家')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else if (data.user) {
        await supabase.from('profiles').insert({ id: data.user.id, username: newUsername || email.split('@')[0] })
        setMessage('注册成功，请查收确认邮件。')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else {
        setOpen(false)
        window.location.reload()
      }
    }
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/70">{username}</span>
        <button
          onClick={signOut}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          退出
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#ff6b35]/50 bg-[#ff6b35]/10 px-5 py-2 text-sm font-semibold text-[#ff9e00] shadow-[0_0_15px_rgba(255,107,53,0.25)] transition hover:scale-105 hover:bg-[#ff6b35]/20"
      >
        登录 / 注册
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#140a18]/95 p-6 shadow-[0_0_50px_rgba(255,107,53,0.25)] backdrop-blur-xl">
            <h2 className="mb-4 text-center text-2xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_10px_#ff6b35]">
              {isSignUp ? '注册账号' : '欢迎回来'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <input
                  type="text"
                  placeholder="昵称"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none focus:border-[#ff6b35]"
                />
              )}
              <input
                type="email"
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none focus:border-[#ff6b35]"
              />
              <input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none focus:border-[#ff6b35]"
              />
              {message && <p className="text-center text-sm text-[#ff9e00]">{message}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#9d4edd] py-2 font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-white/50">
              {isSignUp ? '已有账号？' : '还没有账号？'}
              <button onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-[#00ffff] hover:underline">
                {isSignUp ? '直接登录' : '立即注册'}
              </button>
            </p>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-2xl text-white/50 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SnakeGame from '@/components/games/SnakeGame'
import Link from 'next/link'

interface Player {
  id: string
  user_id: string
  score: number
  profiles: { username: string } | null
}

interface Room {
  id: string
  code: string
  host_id: string
  game: string
  status: string
}

export default function RoomClient({
  room,
  initialPlayers,
  userId,
  isHost,
}: {
  room: Room
  initialPlayers: Player[]
  userId?: string
  isHost: boolean
}) {
  const supabase = createClient()
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [status, setStatus] = useState(room.status)
  const [myScore, setMyScore] = useState(0)

  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase
            .from('room_players')
            .select('*, profiles(username)')
            .eq('room_id', room.id)
          if (data) setPlayers(data)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload: any) => setStatus(payload.new.status)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id])

  const startGame = async () => {
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', room.id)
  }

  const onScore = async (score: number) => {
    setMyScore(score)
    if (!userId) return
    await supabase.from('room_players').update({ score }).eq('room_id', room.id).eq('user_id', userId)
  }

  const onGameOver = async (score: number) => {
    if (!userId) return
    await supabase.from('room_players').update({ score }).eq('room_id', room.id).eq('user_id', userId)
    await supabase.from('scores').insert({
      user_id: userId,
      game: 'snake',
      mode: 'room',
      score,
      level: 1,
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <div className="mb-4 flex w-full max-w-3xl items-center justify-between">
        <Link href="/room" className="text-sm text-white/60 hover:text-[#ff9e00]">
          ← 房间列表
        </Link>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">房间 {room.code}</h2>
          <p className="text-xs text-white/50">{status === 'waiting' ? '等待中' : '游戏中'}</p>
        </div>
      </div>

      <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-[1fr_280px]">
        <div className="glass-panel rounded-2xl p-4">
          {status === 'waiting' ? (
            <div className="flex h-96 flex-col items-center justify-center text-white/60">
              <p className="mb-4">等待房主开始游戏...</p>
              {isHost && (
                <button
                  onClick={startGame}
                  className="rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#9d4edd] px-8 py-3 font-bold text-white shadow-lg transition hover:opacity-90"
                >
                  开始游戏
                </button>
              )}
            </div>
          ) : (
            <SnakeGame userId={userId} onScore={onScore} onGameOver={onGameOver} />
          )}
        </div>

        <div className="glass-panel h-fit rounded-2xl p-4">
          <h3 className="mb-3 text-lg font-bold text-[#00ffff]">玩家</h3>
          <ul className="space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
                <span>{p.profiles?.username || '匿名'}</span>
                <span className="font-mono font-bold text-[#ff9e00]">{p.score}</span>
              </li>
            ))}
          </ul>
          {status === 'playing' && (
            <p className="mt-3 text-center text-xs text-white/50">你的分数会实时同步给房间其他人</p>
          )}
        </div>
      </div>
    </main>
  )
}

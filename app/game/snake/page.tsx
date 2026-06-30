import { createClient } from '@/lib/supabase/server'
import SnakeGame from '@/components/games/SnakeGame'
import SnakeSetup from '@/components/games/SnakeSetup'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ mode?: string; difficulty?: string; level?: string }>
}

export default async function SnakePage({ searchParams }: Props) {
  const { mode, difficulty, level } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-[#ff9e00]">
          ← 返回大厅
        </Link>
        <h2 className="text-xl font-bold text-white">🐍 霓虹贪吃蛇</h2>
      </div>

      {!mode ? (
        <SnakeSetup />
      ) : mode === 'level' ? (
        <SnakeGame userId={user?.id} gameMode="level" level={Number(level) || 1} />
      ) : (
        <SnakeGame
          userId={user?.id}
          gameMode="endless"
          difficulty={['easy', 'medium', 'hard'].includes(difficulty || '') ? (difficulty as any) : 'easy'}
        />
      )}
    </main>
  )
}

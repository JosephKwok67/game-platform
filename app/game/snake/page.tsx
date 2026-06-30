import { createClient } from '@/lib/supabase/server'
import SnakeGame from '@/components/games/SnakeGame'
import Link from 'next/link'

export default async function SnakePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="cyber-grid pointer-events-none fixed inset-0 -z-10" />
      <div className="bg-particles pointer-events-none fixed inset-0 -z-10" />

      <div className="mb-4 flex w-full max-w-2xl items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-[#ff9e00]">
          ← 返回大厅
        </Link>
        <h2 className="text-xl font-bold text-white">🐍 霓虹贪吃蛇</h2>
      </div>

      <SnakeGame userId={user?.id} gameMode="endless" difficulty="easy" />
    </main>
  )
}

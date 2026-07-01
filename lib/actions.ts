'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveScore({
  game,
  mode,
  score,
  level,
}: {
  game: string
  mode: string
  score: number
  level: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: '未登录或登录已过期' }
  }

  const { error } = await supabase.from('scores').insert({
    user_id: user.id,
    game,
    mode,
    score,
    level,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

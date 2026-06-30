import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RoomClient from './RoomClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: room } = await supabase.from('rooms').select('*').eq('id', id).single()
  if (!room) notFound()

  const { data: players } = await supabase
    .from('room_players')
    .select('*, profiles(username)')
    .eq('room_id', id)

  return (
    <RoomClient
      room={room}
      initialPlayers={players || []}
      userId={user?.id}
      isHost={user?.id === room.host_id}
    />
  )
}

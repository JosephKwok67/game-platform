-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Friendships
create type friendship_status as enum ('pending', 'accepted', 'blocked');

create table friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  friend_id uuid references auth.users on delete cascade not null,
  status friendship_status default 'pending' not null,
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

alter table friendships enable row level security;

create policy "Users can view own friendships"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can send friend requests"
  on friendships for insert
  with check (auth.uid() = user_id);

create policy "Users can update own friendships"
  on friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can delete own friendships"
  on friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Scores / Leaderboard
create table scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  game text not null,
  mode text,
  score int not null default 0,
  level int default 1,
  created_at timestamptz default now()
);

alter table scores enable row level security;

create policy "Scores are viewable by everyone"
  on scores for select using (true);

create policy "Authenticated users can insert own scores"
  on scores for insert
  with check (auth.uid() = user_id);

-- Rooms for realtime sessions
create type room_status as enum ('waiting', 'playing', 'finished');

create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  host_id uuid references auth.users on delete cascade not null,
  game text default 'snake' not null,
  status room_status default 'waiting' not null,
  created_at timestamptz default now()
);

alter table rooms enable row level security;

create policy "Rooms are viewable by everyone"
  on rooms for select using (true);

create policy "Authenticated users can create rooms"
  on rooms for insert
  with check (auth.uid() = host_id);

create policy "Host can update room"
  on rooms for update
  using (auth.uid() = host_id);

create policy "Host can delete room"
  on rooms for delete
  using (auth.uid() = host_id);

-- Room players
create table room_players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  score int default 0 not null,
  status text default 'joined' not null,
  joined_at timestamptz default now(),
  unique (room_id, user_id)
);

alter table room_players enable row level security;

create policy "Room players are viewable by everyone"
  on room_players for select using (true);

create policy "Authenticated users can join rooms"
  on room_players for insert
  with check (auth.uid() = user_id);

create policy "Players can update own score"
  on room_players for update
  using (auth.uid() = user_id);

create policy "Players can leave rooms"
  on room_players for delete
  using (auth.uid() = user_id);

-- Enable realtime for rooms and room players
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_players;

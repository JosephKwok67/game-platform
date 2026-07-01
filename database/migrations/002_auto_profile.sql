-- ============================================================
-- 迁移：注册时自动创建 profile
-- ------------------------------------------------------------
-- 背景：原 schema.sql 的 profiles 表依赖前端手动 insert 来创建
-- 用户资料。若前端 insert 失败（网络 / 时序 / RLS），排行榜就会
-- 显示"匿名"。这里改用数据库触发器，在 auth.users 新增用户时
-- 自动写入 profiles，保证每个玩家都有用户名。
--
-- 使用方法：在 Supabase 控制台 -> SQL Editor 中执行本文件。
-- 可重复执行（幂等）。
-- ============================================================

-- 1. 为历史遗漏的用户补建 profile（用邮箱前缀做默认用户名，避免唯一冲突加上短随机后缀）
insert into public.profiles (id, username)
select
  u.id,
  coalesce(split_part(u.email, '@', 1), 'player') || '_' || substr(u.id::text, 1, 4)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 2. 触发器函数：新用户 -> 自动建 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  final_name text;
begin
  -- 优先用注册时传入的 username（options.data.username），否则用邮箱前缀
  base_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1),
    'player'
  );

  final_name := base_name;

  -- 用户名唯一，若冲突则追加 id 短后缀
  if exists (select 1 from public.profiles where username = final_name) then
    final_name := base_name || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, username)
  values (new.id, final_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 3. 绑定触发器到 auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

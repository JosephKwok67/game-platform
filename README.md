# Arcade Hub - 赛博朋克小游戏平台

基于 **Next.js 16 + TypeScript + Tailwind CSS + Supabase** 的全栈小游戏平台。

## 已完成功能

- 🎮 **游戏大厅**：赛博朋克霓虹风格首页，展示游戏卡片。
- 🐍 **霓虹贪吃蛇**：移植自原单文件游戏，支持键盘、滑动、箭头按钮、虚拟摇杆。
- 🔐 **用户系统**：Supabase Auth 邮箱/密码注册登录，用户名资料。
- 🏆 **全球排行榜**：按游戏展示 TOP 玩家，前三名金银铜高亮。
- 👥 **好友系统**：搜索用户名添加好友、接受/拒绝请求。
- 🏠 **实时房间**：创建/加入房间，房主开始游戏，分数通过 Supabase Realtime 实时同步。

## 更新日志

- **2026-07-01** — 贪吃蛇排行榜升级 + 访客保存体验修复 + 注册自动建 profile。详见 [docs/2026-07-01-snake-leaderboard-update.md](docs/2026-07-01-snake-leaderboard-update.md)。

## 本地开发

```bash
cd /Users/joseph/Desktop/game-platform
npm install
```

创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

在 Supabase SQL Editor 中执行 `database/schema.sql` 创建表、RLS 和 Realtime 订阅。

```bash
npm run dev
```

打开 http://localhost:3000。

## 部署到 Vercel

1. 在 Vercel 导入 GitHub 仓库 `JosephKwok67/game-platform`。
2. 在项目设置中添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 重新部署。

> 注意：若需服务端功能（如更严格的 RLS、邀请邮件），可在 Supabase Dashboard 中配置。

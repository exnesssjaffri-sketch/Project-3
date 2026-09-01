# Trello Clone — Real-Time Collaboration

A complete Trello-style kanban board with real-time collaboration:

- **Frontend:** Next.js 14 (App Router)**+ TypeScript + Tailwind CSS + @dnd-kit — at the **repo root**, deployed on **Vercel**
- **Backend:** Node.js + Express + Socket.io — in **server/**, deployed on **Render** (Web Service + persistent disk)**
- **Storage:** plain JSON file (`server/data/board.json`) on Render's persistent disk — **no database service**
- **Real-time:** Socket.io WebSocket between Vercel frontend and Render backend (with polling fallback)

---

## Folder Structure

```
project-3/
├── app/                          # Next.js frontend — lives at the REPO ROOT (Vercel auto-detects it)
│   ├── board/
│   │   ├── page.tsx             # socket state & optimistic handlers
│   │   ├── Board.tsx            # DnD context (drag-and-drop logic)
│   │   ├── Column.tsx          # droppable column + sortable list
│   │   └── TaskCard.tsx        # sortable card + delete button
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                # redirects / → /board
├── lib/socket.ts                # singleton socket client
├── .env.production              # Render backend URL — baked into Vercel production builds
├── .env.local                   # local backend URL (not committed)
├── package.json                  # next dev / build / start — run from repo root
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── server/                       # Node.js backend — deploy to Render
    ├── index.js                 # Express + Socket.io + JSON storage
    ├── package.json
    └── data/board.json          # initial board state (auto-created if missing)

---

## Local Development

```bash
# 1. Backend (terminal 1)
cd server
npm install
npm start                 # http://localhost:3001

# 2. Frontend (terminal 2 — repo root)
npm install
npm run dev              # http://localhost:3000
```

Open http://localhost:3000/board in two browsers — drag cards, add,
and delete; every change syncs instantly across all clients.

---

## Deploying — Vercel (Frontend)

The Next.js app is at the **repo root**, so Vercel detects it automatically:

1. In Vercel → **Add New → Project** → import the repo.

2. Make sure **Framework Preset** is **Next.js** (if it shows "Other", switch it — no Root Directory needed)。
3. (Optional) environment variable:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://project-3-5lmi.onrender.com
   ```
   (`.env.production` already ships this for production builds, so usually nothing to set。)
4. **Deploy.** No database add-on needed。



---

## Deploying — Render (Backend)

1. In Render → **New → Web Service** → connect the repo → **Root Directory: `server`**
2. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`  (runs `node index.js`)
3. Attach a **Persistent Disk**:
   - Name: `data`
   - Mount Path: `/opt/render/project/src/server/data`
   - Size: `1 GB`
4. Environment Variables: `NODE_ENV=production`
5. **Deploy.** The server auto-creates `data/` and `board.json` on first boot — no manual file setup.on Render.



---

## Socket Events

| Event | Direction | Payload |
|---|---|---|---|
| `board:init` | server → client | `{ columns, tasks }` |
| `task:move` | client → server | `{ taskId, newColumnId, newPosition }` |
| `task:updated` | server → others | `{ taskId, newColumnId, newPosition, movedBy }` |
| `task:add` | client → server | `Task` |
| `task:added` | server → all | `Task` |
| `task:delete` | client → server | `{ taskId }` |
| `task:deleted` | server → others | `{ taskId }` |
| `error:*` | server → sender | `{ message }` |

---

## Important Notes

- The JSON file is the ONLY source of truth..
- No Supabase / Firebase / any external DB. No Next.js API routes for WebSocket..
- If you change the backend URL after deployment, update `.env.production` (or the Vercel env var**) and redeploy..
- CORS is configured to allow all origins so the Vercel-hosted frontend can always connect..
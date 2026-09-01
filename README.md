# Trello Clone — Real-Time Collaboration

A complete Trello-style kanban board with real-time collaboration:

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + @dnd-kit — deployed on **Vercel**
- **Backend:** Node.js + Express + Socket.io — deployed on **Render** (Web Service + persistent disk)
- **Storage:** plain JSON file (`server/data/board.json`) on Render's persistent disk — **no database service**
- **Real-time:** Socket.io WebSocket between Vercel frontend and Render backend (with polling fallback)

---

## Folder Structure

```
Project-3/
├── client/                 # Next.js frontend — deploy to Vercel
│   ├── app/
│   │   ├── board/
│   │   │   ├── page.tsx        # socket state & optimistic handlers
│   │   │   ├── Board.tsx       # DnD context (drag-and-drop logic)
│   │   │   ├── Column.tsx     # droppable column + sortable list
│   │   │   └── TaskCard.tsx   # sortable card + delete button
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx            # redirects / -> /board
│   ├── lib/socket.ts           # singleton socket client
│   ├── .env.local              # local backend URL
│   ├── .env.production         # Render backend URL (Vercel template)
│   └── next.config.js
└── server/                     # Node.js backend — deploy to Render
    ├── index.js                # Express + Socket.io + JSON storage
    ├── package.json
    └── data/board.json         # initial board state (auto-created if missing)
```

---

## Local Development

```bash
# 1. Backend (terminal 1)
cd server
npm install
npm start            # http://localhost:3001

# 2. Frontend (terminal 2)
cd client
npm install
npm run dev         # http://localhost:3000
```

Open http://localhost:3000/board in two browsers — drag cards, add,
and delete; every change syncs instantly across all clients.

---

## Deploying — Vercel (Frontend)

1. Push the `client/` folder to GitHub.
2. In Vercel → **Add New → Project** → import the repo (Framework: Next.js auto-detected).
3. Add environment variable:

   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-render-backend-url.onrender.com
   ```

4. **Deploy.** No database add-on needed.

.

## Deploying — Render (Backend)

1. Push the `server/` folder to GitHub (same or separate repo; set Root Directory to `server` if monorepo).
2. In Render → **New → Web Service** → connect the repo.
3. Settings:
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Root Directory: `server` (if monorepo)
4. Attach a **Persistent Disk**:
   - Name: `data`
   - Mount Path: `/opt/render/project/src/data`
   - Size: `1 GB`
5. Environment Variables: `NODE_ENV=production`
6. **Deploy.** The server automatically creates `data/` and `board.json` on first boot — no manual file setup on Render.

---

## Socket Events

| Event | Direction | Payload |
|--------|-----------|---------|
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
- If you change the backend URL after deployment, update the Vercel env var and redeploy..
- CORS is configured to allow all origins so the Vercel-hosted frontend can always connect..
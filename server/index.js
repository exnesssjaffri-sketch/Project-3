/**
 * Trello Clone — Backend Server
 * Node.js + Express + Socket.io with JSON file storage.
 *
 * ─────────────────────────────────────────────────────────────
 *  DEPLOYMENT INSTRUCTIONS — RENDER (BACKEND)
 * ─────────────────────────────────────────────────────────────
 *  1. Push this server/ folder to GitHub (separate repo or monorepo).
 *  2. In Render, go to Dashboard → New → Web Service → connect your repo.
 *  3. Root Directory:    server
 *     Build Command:     npm install
 *     Start Command:     npm start
 *  4. Attach a Persistent Disk:
 *       Name:       data
 *       Mount Path: /opt/render/project/src/server/data
 *                   (must match the data/ dir next to index.js — since Root
 *                    Directory is 'server', __dirname resolves to .../server)
 *       Size:       1 GB
 *  5. Environment Variables:
 *       NODE_ENV=production
 *     (Optional but recommended: PORT is set automatically by Render.)
 *  6. Deploy.
 *     The server automatically creates the data/ directory and board.json
 *     on first boot, so you do NOT need to create them on Render.
 *
 *  NOTE: The JSON file is the ONLY source of truth. No external databases.
 * ─────────────────────────────────────────────────────────────
 */

const path = require('path');
const http = require('http');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();

// CORS — allow ALL origins so the Vercel frontend can always connect.
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);

// Socket.io server — CORS allows all origins, GET + POST methods only.
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// Data file path — MUST stay inside ./data/ (relative to this file) for
// Render's persistent disk mount compatibility. NEVER change to ./board.json.
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'board.json');

// Initial board state, seeded the first time the server boots.
const initialBoard = {
  columns: [
    { id: 'col-1', title: 'To Do', position: 0 },
    { id: 'col-2', title: 'In Progress', position: 1 },
    { id: 'col-3', title: 'Done', position: 2 },
  ],
  tasks: [],
};

// Create the data/ directory programmatically if it doesn't exist.
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[fs] Created data directory at ${DATA_DIR}`);
  }
}

// Health check endpoint — handy for Render keep-alive / uptime checks.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Read and parse the board JSON file. Returns the full board object.
function loadData() {
  try {
    ensureDataDir();
    if (!fs.existsSync(DATA_FILE)) {
      // Seed the file with the initial board state on first boot.
      saveData(initialBoard);
      return JSON.parse(JSON.stringify(initialBoard));
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      columns: Array.isArray(data.columns) ? data.columns : initialBoard.columns,
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
    };
  } catch (error) {
    console.error('[loadData] Failed to read board.json, using initial state:', error.message);
    return JSON.parse(JSON.stringify(initialBoard));
  }
}

// Write the board object to the JSON file as pretty-printed JSON.
function saveData(data) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('[saveData] Board saved to disk.');
  } catch (error) {
    console.error('[saveData] Failed to write board.json:', error.message);
  }
}
io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);

  // Send the full current board to the newly connected client.
  const board = loadData();
  socket.emit('board:init', board);

  // ── task:move ────────────────────────────────────────────────
  // Payload: { taskId, newColumnId, newPosition }
  socket.on('task:move', (payload) => {
    try {
      const { taskId, newColumnId, newPosition } = payload || {};
      if (!taskId || !newColumnId || typeof newPosition !== 'number') {
        throw new Error('Invalid payload — expected { taskId, newColumnId, newPosition }.');
      }

      const current = loadData();
      const taskIndex = current.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task not found: ${taskId}`);
      }

      current.tasks[taskIndex].column_id = newColumnId;
      current.tasks[taskIndex].position = newPosition;
      saveData(current);

      // Broadcast the move to everyone EXCEPT the sender (sender already
      // applied an optimistic update locally).
      socket.broadcast.emit('task:updated', {
        taskId,
        newColumnId,
        newPosition,
        movedBy: socket.id,
      });
      console.log(`[task:move] Task ${taskId} → column ${newColumnId} @ ${newPosition}`);
    } catch (error) {
      console.error('[task:move] Error:', error.message);
      socket.emit('error:task:move', { message: error.message });
    }
  });

  // ── task:add ─────────────────────────────────────────────────
  // Payload: { id, title, column_id, position, created_at }
  socket.on('task:add', (task) => {
    try {
      if (!task || !task.id || !task.title || !task.column_id) {
        throw new Error('Invalid payload — expected { id, title, column_id, position, created_at }.');
      }

      const current = loadData();
      current.tasks.push(task);
      saveData(current);

      // Emit to ALL clients including the sender (sender also optimistic,
      // but array identities stay consistent across every tab).
      io.emit('task:added', task);
      console.log(`[task:add] Added task ${task.id}: "${task.title}"`);
    } catch (error) {
      console.error('[task:add] Error:', error.message);
      socket.emit('error:task:add', { message: error.message });
    }
  });

  // ── task:delete ──────────────────────────────────────────────
  // Payload: { taskId }
  socket.on('task:delete', (payload) => {
    try {
      const { taskId } = payload || {};
      if (!taskId) {
        throw new Error('Invalid payload — expected { taskId }.');
      }

      const current = loadData();
      const exists = current.tasks.some((t) => t.id === taskId);
      if (!exists) {
        throw new Error(`Task not found: ${taskId}`);
      }

      current.tasks = current.tasks.filter((t) => t.id !== taskId);
      saveData(current);

      // Broadcast to everyone EXCEPT the sender.
      socket.broadcast.emit('task:deleted', { taskId });
      console.log(`[task:delete] Deleted task ${taskId}`);
    } catch (error) {
      console.error('[task:delete] Error:', error.message);
      socket.emit('error:task:delete', { message: error.message });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] Client disconnected: ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  ensureDataDir();
  loadData(); // Seed the file if it's missing.
  console.log(`Trello clone server running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
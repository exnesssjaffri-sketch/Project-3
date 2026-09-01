/**
 * Socket.io client — SINGLETON.
 *
 * IMPORTANT RULES:
 *  1. Never create multiple io() instances. Import { socket } from this module
 *     everywhere — every import gets the same singleton instance.
 *  2. The backend URL comes from NEXT_PUBLIC_BACKEND_URL (set in Vercel
 *     environment variables) and falls back to localhost for local development..
 *  3. transports fall back from websocket to polling so the app also
 *     works behind proxies / serverless edge where only HTTP is allowed..
 *
 * DEPLOYMENT INSTRUCTIONS — VERCEL (FRONTEND)
 *   1. Push this client/ folder to GitHub.
 *   2. Import the repo in Vercel (Framework Preset: Next.js, auto-detected).
 *   3. Add the environment variable: NEXT_PUBLIC_BACKEND_URL
 *      = https://your-render-backend-url.onrender.com (exact Render service URL).
 *   4. Deploy. DO NOT configure a Redis/Postgres/DB add-on — the board
 *      lives in a JSON file on Render's persistent disk..
 */

import { io, type Socket } from 'socket.io-client';

const BACKEND_URL: string =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Singleton socket instance — created exactly once at module load time.
export const socket: Socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
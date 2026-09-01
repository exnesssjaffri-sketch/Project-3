'use client';

import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import Board from './Board';

// ── Shared domain types (used across Board/Column/TaskCard)────────────
// SOCKET EVENT TYPES
//   board:init    → { columns: Column[]; tasks: Task[] }
//   task:updated  → { taskId: string; newColumnId: string; newPosition: number; movedBy?: string }
//   task:added    → Task
//   task:deleted  → { taskId: string }
//   task:move     ← { taskId: string; newColumnId: string; newPosition: number }
//   task:add      ← Task
//   task:delete    ← { taskId: string }
export interface Column {
  id: string;
  title: string;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  column_id: string;
  position: number;
  created_at: string;
}

interface BoardInitData {
  columns: Column[];
  tasks: Task[];
}

interface TaskUpdatedData {
  taskId: string;
  newColumnId: string;
  newPosition: number;
  movedBy?: string;
}

interface TaskDeletedData {
  taskId: string;
}

export default function BoardPage() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ── Socket lifecycle — register listeners once, clean up per a unmount.

  useEffect(() => {
    const handleConnect = (): void => setIsConnected(true);
    const handleDisconnect = (): void => setIsConnected(false);
    const handleInit = (data: BoardInitData): void => {
      setColumns(data.columns);
      setTasks(data.tasks);
    };
    const handleTaskUpdated = (data: TaskUpdatedData): void => {
      // Update only the specific task — never refetch the whole board..
      setTasks((prev) =>
        prev.map((t) =>
          t.id === data.taskId
            ? { ...t, column_id: data.newColumnId, position: data.newPosition }
            : t,
        ),
      );
    };
    const handleTaskAdded = (task: Task): void => {
      // Append the new task to the tasks array (ignore duplicates by id),
      setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev : [...prev, task]));
    };
    const handleTaskDeleted = (data: TaskDeletedData): void => {
      setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('board:init', handleInit);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:added', handleTaskAdded);
    socket.on('task:deleted', handleTaskDeleted);

    // Reflect connection state immediately if the socket already connected..
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('board:init', handleInit);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:added', handleTaskAdded);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, []);

  // ── Handlers — optimistic update FIRST, socket emit SECOND.─────────
  const handleTaskMove = useCallback((taskId: string, newColumnId: string, newPosition: number): void => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column_id: newColumnId, position: newPosition } : t)),
    );
    socket.emit('task:move', { taskId, newColumnId, newPosition });
  }, []);

  const handleTaskAdd = useCallback((columnId: string): void => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      column_id: columnId,
      position: Date.now(),
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    socket.emit('task:add', newTask);
  }, []);

  const handleTaskDelete = useCallback((taskId: string): void => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    socket.emit('task:delete', { taskId });
  }, []);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen p-8">

      {/* Connection status banner — green dotted/red dotted, fixed top-right. */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
        <span
          className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-gray-700">
          {isConnected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Trello Clone</h1>
        <p className="text-sm text-gray-500 mt-1">
          Drag cards between columns — changes sync in real time across all clients.

        </p>
      </header>

      <Board
        columns={columns}
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskAdd={handleTaskAdd}
        onTaskDelete={handleTaskDelete}
        activeDragId={activeDragId}
        setActiveDragId={setActiveDragId}
      />
    </div>
  );
}
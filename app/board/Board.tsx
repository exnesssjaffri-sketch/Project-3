'use client';

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Column as ColumnType, Task } from './page';
import Column from './Column';

interface BoardProps {
  columns: ColumnType[];
  tasks: Task[];
  onTaskMove: (taskId: string, newColumnId: string, newPosition: number) => void;
  onTaskAdd: (columnId: string) => void;
  onTaskDelete: (taskId: string) => void;
  activeDragId: string | null;
  setActiveDragId: (id: string | null) => void;
}

export default function Board({
  columns,
  tasks,
  onTaskMove,
  onTaskAdd,
  onTaskDelete,
  activeDragId,
  setActiveDragId,
}: BoardProps) {
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Columns sorted by position for a stable board order..
  const sortedColumns: ColumnType[] = [...columns].sort((a, b) => a.position - b.position);

  // Resolve which column an "over" target belongs to. If over.id is a
  // column id, use it. If it is a task id, use that task s column..
  const resolveTargetColumn = (overId: string): ColumnType | undefined => {
    const directColumn = sortedColumns.find((c) => c.id === overId);
    if (directColumn) return directColumn;
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return undefined;
    return sortedColumns.find((c) => c.id === overTask.column_id);
  };

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent): void => {
    setDragOverColumnId(event.over ? (resolveTargetColumn(String(event.over.id))?.id ?? null) : null);
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    setDragOverColumnId(null);

    if (!over || String(over.id) === String(active.id)) {
      setActiveDragId(null);
      return;
    }

    const taskId: string = String(active.id);
    const overId: string = String(over.id);
    const activeTask: Task | undefined = tasks.find((t) => t.id === taskId);

    if (!activeTask) {
      setActiveDragId(null);
      return;
    }

    const targetColumn: ColumnType | undefined = resolveTargetColumn(overId);
    if (!targetColumn) {
      setActiveDragId(null);
      return;
    }

    // New position uses Date.now() so each move gets a fresh sort key..
    onTaskMove(taskId, targetColumn.id, Date.now());
    setActiveDragId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 items-start overflow-x-auto pb-4 min-h-[600px]">
        {sortedColumns.map((column) => {
          const columnTasks: Task[] = tasks
            .filter((t) => t.column_id === column.id)
            .sort((a, b) => a.position - b.position);
          return (
            <Column
              key={column.id}
              column={column}
              tasks={columnTasks}
              isDragOver={dragOverColumnId === column.id && activeDragId !== null}
              onAddTask={onTaskAdd}
              onDeleteTask={onTaskDelete}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
'use client';

import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from './page';

interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
}

export default function TaskCard({ task, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  // DnD transform/transition are applied as inline styles (required by
  // @dnd-kit); everything else uses Tailwind classes only..
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group bg-white p-4 rounded-lg shadow-sm mb-3 border border-gray-200 ${
        isDragging
          ? 'cursor-grabbing shadow-lg scale-105 opacity-90 border-blue-300'
          : 'cursor-grab active:cursor-grabbing active:shadow-lg active:scale-105'
      } transition-all duration-200`}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm text-gray-800 flex-1 break-words leading-snug">{task.title}</p>
        <button
          type="button"
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            event.preventDefault();
            onDelete(task.id);
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-base font-bold leading-none transition-opacity duration-150 focus:opacity-100"
          aria-label={`Delete task: ${task.title}`}
          title="Delete task"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
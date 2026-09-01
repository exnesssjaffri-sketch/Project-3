'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Column as ColumnType, Task } from './page';
import TaskCard from './TaskCard';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  isDragOver: boolean;
  onAddTask: (columnId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function Column({
  column,
  tasks,
  isDragOver,
  onAddTask,
  onDeleteTask,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const taskIds: string[] = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 rounded-xl p-4 w-80 min-h-[600px] flex flex-col transition-all duration-200 ${
        isOver || isDragOver ? 'ring-2 ring-blue-400 bg-gray-200' : ''
      }`}
    >
      <div className="text-lg font-bold text-gray-800 mb-4 flex justify-between items-center">
        <span>{column.title}</span>
        <span className="text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>

      <button
        type="button"
        onClick={() => onAddTask(column.id)}
        className="w-full mt-2 bg-blue-600 text-white rounded p-2 hover:bg-blue-700 active:bg-blue-800 transition-all duration-200"
      >
        + Add Task
      </button>
    </div>
  );
}
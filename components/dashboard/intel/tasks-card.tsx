'use client';
import { useState } from 'react';
import { Task } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  farmId: string;
}

type Tab = 'today' | 'week' | 'season';

function priorityBadge(priority: number) {
  if (priority === 4) return <span className="rounded bg-amber-950/60 px-1 py-0.5 text-[8px] font-bold text-amber-400">Urgent</span>;
  if (priority === 3) return <span className="rounded bg-blue-950/60 px-1 py-0.5 text-[8px] font-bold text-blue-400">Today</span>;
  return null;
}

export function TasksCard({ tasks, farmId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [localTasks, setLocalTasks] = useState(tasks);

  const now = Math.floor(Date.now() / 1000);
  const dayEnd = now + 86400;
  const weekEnd = now + 7 * 86400;

  const filtered = localTasks.filter((t) => {
    if (activeTab === 'today') return !t.due_date || t.due_date <= dayEnd || t.priority >= 3;
    if (activeTab === 'week') return !t.due_date || t.due_date <= weekEnd;
    return true;
  }).slice(0, 5);

  async function handleToggle(task: Task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setLocalTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t));
    await fetch(`/api/farms/${farmId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span>&#9989;</span>
        <span className="text-xs font-bold text-foreground">Tasks</span>
      </div>
      <div className="flex border-b border-border">
        {(['today', 'week', 'season'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
              activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-muted-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-2 space-y-0.5">
        {filtered.length === 0 && (
          <div className="py-3 text-center text-[10px] text-muted-foreground">No tasks &mdash; enjoy the day &#127793;</div>
        )}
        {filtered.map((task) => {
          const done = task.status === 'completed';
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(task)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className={cn(
                'h-3.5 w-3.5 flex-shrink-0 rounded-sm border transition-all',
                done ? 'border-green-700 bg-green-800' : 'border-border'
              )}>
                {done ? <span className="block text-center text-[8px] text-green-300 leading-none pt-px">&#10003;</span> : null}
              </div>
              <span className={cn('flex-1 text-[10px]', done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                {task.title}
              </span>
              {!done && priorityBadge(task.priority)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

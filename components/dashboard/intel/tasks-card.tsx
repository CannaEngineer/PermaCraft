'use client';
import { useState, useRef } from 'react';
import { Task } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { CheckSquare, Plus, Check } from 'lucide-react';

interface Props {
  tasks: Task[];
  farmId: string;
}

type Tab = 'today' | 'week' | 'season';

function priorityBadge(priority: number) {
  if (priority === 4) return (
    <span className="rounded-md bg-red-500/10 text-red-700 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-semibold">
      Urgent
    </span>
  );
  if (priority === 3) return (
    <span className="rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 px-1.5 py-0.5 text-[10px] font-semibold">
      Today
    </span>
  );
  return null;
}

export function TasksCard({ tasks, farmId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [localTasks, setLocalTasks] = useState(tasks);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = Math.floor(Date.now() / 1000);
  const dayEnd = now + 86400;
  const weekEnd = now + 7 * 86400;

  const filtered = localTasks.filter((t) => {
    if (activeTab === 'today') return !t.due_date || t.due_date <= dayEnd || t.priority >= 3;
    if (activeTab === 'week') return !t.due_date || t.due_date <= weekEnd;
    return true;
  }).slice(0, 5);

  async function handleAddTask() {
    const title = newTaskTitle.trim();
    if (!title || isAdding) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 2 }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setLocalTasks((prev) => [task, ...prev]);
        setNewTaskTitle('');
        setShowAddInput(false);
      }
    } finally {
      setIsAdding(false);
    }
  }

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
    <div className="rounded-2xl border border-border/50 bg-card transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-semibold text-foreground tracking-tight">Tasks</h4>
        </div>
        <button
          onClick={() => { setShowAddInput((v) => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          title="Add task"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mb-2 rounded-lg bg-muted/40 p-0.5">
        {(['today', 'week', 'season'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all duration-200',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Add input */}
      {showAddInput && (
        <div className="flex items-center gap-2 mx-4 mb-2 rounded-xl bg-muted/30 px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setShowAddInput(false); setNewTaskTitle(''); } }}
            placeholder="New task..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            disabled={isAdding}
          />
          <button
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || isAdding}
            className="rounded-lg px-3 py-1 text-[11px] font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-all"
          >
            Add
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="px-3 pb-3 space-y-0.5">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No tasks — enjoy the day
          </div>
        )}
        {filtered.map((task) => {
          const done = task.status === 'completed';
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(task)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-muted/30 transition-all duration-200 group"
            >
              <div className={cn(
                'h-4 w-4 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                done
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-border group-hover:border-primary/50'
              )}>
                {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
              <span className={cn(
                'flex-1 text-xs',
                done ? 'line-through text-muted-foreground' : 'text-foreground'
              )}>
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

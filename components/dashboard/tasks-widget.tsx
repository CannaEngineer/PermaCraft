'use client';
import { useState, useRef } from 'react';
import { Task } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Plus, ListChecks } from 'lucide-react';

interface Props {
  tasks: Task[];
  farmId: string;
}

type Tab = 'today' | 'week' | 'all';

export function TasksWidget({ tasks, farmId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [localTasks, setLocalTasks] = useState(tasks);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = Math.floor(Date.now() / 1000);
  const dayEnd = now + 86400;
  const weekEnd = now + 7 * 86400;

  const filtered = localTasks.filter((t) => {
    if (activeTab === 'today') return !t.due_date || t.due_date <= dayEnd || t.priority >= 3;
    if (activeTab === 'week') return !t.due_date || t.due_date <= weekEnd;
    return true;
  }).slice(0, 6);

  const urgentCount = localTasks.filter((t) => t.priority === 4 && t.status === 'pending').length;

  async function handleAdd() {
    const title = newTitle.trim();
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
        setNewTitle('');
        setShowAdd(false);
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(task: Task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t))
    );
    await fetch(`/api/farms/${farmId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <ListChecks className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Tasks</h3>
            {urgentCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {urgentCount} urgent
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setShowAdd((v) => !v);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted transition-colors"
          title="Add task"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-5 mb-3">
        {(['today', 'week', 'all'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              activeTab === tab
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Add input */}
      {showAdd && (
        <div className="flex items-center gap-2 mx-5 mb-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setShowAdd(false);
                setNewTitle('');
              }
            }}
            placeholder="What needs doing?"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none"
            disabled={isAdding}
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || isAdding}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Task list */}
      <div className="px-3 pb-3">
        {filtered.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">All clear for now</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Enjoy the day 🌿</p>
          </div>
        )}
        {filtered.map((task) => {
          const done = task.status === 'completed';
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(task)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/40 transition-colors group"
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
              )}
              <span
                className={cn(
                  'flex-1 text-sm',
                  done ? 'line-through text-muted-foreground/50' : 'text-foreground'
                )}
              >
                {task.title}
              </span>
              {!done && task.priority === 4 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Urgent
                </span>
              )}
              {!done && task.priority === 3 && (
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

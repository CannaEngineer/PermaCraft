'use client';
import React, { useState, useRef } from 'react';
import { Task } from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Plus, ListChecks, Trash2, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import Link from 'next/link';

interface Props {
  tasks: Task[];
  recentlyCompleted?: Task[];
  farmId: string;
}

type Tab = 'today' | 'week' | 'all' | 'done';

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Low', className: 'text-muted-foreground bg-muted/50 border-border/60' },
  { value: 2, label: 'Normal', className: 'text-foreground bg-muted/50 border-border/60' },
  { value: 3, label: 'High', className: 'text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 4, label: 'Urgent', className: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
] as const;

function formatDueDate(dueDate: number | null, now: number): { label: string; className: string } | null {
  if (dueDate === null) return null;
  const dueMs = dueDate * 1000;
  const d = new Date(dueMs);
  if (isPast(d) && !isToday(d)) {
    return {
      label: `${formatDistanceToNow(d)} overdue`,
      className: 'text-red-600 dark:text-red-400',
    };
  }
  if (isToday(d)) {
    return { label: 'Due today', className: 'text-amber-600 dark:text-amber-400' };
  }
  if (isTomorrow(d)) {
    return { label: 'Due tomorrow', className: 'text-amber-600 dark:text-amber-400' };
  }
  return {
    label: `Due ${formatDistanceToNow(d, { addSuffix: true })}`,
    className: 'text-muted-foreground/70',
  };
}

function computeSmartDefaultTab(tasks: Task[]): Tab {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const dayEnd = Math.floor(now.getTime() / 1000);

  const hasToday = tasks.some(
    (t: Task) => (t.due_date !== null && t.due_date <= dayEnd) || t.priority === 4
  );
  if (hasToday) return 'today';

  const weekEnd = dayEnd + 7 * 86400;
  const hasWeek = tasks.some(
    (t: Task) => (t.due_date !== null && t.due_date <= weekEnd) || t.priority === 4
  );
  if (hasWeek) return 'week';

  return tasks.length > 0 ? 'all' : 'today';
}

export function TasksWidget({ tasks, recentlyCompleted = [], farmId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(() => computeSmartDefaultTab(tasks));
  const [localTasks, setLocalTasks] = useState(tasks);
  const [localCompleted, setLocalCompleted] = useState(recentlyCompleted);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState(2);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const now = Math.floor(Date.now() / 1000);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dayEnd = Math.floor(today.getTime() / 1000);
  const weekEnd = dayEnd + 7 * 86400;

  const filtered = activeTab === 'done'
    ? localCompleted.slice(0, 8)
    : localTasks
        .filter((t: Task) => {
          if (activeTab === 'today') {
            return (t.due_date !== null && t.due_date <= dayEnd) || t.priority === 4;
          }
          if (activeTab === 'week') {
            return (t.due_date !== null && t.due_date <= weekEnd) || t.priority === 4;
          }
          return true;
        })
        .slice(0, 6);

  const urgentCount = localTasks.filter((t: Task) => t.priority === 4 && t.status === 'pending').length;
  const doneCount = localCompleted.length;

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title || isAdding) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/farms/${farmId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: newPriority }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setLocalTasks((prev: Task[]) => [task, ...prev]);
        setNewTitle('');
        setNewPriority(2);
        setShowAdd(false);
      }
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(task: Task) {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (newStatus === 'completed') {
      setLocalTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== task.id));
      const completedTask = { ...task, status: 'completed' as Task['status'], completed_at: now };
      setLocalCompleted((prev: Task[]) => [completedTask, ...prev]);
    } else {
      setLocalCompleted((prev: Task[]) => prev.filter((t: Task) => t.id !== task.id));
      const reopenedTask = { ...task, status: 'pending' as Task['status'], completed_at: null };
      setLocalTasks((prev: Task[]) => [reopenedTask, ...prev]);
    }
    await fetch(`/api/farms/${farmId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleDelete(taskId: string) {
    setLocalTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
    setLocalCompleted((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
    await fetch(`/api/farms/${farmId}/tasks/${taskId}`, { method: 'DELETE' });
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
            setShowAdd((v: boolean) => !v);
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
        {(['today', 'week', 'all', 'done'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab === 'done' ? (
              <span className="flex items-center gap-1">
                Done
                {doneCount > 0 && (
                  <span className="rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 text-[10px] font-bold">
                    {doneCount}
                  </span>
                )}
              </span>
            ) : (
              <span className="capitalize">{tab}</span>
            )}
          </button>
        ))}
      </div>

      {/* Add input */}
      {showAdd && (
        <div className="mx-5 mb-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') {
                  setShowAdd(false);
                  setNewTitle('');
                  setNewPriority(2);
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
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/60 mr-1">Priority:</span>
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setNewPriority(opt.value)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-all',
                  newPriority === opt.value
                    ? opt.className + ' ring-1 ring-current/20'
                    : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="px-3 pb-3">
        {filtered.length === 0 && (
          <div className="py-8 text-center">
            {activeTab === 'done' ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No completed tasks this week</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tasks you complete will appear here</p>
              </>
            ) : localTasks.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'today'
                    ? 'Nothing due today'
                    : activeTab === 'week'
                    ? 'Nothing due this week'
                    : 'No open tasks'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {activeTab === 'today' && localTasks.length > 0
                    ? `${localTasks.length} task${localTasks.length !== 1 ? 's' : ''} in "all"`
                    : 'Enjoy the day'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">All clear for now</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Enjoy the day</p>
              </>
            )}
          </div>
        )}
        {filtered.map((task: Task) => {
          const done = task.status === 'completed';
          const due = !done ? formatDueDate(task.due_date, now) : null;
          const isOverdue = due?.className.includes('red') ?? false;
          return (
            <div key={task.id} className="flex items-center gap-0 group/row">
              <button
                onClick={() => handleToggle(task)}
                className="flex flex-1 items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/40 transition-colors group min-w-0"
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
                ) : (
                  <Circle className={cn(
                    'h-5 w-5 flex-shrink-0 mt-0.5 transition-colors',
                    isOverdue ? 'text-red-400/60' : 'text-muted-foreground/40 group-hover:text-muted-foreground/60'
                  )} />
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'text-sm truncate block',
                      done ? 'line-through text-muted-foreground/50' : 'text-foreground'
                    )}
                  >
                    {task.title}
                  </span>
                  {done && task.completed_at && (
                    <span className="text-[11px] text-muted-foreground/50 mt-0.5 block">
                      Completed {formatDistanceToNow(new Date(task.completed_at * 1000), { addSuffix: true })}
                    </span>
                  )}
                  {due && (
                    <span className={cn('flex items-center gap-1 text-[11px] mt-0.5', due.className)}>
                      <Clock className="h-3 w-3" />
                      {due.label}
                    </span>
                  )}
                </div>
                {!done && task.priority === 4 && (
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex-shrink-0">
                    Urgent
                  </span>
                )}
                {!done && task.priority === 3 && (
                  <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">
                    High
                  </span>
                )}
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="flex-shrink-0 opacity-0 group-hover/row:opacity-100 rounded-lg p-2 hover:bg-red-500/10 transition-all"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
              </button>
            </div>
          );
        })}

        {/* Link to full tasks page */}
        {activeTab !== 'done' && localTasks.length > 6 && (
          <Link
            href={`/farm/${farmId}/tasks`}
            className="flex items-center justify-center gap-1 rounded-xl px-3 py-2 mt-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            View all {localTasks.length} tasks
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

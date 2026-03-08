'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, Circle, Clock, Plus, Sprout, Droplets,
  Scissors, Eye, Leaf, MoreHorizontal, Calendar, Flag,
  Search, ChevronDown, SkipForward, Play, Trash2, X,
} from 'lucide-react';
import type { Task, TaskType, TaskStatus } from '@/lib/db/schema';

interface TasksDrawerProps {
  farmId: string;
}

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: typeof Sprout; color: string }> = {
  planting: { label: 'Planting', icon: Sprout, color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  watering: { label: 'Watering', icon: Droplets, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  harvesting: { label: 'Harvest', icon: Leaf, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  maintenance: { label: 'Maintenance', icon: MoreHorizontal, color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400' },
  observation: { label: 'Observation', icon: Eye, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  pruning: { label: 'Pruning', icon: Scissors, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  mulching: { label: 'Mulching', icon: Leaf, color: 'bg-yellow-600/10 text-yellow-700 dark:text-yellow-400' },
  custom: { label: 'Custom', icon: Circle, color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400' },
};

const PRIORITY_CONFIG: Record<number, { label: string; dot: string }> = {
  1: { label: 'Low', dot: 'bg-muted-foreground' },
  2: { label: 'Medium', dot: 'bg-blue-500' },
  3: { label: 'High', dot: 'bg-orange-500' },
  4: { label: 'Urgent', dot: 'bg-red-500' },
};

export function TasksDrawer({ farmId }: TasksDrawerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/farms/${farmId}/tasks?status=all`).then(r => r.json()),
      fetch(`/api/farms/${farmId}/zones`).then(r => r.json()),
      fetch(`/api/farms/${farmId}/plantings`).then(r => r.json()),
    ]).then(([taskData, zoneData, plantingData]) => {
      setTasks(taskData.tasks || []);
      setZones((zoneData.zones || []).map((z: any) => ({ id: z.id, name: z.name, zone_type: z.zone_type || z.type })));
      setPlantings((plantingData.plantings || []).map((p: any) => ({ id: p.id, name: p.name, common_name: p.common_name })));
    }).catch(console.error).finally(() => setLoading(false));
  }, [farmId]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterStatus === 'active') {
      result = result.filter(t => t.status === 'pending' || t.status === 'in_progress');
    } else if (filterStatus !== 'all') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tasks, filterStatus, searchQuery]);

  const stats = useMemo(() => ({
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t =>
      t.status !== 'completed' && t.status !== 'skipped' && t.due_date && t.due_date * 1000 < Date.now()
    ).length,
  }), [tasks]);

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const res = await fetch(`/api/farms/${farmId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === taskId ? data.task : t));
    }
  };

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`/api/farms/${farmId}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const createTask = async (data: any) => {
    const res = await fetch(`/api/farms/${farmId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      setTasks(prev => [result.task, ...prev]);
      setShowCreateForm(false);
    }
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return null;
    const d = new Date(ts * 1000);
    const diff = d.getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
    if (days === 0) return { text: 'Today', overdue: false };
    if (days === 1) return { text: 'Tomorrow', overdue: false };
    if (days <= 7) return { text: `${days}d`, overdue: false };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground">{stats.pending} pending · {stats.in_progress} active · {stats.overdue > 0 ? `${stats.overdue} overdue` : `${stats.completed} done`}</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} size="sm" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-0.5">
          {[
            { key: 'active', label: 'Active' },
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Done' },
          ].map(f => (
            <Button
              key={f.key}
              variant={filterStatus === f.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterStatus(f.key)}
              className="text-xs h-8 px-2.5"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateTaskInline
          onSubmit={createTask}
          onCancel={() => setShowCreateForm(false)}
          zones={zones}
          plantings={plantings}
        />
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {tasks.length === 0 ? 'No tasks yet — create your first one' : 'No matching tasks'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={updateTaskStatus}
              onDelete={deleteTask}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({
  task, onStatusChange, onDelete, formatDate,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  formatDate: (ts: number | null) => { text: string; overdue: boolean } | null;
}) {
  const typeConfig = TASK_TYPE_CONFIG[task.task_type];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const dateInfo = formatDate(task.due_date);
  const isDone = task.status === 'completed' || task.status === 'skipped';
  const TypeIcon = typeConfig.icon;

  const cycleStatus = () => {
    const order: TaskStatus[] = ['pending', 'in_progress', 'completed'];
    const idx = order.indexOf(task.status as TaskStatus);
    onStatusChange(task.id, order[(idx + 1) % order.length]);
  };

  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-accent/40 transition-colors group ${isDone ? 'opacity-50' : ''}`}>
      <button onClick={cycleStatus} className="shrink-0" aria-label="Toggle status">
        {task.status === 'completed' ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
        ) : task.status === 'in_progress' ? (
          <Play className="h-4.5 w-4.5 text-blue-600 fill-blue-600" />
        ) : (
          <Circle className="h-4.5 w-4.5 text-muted-foreground hover:text-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </span>
          {task.priority >= 3 && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityConfig.dot}`} />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="secondary" className={`text-[9px] px-1 py-0 h-4 ${typeConfig.color}`}>
            <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
            {typeConfig.label}
          </Badge>
          {dateInfo && (
            <span className={`text-[10px] ${dateInfo.overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
              {dateInfo.text}
            </span>
          )}
          {task.recurrence && (
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

function CreateTaskInline({
  onSubmit, onCancel, zones, plantings,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  zones: any[];
  plantings: any[];
}) {
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('custom');
  const [priority, setPriority] = useState<number>(2);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [relatedZoneId, setRelatedZoneId] = useState('');
  const [relatedPlantingId, setRelatedPlantingId] = useState('');
  const [showMore, setShowMore] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      task_type: taskType,
      priority,
      due_date: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : null,
      related_zone_id: relatedZoneId || null,
      related_planting_id: relatedPlantingId || null,
    });
  };

  return (
    <Card className="border-primary/30">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-3 space-y-2.5">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="text-sm border-0 px-0 shadow-none focus-visible:ring-0 h-8"
            autoFocus
          />

          {/* Type chips */}
          <div className="flex flex-wrap gap-1">
            {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTaskType(key)}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    taskType === key ? config.color + ' ring-1 ring-current/20' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Priority + Due Date */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Flag className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="text-xs bg-transparent border-0 outline-none cursor-pointer"
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
                <option value={4}>Urgent</option>
              </select>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="text-xs bg-transparent border-0 outline-none"
              />
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Less' : 'More options'}
          </button>

          {showMore && (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Details..."
                rows={2}
                className="w-full text-xs bg-transparent border rounded-md px-2 py-1.5 outline-none resize-none focus:ring-1 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={relatedZoneId}
                  onChange={e => setRelatedZoneId(e.target.value)}
                  className="text-xs border rounded-md px-1.5 py-1 bg-background"
                >
                  <option value="">Link to zone...</option>
                  {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name || z.zone_type}</option>)}
                </select>
                <select
                  value={relatedPlantingId}
                  onChange={e => setRelatedPlantingId(e.target.value)}
                  className="text-xs border rounded-md px-1.5 py-1 bg-background"
                >
                  <option value="">Link to planting...</option>
                  {plantings.map((p: any) => <option key={p.id} value={p.id}>{p.name || p.common_name}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-1.5 pt-0.5">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-7 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim()} className="h-7 text-xs">
              Create
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

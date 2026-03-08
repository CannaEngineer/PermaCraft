'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, Circle, Clock, Plus, Filter,
  ArrowLeft, Sprout, Droplets, Scissors, Eye,
  Leaf, MoreHorizontal, Calendar, Flag, Search,
  ChevronDown, X, SkipForward, Play, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import type { Task, TaskType, TaskStatus, TaskPriority } from '@/lib/db/schema';

interface TaskBoardProps {
  farmId: string;
  farmName: string;
  zones: { id: string; name: string | null; zone_type: string }[];
  plantings: { id: string; name: string | null; common_name: string }[];
}

const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: typeof Sprout; color: string }> = {
  planting: { label: 'Planting', icon: Sprout, color: 'bg-green-500/10 text-green-700' },
  watering: { label: 'Watering', icon: Droplets, color: 'bg-blue-500/10 text-blue-700' },
  harvesting: { label: 'Harvest', icon: Leaf, color: 'bg-amber-500/10 text-amber-700' },
  maintenance: { label: 'Maintenance', icon: MoreHorizontal, color: 'bg-slate-500/10 text-slate-700' },
  observation: { label: 'Observation', icon: Eye, color: 'bg-purple-500/10 text-purple-700' },
  pruning: { label: 'Pruning', icon: Scissors, color: 'bg-orange-500/10 text-orange-700' },
  mulching: { label: 'Mulching', icon: Leaf, color: 'bg-yellow-600/10 text-yellow-700' },
  custom: { label: 'Custom', icon: Circle, color: 'bg-gray-500/10 text-gray-700' },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; dot: string }> = {
  1: { label: 'Low', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  2: { label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-500' },
  3: { label: 'High', color: 'text-orange-600', dot: 'bg-orange-500' },
  4: { label: 'Urgent', color: 'text-red-600', dot: 'bg-red-500' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  pending: { label: 'To Do', icon: Circle },
  in_progress: { label: 'In Progress', icon: Play },
  completed: { label: 'Done', icon: CheckCircle2 },
  skipped: { label: 'Skipped', icon: SkipForward },
};

type ViewMode = 'list' | 'board';

export function TaskBoard({ farmId, farmName, zones, plantings }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const statusParam = filterStatus === 'active' ? '' : `&status=${filterStatus}`;
      const typeParam = filterType !== 'all' ? `&type=${filterType}` : '';
      const res = await fetch(`/api/farms/${farmId}/tasks?status=all${typeParam}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId, filterType]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
    overdue: tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped' && t.due_date && t.due_date * 1000 < Date.now()).length,
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
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
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
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
    if (days === 0) return { text: 'Today', overdue: false };
    if (days === 1) return { text: 'Tomorrow', overdue: false };
    if (days <= 7) return { text: `${days}d`, overdue: false };
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/canvas?farm=${farmId}&section=farm`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{farmName}</h1>
            <p className="text-sm text-muted-foreground">Tasks & Workflow</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'To Do', value: stats.pending, color: 'text-foreground' },
            { label: 'Active', value: stats.in_progress, color: 'text-blue-600' },
            { label: 'Done', value: stats.completed, color: 'text-green-600' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1">
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
                className="text-xs h-9"
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <CreateTaskForm
            onSubmit={createTask}
            onCancel={() => setShowCreateForm(false)}
            zones={zones}
            plantings={plantings}
          />
        )}

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <Card className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.length === 0 ? 'Create your first task to get started' : 'Try adjusting your filters'}
            </p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {filteredTasks.map(task => (
              <TaskRow
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
    </div>
  );
}

function TaskRow({
  task,
  onStatusChange,
  onDelete,
  formatDate,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  formatDate: (ts: number | null) => { text: string; overdue: boolean } | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = TASK_TYPE_CONFIG[task.task_type];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const dateInfo = formatDate(task.due_date);
  const isDone = task.status === 'completed' || task.status === 'skipped';
  const TypeIcon = typeConfig.icon;

  const cycleStatus = () => {
    const order: TaskStatus[] = ['pending', 'in_progress', 'completed'];
    const currentIdx = order.indexOf(task.status as TaskStatus);
    const nextStatus = order[(currentIdx + 1) % order.length];
    onStatusChange(task.id, nextStatus);
  };

  return (
    <Card className={`transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 p-3 md:p-4">
        {/* Status Toggle */}
        <button
          onClick={cycleStatus}
          className="mt-0.5 shrink-0 transition-colors"
          aria-label={`Mark as ${task.status === 'completed' ? 'pending' : 'completed'}`}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : task.status === 'in_progress' ? (
            <Play className="h-5 w-5 text-blue-600 fill-blue-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </span>
            {task.priority >= 3 && (
              <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${typeConfig.color}`}>
              <TypeIcon className="h-3 w-3 mr-0.5" />
              {typeConfig.label}
            </Badge>
            {dateInfo && (
              <span className={`text-xs flex items-center gap-1 ${dateInfo.overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                <Calendar className="h-3 w-3" />
                {dateInfo.text}
              </span>
            )}
            {task.recurrence && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Recurring
              </span>
            )}
          </div>

          {expanded && task.description && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isDone && task.status !== 'skipped' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onStatusChange(task.id, 'skipped')}
              title="Skip"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(task.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CreateTaskForm({
  onSubmit,
  onCancel,
  zones,
  plantings,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  zones: any[];
  plantings: any[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('custom');
  const [priority, setPriority] = useState<number>(2);
  const [dueDate, setDueDate] = useState('');
  const [relatedZoneId, setRelatedZoneId] = useState('');
  const [relatedPlantingId, setRelatedPlantingId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    <Card className="mb-4 border-primary/30">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4 space-y-3">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="text-base font-medium border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />

          {/* Type chips */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, typeof TASK_TYPE_CONFIG[TaskType]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTaskType(key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    taskType === key
                      ? config.color + ' ring-1 ring-current/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Priority + Due Date row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <select
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="text-sm bg-transparent border-0 outline-none cursor-pointer"
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
                <option value={4}>Urgent</option>
              </select>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="text-sm bg-transparent border-0 outline-none"
              />
            </div>
          </div>

          {/* Advanced */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            {showAdvanced ? 'Less options' : 'More options'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add details..."
                rows={2}
                className="w-full text-sm bg-transparent border rounded-md px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={relatedZoneId}
                  onChange={e => setRelatedZoneId(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                  <option value="">Link to zone...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name || z.zone_type}</option>
                  ))}
                </select>
                <select
                  value={relatedPlantingId}
                  onChange={e => setRelatedPlantingId(e.target.value)}
                  className="text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                  <option value="">Link to planting...</option>
                  {plantings.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.common_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim()}>
              Create Task
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

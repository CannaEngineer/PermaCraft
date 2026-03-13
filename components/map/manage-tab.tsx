'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useImmersiveMapUI } from '@/contexts/immersive-map-ui-context';
import { ChevronDown, ChevronRight, Plus, Check, MapPin, Calendar, ListTodo, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RedesignedTimeMachine } from '@/components/time-machine/redesigned-time-machine';
import { queueMilestone } from '@/lib/map/story-automation';

interface ManageTabProps {
  farmId: string;
  zones: any[];
  plantings: any[];
  phases: any[];
  currentYear: number;
  onYearChange: (year: number) => void;
  onStoryCountChange?: () => void;
  mapRef: React.RefObject<any>;
}

interface CropPlan {
  id: string;
  name: string;
  season: string;
  year: number;
  status: string;
  notes?: string;
  zone_id?: string;
  start_date?: number;
  end_date?: number;
  variety?: string;
  expected_yield?: string;
  item_count?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  due_date?: number;
  related_zone_id?: string;
  completion_note?: string;
}

interface TimelineEntry {
  id: string;
  label: string;
  entry_date: number;
  type: string;
  source_id?: string;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  draft: { label: 'Planned', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  completed: { label: 'Harvested', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
};

const TASK_STATUS_DISPLAY: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Done',
  skipped: 'Skipped',
};

export function ManageTab({
  farmId,
  zones,
  plantings,
  phases,
  currentYear,
  onYearChange,
  onStoryCountChange,
  mapRef,
}: ManageTabProps) {
  const { setZoneLinkMode, setDrawerHeight } = useImmersiveMapUI();

  const [cropPlans, setCropPlans] = useState<CropPlan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showNewTimelineForm, setShowNewTimelineForm] = useState(false);
  const [timelineView, setTimelineView] = useState<'week' | 'month'>('month');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState('');

  // New plan form state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanZoneId, setNewPlanZoneId] = useState('');
  const [newPlanStartDate, setNewPlanStartDate] = useState('');
  const [newPlanEndDate, setNewPlanEndDate] = useState('');
  const [newPlanVariety, setNewPlanVariety] = useState('');
  const [newPlanYield, setNewPlanYield] = useState('');

  // New timeline entry form state
  const [newTimelineLabel, setNewTimelineLabel] = useState('');
  const [newTimelineDate, setNewTimelineDate] = useState('');
  const [newTimelineNote, setNewTimelineNote] = useState('');

  // Stat row values
  const totalZones = zones.length;
  const totalPlants = plantings.length;
  const activePlans = cropPlans.filter(p => p.status === 'active').length;

  // Fetch data
  useEffect(() => {
    const load = async () => {
      const [plansRes, tasksRes, timelineRes] = await Promise.allSettled([
        fetch(`/api/farms/${farmId}/crop-plans`).then(r => r.json()),
        fetch(`/api/farms/${farmId}/tasks`).then(r => r.json()),
        fetch(`/api/farms/${farmId}/timeline-entries`).then(r => r.json()).catch(() => ({ entries: [] })),
      ]);
      if (plansRes.status === 'fulfilled') setCropPlans((plansRes.value.plans || []).filter((p: CropPlan) => p.status !== 'archived'));
      if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.tasks || []);
      if (timelineRes.status === 'fulfilled') setTimelineEntries(timelineRes.value.entries || []);
    };
    load();
  }, [farmId]);

  // Milestone completion check on tab focus
  useEffect(() => {
    const checkMilestones = async () => {
      try {
        const res = await fetch(`/api/farms/${farmId}/timeline-entries`);
        if (!res.ok) return;
        const data = await res.json();
        const entries = data.entries || [];
        const now = Date.now() / 1000 | 0;

        for (const entry of entries) {
          if (entry.type === 'crop_plan' && entry.entry_date <= now && entry.source_id) {
            // Check if story entry already exists for this
            try {
              const storyRes = await fetch(`/api/farms/${farmId}/story-entries?source_prefix=crop_plan:${entry.source_id}`);
              const storyData = await storyRes.json();
              if (!storyData.entries || storyData.entries.length === 0) {
                await queueMilestone(entry.source_id, farmId);
                onStoryCountChange?.();
              }
            } catch {
              // Silently skip on error
            }
          }
        }
      } catch {
        // Silently skip
      }
    };
    checkMilestones();
  }, [farmId, onStoryCountChange]);

  const handleCreatePlan = async () => {
    if (!newPlanName || !newPlanStartDate || !newPlanEndDate) return;
    const startEpoch = Math.floor(new Date(newPlanStartDate).getTime() / 1000);
    const endEpoch = Math.floor(new Date(newPlanEndDate).getTime() / 1000);

    try {
      const res = await fetch(`/api/farms/${farmId}/crop-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlanName,
          season: 'year-round',
          year: new Date().getFullYear(),
          zone_id: newPlanZoneId || undefined,
          start_date: startEpoch,
          end_date: endEpoch,
          variety: newPlanVariety || undefined,
          expected_yield: newPlanYield || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCropPlans(prev => [...prev, data.plan]);
        // Also create timeline entry
        try {
          await fetch(`/api/farms/${farmId}/timeline-entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: `${newPlanName} — Planting Window`,
              entry_date: startEpoch,
              type: 'crop_plan',
              source_id: data.plan.id,
            }),
          });
        } catch {
          // Timeline entry creation is non-critical
        }
        // Reset form
        setNewPlanName('');
        setNewPlanZoneId('');
        setNewPlanStartDate('');
        setNewPlanEndDate('');
        setNewPlanVariety('');
        setNewPlanYield('');
        setShowNewPlanModal(false);
      }
    } catch {
      // Error handling - user can retry
    }
  };

  const handleCreateTimelineEntry = async () => {
    if (!newTimelineLabel || !newTimelineDate) return;
    const dateEpoch = Math.floor(new Date(newTimelineDate).getTime() / 1000);

    try {
      const res = await fetch(`/api/farms/${farmId}/timeline-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newTimelineLabel,
          entry_date: dateEpoch,
          type: 'manual',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTimelineEntries(prev => [...prev, data.entry].sort((a, b) => a.entry_date - b.entry_date));
        setNewTimelineLabel('');
        setNewTimelineDate('');
        setNewTimelineNote('');
        setShowNewTimelineForm(false);
      }
    } catch {
      // Error handling
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (newStatus === 'completed') {
      setCompletingTaskId(taskId);
      return;
    }
    await updateTaskStatus(taskId, newStatus);
  };

  const updateTaskStatus = async (taskId: string, status: string, note?: string) => {
    try {
      await fetch(`/api/farms/${farmId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, completion_note: note }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, completion_note: note } : t));
    } catch {
      // Error handling
    }
  };

  const handleCompleteTask = async (skip: boolean) => {
    if (!completingTaskId) return;
    const note = skip ? undefined : completionNote;
    await updateTaskStatus(completingTaskId, 'completed', note);

    if (!skip && completionNote) {
      // Queue story entry via API
      try {
        await fetch(`/api/farms/${farmId}/story-entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'task', taskId: completingTaskId, note: completionNote }),
        });
        onStoryCountChange?.();
      } catch {
        // Non-critical
      }
    }

    setCompletingTaskId(null);
    setCompletionNote('');
  };

  const handleLinkZone = (planId: string) => {
    if (zones.length === 0) return;
    setZoneLinkMode(true);
    setDrawerHeight('peek');
    // The zone selection will be handled by the parent map component
    // which listens for zoneLinkMode and calls back with the selected zone
  };

  const handleZoneClick = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone && mapRef.current) {
      try {
        const geojson = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
        const { center } = require('@turf/center');
        const centerPoint = center(geojson);
        mapRef.current.flyTo({ center: centerPoint.geometry.coordinates, zoom: 18, duration: 500 });
      } catch {
        // Silent fail on geo parsing
      }
    }
  };

  const formatDate = (epoch: number) => {
    return new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'skipped');

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Stat Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-accent/40 p-3 text-center">
          <div className="text-lg font-semibold">{totalZones}</div>
          <div className="text-xs text-muted-foreground">Zones</div>
        </div>
        <div className="rounded-xl bg-accent/40 p-3 text-center">
          <div className="text-lg font-semibold">{totalPlants}</div>
          <div className="text-xs text-muted-foreground">Plants</div>
        </div>
        <div className="rounded-xl bg-accent/40 p-3 text-center">
          <div className="text-lg font-semibold">{activePlans}</div>
          <div className="text-xs text-muted-foreground">Active Plans</div>
        </div>
      </div>

      {/* Crop Plans Section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Crop Plans
          </h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowNewPlanModal(true)}>
            <Plus className="h-3 w-3 mr-1" />
            New Crop Plan
          </Button>
        </div>

        {cropPlans.length === 0 ? (
          <div className="text-xs text-muted-foreground py-3 text-center bg-accent/20 rounded-lg">
            No crop plans yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {cropPlans.map(plan => {
              const status = STATUS_DISPLAY[plan.status] || STATUS_DISPLAY.draft;
              const isExpanded = expandedPlanId === plan.id;
              const linkedZone = plan.zone_id ? zones.find(z => z.id === plan.zone_id) : null;

              return (
                <div key={plan.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-accent/40 transition-colors text-left"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{plan.name}</span>
                      {plan.start_date && plan.end_date && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-accent/10">
                      {plan.variety && (
                        <div className="text-xs mt-2">
                          <span className="text-muted-foreground">Variety:</span> {plan.variety}
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="text-muted-foreground">Zone:</span>{' '}
                        {linkedZone ? (
                          <button
                            onClick={() => handleZoneClick(linkedZone.id)}
                            className="text-primary hover:underline"
                          >
                            {linkedZone.name || 'Unnamed Zone'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            None
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-5 text-[10px] px-1.5 ml-1"
                              onClick={() => handleLinkZone(plan.id)}
                              disabled={zones.length === 0}
                              title={zones.length === 0 ? 'Draw a zone first' : 'Link a zone'}
                            >
                              <MapPin className="h-3 w-3 mr-0.5" />
                              Link Zone
                            </Button>
                          </span>
                        )}
                      </div>
                      {plan.expected_yield && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Expected yield:</span> {plan.expected_yield}
                        </div>
                      )}
                      {plan.notes && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Notes:</span> {plan.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* New Crop Plan Modal */}
        {showNewPlanModal && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowNewPlanModal(false)} />
            <div className="relative z-10 bg-card border border-border rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:w-96 max-h-[80vh] overflow-y-auto p-5 space-y-3">
              <h3 className="font-semibold text-sm">New Crop Plan</h3>

              <div>
                <label className="text-xs text-muted-foreground">Crop Name *</label>
                <Input value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder="e.g. Spring Tomatoes" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Zone</label>
                <select
                  value={newPlanZoneId}
                  onChange={e => setNewPlanZoneId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={zones.length === 0}
                >
                  <option value="">{zones.length === 0 ? 'No zones yet' : 'Select zone (optional)'}</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name || 'Unnamed Zone'}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date *</label>
                  <Input type="date" value={newPlanStartDate} onChange={e => setNewPlanStartDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date *</label>
                  <Input type="date" value={newPlanEndDate} onChange={e => setNewPlanEndDate(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Variety</label>
                <Input value={newPlanVariety} onChange={e => setNewPlanVariety(e.target.value)} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Expected Yield</label>
                <Input value={newPlanYield} onChange={e => setNewPlanYield(e.target.value)} placeholder="Optional, e.g. 50 lbs" className="mt-1" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewPlanModal(false)} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={handleCreatePlan} disabled={!newPlanName || !newPlanStartDate || !newPlanEndDate} className="flex-1">Create</Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Timeline / Calendar Section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Timeline
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTimelineView('week')}
              className={`px-2 py-0.5 text-xs rounded ${timelineView === 'week' ? 'bg-primary text-primary-foreground' : 'bg-accent/60 text-muted-foreground'}`}
            >
              Week
            </button>
            <button
              onClick={() => setTimelineView('month')}
              className={`px-2 py-0.5 text-xs rounded ${timelineView === 'month' ? 'bg-primary text-primary-foreground' : 'bg-accent/60 text-muted-foreground'}`}
            >
              Month
            </button>
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-1" onClick={() => setShowNewTimelineForm(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add Entry
            </Button>
          </div>
        </div>

        {showNewTimelineForm && (
          <div className="border rounded-lg p-3 mb-2 bg-accent/10 space-y-2">
            <Input value={newTimelineLabel} onChange={e => setNewTimelineLabel(e.target.value)} placeholder="Label *" className="text-sm" />
            <Input type="date" value={newTimelineDate} onChange={e => setNewTimelineDate(e.target.value)} className="text-sm" />
            <Input value={newTimelineNote} onChange={e => setNewTimelineNote(e.target.value)} placeholder="Note (optional)" className="text-sm" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewTimelineForm(false)} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={handleCreateTimelineEntry} disabled={!newTimelineLabel || !newTimelineDate} className="flex-1">Save</Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {timelineEntries.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center bg-accent/20 rounded-lg">
              No timeline entries yet.
            </div>
          ) : (
            <div className="space-y-1">
              {timelineEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/40 transition-colors text-xs">
                  <span className="text-muted-foreground w-20 flex-shrink-0">{formatDate(entry.entry_date)}</span>
                  <span className="flex-1 truncate">{entry.label}</span>
                  <span className="text-muted-foreground capitalize flex-shrink-0">{entry.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tasks Section (collapsible) */}
      <section>
        <button
          onClick={() => setTasksExpanded(!tasksExpanded)}
          className="flex items-center gap-1.5 w-full text-left"
        >
          {tasksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <ListTodo className="h-4 w-4" />
            Tasks
            {pendingTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                {pendingTasks.length}
              </span>
            )}
          </h3>
        </button>

        {tasksExpanded && (
          <div className="mt-2 space-y-1">
            {tasks.length === 0 ? (
              <div className="text-xs text-muted-foreground py-3 text-center bg-accent/20 rounded-lg">
                No tasks yet.
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/40 transition-colors">
                    <button
                      onClick={() => handleTaskStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                      className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground/40 hover:border-primary'
                      }`}
                    >
                      {task.status === 'completed' && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground ml-2">
                          Due {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground capitalize flex-shrink-0">
                      {TASK_STATUS_DISPLAY[task.status] || task.status}
                    </span>
                  </div>

                  {/* Completion note prompt */}
                  {completingTaskId === task.id && (
                    <div className="ml-7 p-2 rounded-lg bg-accent/20 space-y-2">
                      <textarea
                        value={completionNote}
                        onChange={e => setCompletionNote(e.target.value)}
                        placeholder="What did you notice? (optional, 2 sentences max)"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-6 text-xs" onClick={() => handleCompleteTask(false)} disabled={!completionNote}>
                          Save Note
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => handleCompleteTask(true)}>
                          Skip
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Time Machine */}
      <section>
        <h3 className="text-sm font-semibold mb-2">Time Machine</h3>
        <RedesignedTimeMachine
          plantings={plantings}
          currentYear={currentYear}
          onYearChange={onYearChange}
        />
      </section>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhaseForm } from './phase-form';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';

interface PhaseManagerProps {
  farmId: string;
}

export function PhaseManager({ farmId }: PhaseManagerProps) {
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPhases();
  }, [farmId]);

  async function loadPhases() {
    try {
      const response = await fetch(`/api/farms/${farmId}/phases`);
      const data = await response.json();
      setPhases(data.phases);
    } catch (error) {
      console.error('Failed to load phases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrUpdate(formData: any) {
    try {
      const url = editingPhase
        ? `/api/farms/${farmId}/phases/${editingPhase.id}`
        : `/api/farms/${farmId}/phases`;

      const method = editingPhase ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save phase');
      }

      toast({ title: editingPhase ? 'Phase updated' : 'Phase created' });
      setShowForm(false);
      setEditingPhase(null);
      loadPhases();
    } catch (error) {
      console.error('Failed to save phase:', error);
      toast({ title: 'Failed to save phase', variant: 'destructive' });
    }
  }

  async function handleDelete(phaseId: string) {
    if (!confirm('Delete this phase? Features will be unassigned.')) return;

    try {
      await fetch(`/api/farms/${farmId}/phases/${phaseId}`, {
        method: 'DELETE'
      });

      toast({ title: 'Phase deleted' });
      loadPhases();
    } catch (error) {
      console.error('Failed to delete phase:', error);
      toast({ title: 'Failed to delete phase', variant: 'destructive' });
    }
  }

  function handleEdit(phase: any) {
    setEditingPhase(phase);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingPhase(null);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading phases...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Implementation Phases
        </CardTitle>
        <CardDescription>
          Organize design elements by implementation timeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm ? (
          <>
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Phase
            </Button>

            <div className="space-y-3">
              {phases.map(phase => (
                <div
                  key={phase.id}
                  className="border rounded-md p-3 flex items-start gap-3"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-move" />

                  <div
                    className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: phase.color }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{phase.name}</div>
                    {phase.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {phase.description}
                      </div>
                    )}
                    {(phase.start_date || phase.end_date) && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {phase.start_date && format(new Date(phase.start_date * 1000), 'MMM yyyy')}
                        {phase.start_date && phase.end_date && ' - '}
                        {phase.end_date && format(new Date(phase.end_date * 1000), 'MMM yyyy')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(phase)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(phase.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {phases.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No phases yet. Create phases to organize your implementation timeline.
                </div>
              )}
            </div>
          </>
        ) : (
          <PhaseForm
            initialData={editingPhase}
            onSubmit={handleCreateOrUpdate}
            onCancel={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  );
}

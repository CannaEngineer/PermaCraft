'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  ClipboardList,
  Calendar,
  DollarSign,
  Leaf,
  AlertTriangle,
  ArrowRight,
  Download,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIReportDialogProps {
  farmId: string;
  farmName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReportType = 'comprehensive' | 'implementation_plan';

interface ReportState {
  loading: boolean;
  data: any | null;
  rawContent: string | null;
  error: string | null;
  model: string | null;
}

export function AIReportDialog({ farmId, farmName, open, onOpenChange }: AIReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType>('comprehensive');
  const [reportFocus, setReportFocus] = useState('');
  const [report, setReport] = useState<ReportState>({
    loading: false,
    data: null,
    rawContent: null,
    error: null,
    model: null,
  });
  const { toast } = useToast();

  async function handleGenerate() {
    setReport({ loading: true, data: null, rawContent: null, error: null, model: null });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`/api/farms/${farmId}/reports/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          reportFocus: reportFocus.trim() || undefined,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Failed with status ${res.status}`);
      }

      const result = await res.json();
      setReport({
        loading: false,
        data: result.data,
        rawContent: result.rawContent || null,
        error: result.parseError ? 'Report generated but structured parsing failed. Showing raw output.' : null,
        model: result.model,
      });
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'Report generation timed out. Try again or narrow the focus area.'
        : error?.message || 'Failed to generate report';
      setReport({ loading: false, data: null, rawContent: null, error: message, model: null });
    }
  }

  function handleDownloadJSON() {
    if (!report.data) return;
    const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${farmName.replace(/\s+/g, '-')}-ai-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report downloaded as JSON' });
  }

  function handleDownloadCSV() {
    if (!report.data) return;
    const data = report.data;
    const rows: string[][] = [];

    // Build CSV from planting schedule
    if (data.planting_schedule?.length > 0) {
      rows.push(['Phase', 'Timeline', 'Task', 'Species', 'Quantity', 'Spacing', 'Location', 'Est. Cost ($)', 'Labor (hrs)', 'Priority']);
      for (const phase of data.planting_schedule) {
        for (const task of phase.tasks || []) {
          rows.push([
            phase.phase || '',
            phase.timeline || '',
            task.task || '',
            task.species || '',
            task.quantity || '',
            task.spacing || '',
            task.location_notes || '',
            String(task.estimated_cost_usd ?? ''),
            String(task.labor_hours ?? ''),
            task.priority || '',
          ]);
        }
      }
    }

    // Add material estimates
    if (data.material_estimates?.length > 0) {
      rows.push([]);
      rows.push(['--- Material Estimates ---']);
      rows.push(['Category', 'Item', 'Quantity', 'Unit Cost ($)', 'Total Cost ($)', 'Source']);
      for (const cat of data.material_estimates) {
        for (const item of cat.items || []) {
          rows.push([
            cat.category || '',
            item.item || '',
            item.quantity || '',
            String(item.unit_cost_usd ?? ''),
            String(item.total_cost_usd ?? ''),
            item.source_notes || '',
          ]);
        }
      }
    }

    if (rows.length === 0) {
      toast({ title: 'No tabular data to export', variant: 'destructive' });
      return;
    }

    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${farmName.replace(/\s+/g, '-')}-planting-schedule-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Schedule exported as CSV (open in Excel/Sheets)' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Farm Report
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive farm plan powered by MiniMax M2.5 — optimized for structured planning and document generation.
          </DialogDescription>
        </DialogHeader>

        {!report.data && !report.loading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={reportType === 'comprehensive' ? 'default' : 'outline'}
                  onClick={() => setReportType('comprehensive')}
                  className="h-auto py-3 flex flex-col items-start"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <ClipboardList className="h-4 w-4" />
                    Comprehensive Report
                  </span>
                  <span className="text-xs font-normal opacity-80 text-left mt-1">
                    Full analysis with costs, schedules, and biodiversity scorecard
                  </span>
                </Button>
                <Button
                  variant={reportType === 'implementation_plan' ? 'default' : 'outline'}
                  onClick={() => setReportType('implementation_plan')}
                  className="h-auto py-3 flex flex-col items-start"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-4 w-4" />
                    Implementation Plan
                  </span>
                  <span className="text-xs font-normal opacity-80 text-left mt-1">
                    Week-by-week tasks with tools, materials, and dependencies
                  </span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-focus">Focus Area (optional)</Label>
              <Input
                id="report-focus"
                placeholder="e.g., food forest design, water management, first-year priorities..."
                value={reportFocus}
                onChange={(e) => setReportFocus(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank for a full farm report, or specify an area to emphasize.
              </p>
            </div>

            <Button onClick={handleGenerate} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        )}

        {report.loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Generating your farm report...</p>
              <p className="text-sm text-muted-foreground mt-1">
                MiniMax M2.5 is analyzing your farm data and building a structured plan. This may take 30-60 seconds.
              </p>
            </div>
          </div>
        )}

        {report.error && !report.data && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive text-center">{report.error}</p>
            <Button variant="outline" onClick={() => setReport({ loading: false, data: null, rawContent: null, error: null, model: null })}>
              Try Again
            </Button>
          </div>
        )}

        {report.data && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Model badge */}
              {report.model && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {report.model}
                  </Badge>
                  {report.error && (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Partial parse
                    </Badge>
                  )}
                </div>
              )}

              {/* Executive Summary */}
              {report.data.executive_summary && (
                <div>
                  <h3 className="font-semibold text-sm mb-1">Executive Summary</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {report.data.executive_summary}
                  </p>
                </div>
              )}

              <Separator />

              {/* Biodiversity Scorecard */}
              {report.data.biodiversity_scorecard && (
                <div>
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Leaf className="h-4 w-4" />
                    Biodiversity Scorecard
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Total Species</span>
                      <p className="font-bold text-lg">{report.data.biodiversity_scorecard.total_species}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <span className="text-muted-foreground">Native %</span>
                      <p className="font-bold text-lg">{report.data.biodiversity_scorecard.native_percentage}%</p>
                    </div>
                  </div>
                  {report.data.biodiversity_scorecard.gaps?.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-amber-600">Gaps identified:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {report.data.biodiversity_scorecard.gaps.map((gap: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs text-amber-600 border-amber-300">
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cost Summary */}
              {report.data.total_estimated_cost_usd != null && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      Estimated Total Cost
                    </h3>
                    <p className="text-2xl font-bold">
                      ${Number(report.data.total_estimated_cost_usd).toLocaleString()}
                    </p>
                    {report.data.material_estimates?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {report.data.material_estimates.map((cat: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{cat.category}</span>
                            <span className="font-medium">${Number(cat.subtotal_usd || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Planting Schedule Preview */}
              {report.data.planting_schedule?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Planting Schedule ({report.data.planting_schedule.length} phases)
                    </h3>
                    <div className="space-y-2">
                      {report.data.planting_schedule.slice(0, 3).map((phase: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                          <div className="font-medium">{phase.phase}</div>
                          <div className="text-muted-foreground">{phase.timeline}</div>
                          <div className="mt-1">
                            {(phase.tasks || []).slice(0, 3).map((task: any, j: number) => (
                              <div key={j} className="flex items-start gap-1 mt-0.5">
                                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                <span>{task.task}</span>
                              </div>
                            ))}
                            {(phase.tasks?.length || 0) > 3 && (
                              <span className="text-muted-foreground ml-4">
                                +{phase.tasks.length - 3} more tasks
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {report.data.planting_schedule.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{report.data.planting_schedule.length - 3} more phases (download full report)
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Implementation Plan phases */}
              {report.data.phases?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Implementation Phases ({report.data.phases.length})
                    </h3>
                    <div className="space-y-2">
                      {report.data.phases.slice(0, 3).map((phase: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                          <div className="font-medium">Phase {phase.phase_number}: {phase.name}</div>
                          <div className="text-muted-foreground">
                            {phase.season} — Year {phase.year} — {phase.duration_weeks} weeks
                          </div>
                          <div className="mt-1 text-muted-foreground">{phase.objective}</div>
                        </div>
                      ))}
                      {report.data.phases.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{report.data.phases.length - 3} more phases (download full report)
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Next Steps */}
              {report.data.next_steps?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Next Steps</h3>
                    <div className="space-y-1">
                      {report.data.next_steps.map((step: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Badge
                            variant={step.priority === 'critical' ? 'destructive' : 'secondary'}
                            className="text-[10px] shrink-0"
                          >
                            {step.priority}
                          </Badge>
                          <span>{step.action}</span>
                          <span className="text-muted-foreground shrink-0">{step.timeline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Download buttons */}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadJSON} className="flex-1">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="flex-1">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download CSV
                </Button>
              </div>

              {/* Generate new */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReport({ loading: false, data: null, rawContent: null, error: null, model: null })}
                className="w-full text-xs"
              >
                Generate a different report
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

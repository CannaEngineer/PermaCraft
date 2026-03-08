'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Plus, ArrowLeft, Calendar, Sprout, Sun, Snowflake,
  CloudRain, Leaf, MoreHorizontal, Trash2, ChevronRight,
  Package, TrendingUp, Edit2, Check, X,
} from 'lucide-react';
import Link from 'next/link';
import type { CropPlan, CropPlanItem, CropPlanSeason, CropPlanStatus, CropItemStatus } from '@/lib/db/schema';

interface CropPlannerProps {
  farmId: string;
  farmName: string;
  climateZone: string | null;
  zones: { id: string; name: string | null; zone_type: string }[];
  species: { id: string; common_name: string; scientific_name: string; layer: string }[];
}

const SEASON_CONFIG: Record<CropPlanSeason, { label: string; icon: typeof Sun; color: string }> = {
  spring: { label: 'Spring', icon: Sprout, color: 'bg-green-500/10 text-green-700' },
  summer: { label: 'Summer', icon: Sun, color: 'bg-amber-500/10 text-amber-700' },
  fall: { label: 'Fall', icon: Leaf, color: 'bg-orange-500/10 text-orange-700' },
  winter: { label: 'Winter', icon: Snowflake, color: 'bg-blue-500/10 text-blue-700' },
  'year-round': { label: 'Year-round', icon: CloudRain, color: 'bg-purple-500/10 text-purple-700' },
};

const STATUS_COLOR: Record<CropPlanStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-500/10 text-green-700',
  completed: 'bg-blue-500/10 text-blue-700',
  archived: 'bg-slate-500/10 text-slate-600',
};

const ITEM_STATUS_CONFIG: Record<CropItemStatus, { label: string; color: string; progress: number }> = {
  planned: { label: 'Planned', color: 'bg-muted text-muted-foreground', progress: 0 },
  sown: { label: 'Sown', color: 'bg-amber-500/10 text-amber-700', progress: 20 },
  transplanted: { label: 'Transplanted', color: 'bg-green-500/10 text-green-700', progress: 40 },
  growing: { label: 'Growing', color: 'bg-emerald-500/10 text-emerald-700', progress: 60 },
  harvesting: { label: 'Harvesting', color: 'bg-orange-500/10 text-orange-700', progress: 80 },
  done: { label: 'Complete', color: 'bg-blue-500/10 text-blue-700', progress: 100 },
};

export function CropPlanner({ farmId, farmName, climateZone, zones, species }: CropPlannerProps) {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/farms/${farmId}/crop-plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch crop plans:', error);
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  const fetchPlanDetail = useCallback(async (planId: string) => {
    try {
      const res = await fetch(`/api/farms/${farmId}/crop-plans/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlan(data.plan);
        setPlanItems(data.items);
      }
    } catch (error) {
      console.error('Failed to fetch plan detail:', error);
    }
  }, [farmId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const createPlan = async (data: any) => {
    const res = await fetch(`/api/farms/${farmId}/crop-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      setPlans(prev => [result.plan, ...prev]);
      setShowCreatePlan(false);
      setSelectedPlan(result.plan);
      setPlanItems([]);
    }
  };

  const addItem = async (data: any) => {
    if (!selectedPlan) return;
    const res = await fetch(`/api/farms/${farmId}/crop-plans/${selectedPlan.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      setPlanItems(prev => [...prev, result.item]);
      setShowAddItem(false);
    }
  };

  const updateItemStatus = async (itemId: string, status: CropItemStatus) => {
    if (!selectedPlan) return;
    const res = await fetch(`/api/farms/${farmId}/crop-plans/${selectedPlan.id}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, status }),
    });
    if (res.ok) {
      setPlanItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedPlan) return;
    const res = await fetch(`/api/farms/${farmId}/crop-plans/${selectedPlan.id}/items?itemId=${itemId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setPlanItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const deletePlan = async (planId: string) => {
    const res = await fetch(`/api/farms/${farmId}/crop-plans/${planId}`, { method: 'DELETE' });
    if (res.ok) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
        setPlanItems([]);
      }
    }
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedPlan) {
    const planProgress = planItems.length > 0
      ? Math.round(planItems.reduce((sum, i) => sum + (ITEM_STATUS_CONFIG[i.status as CropItemStatus]?.progress || 0), 0) / planItems.length)
      : 0;

    const seasonConfig = SEASON_CONFIG[selectedPlan.season as CropPlanSeason];
    const SeasonIcon = seasonConfig?.icon || Calendar;

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setSelectedPlan(null); setPlanItems([]); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground truncate">{selectedPlan.name}</h1>
                <Badge className={STATUS_COLOR[selectedPlan.status as CropPlanStatus]}>{selectedPlan.status}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <SeasonIcon className="h-3.5 w-3.5" />
                <span>{seasonConfig?.label} {selectedPlan.year}</span>
                <span>·</span>
                <span>{planItems.length} crops</span>
              </div>
            </div>
            <Button onClick={() => setShowAddItem(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Crop</span>
            </Button>
          </div>

          {/* Progress */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Plan Progress</span>
                <span className="text-sm text-muted-foreground">{planProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${planProgress}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Item Form */}
          {showAddItem && (
            <AddCropItemForm
              onSubmit={addItem}
              onCancel={() => setShowAddItem(false)}
              species={species}
              zones={zones}
            />
          )}

          {/* Items */}
          {planItems.length === 0 ? (
            <Card className="py-12 text-center">
              <Sprout className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No crops added yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first crop to this plan</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {planItems.map(item => {
                const statusConfig = ITEM_STATUS_CONFIG[item.status as CropItemStatus];
                return (
                  <Card key={item.id}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            {item.species_name && item.species_name !== item.name && (
                              <span className="text-xs text-muted-foreground italic">{item.species_name}</span>
                            )}
                          </div>

                          {/* Timeline */}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {item.planned_sow_date && (
                              <span>Sow: {formatDate(item.planned_sow_date)}</span>
                            )}
                            {item.planned_transplant_date && (
                              <span>Transplant: {formatDate(item.planned_transplant_date)}</span>
                            )}
                            {item.planned_harvest_date && (
                              <span className="text-amber-600">Harvest: {formatDate(item.planned_harvest_date)}</span>
                            )}
                          </div>

                          {/* Yield info */}
                          {(item.expected_yield || item.actual_yield) && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {item.expected_yield && (
                                <span className="text-muted-foreground">
                                  Expected: {item.expected_yield} {item.expected_yield_unit}
                                </span>
                              )}
                              {item.actual_yield && (
                                <span className="text-green-600 font-medium">
                                  Actual: {item.actual_yield} {item.actual_yield_unit}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Status chips */}
                          <div className="flex items-center gap-1.5 mt-2">
                            {(Object.entries(ITEM_STATUS_CONFIG) as [CropItemStatus, typeof ITEM_STATUS_CONFIG[CropItemStatus]][]).map(([key, config]) => (
                              <button
                                key={key}
                                onClick={() => updateItemStatus(item.id, key)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                                  item.status === key
                                    ? config.color + ' ring-1 ring-current/20'
                                    : 'bg-transparent text-muted-foreground/50 hover:text-muted-foreground'
                                }`}
                              >
                                {config.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Plan list view
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
            <p className="text-sm text-muted-foreground">Crop Planning</p>
          </div>
          <Button onClick={() => setShowCreatePlan(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Plan</span>
          </Button>
        </div>

        {/* Create Plan Form */}
        {showCreatePlan && (
          <CreatePlanForm
            onSubmit={createPlan}
            onCancel={() => setShowCreatePlan(false)}
          />
        )}

        {/* Plan Cards */}
        {plans.length === 0 ? (
          <Card className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No crop plans yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a seasonal plan to organize your plantings</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {plans.map(plan => {
              const seasonConfig = SEASON_CONFIG[plan.season as CropPlanSeason];
              const SeasonIcon = seasonConfig?.icon || Calendar;
              return (
                <Card
                  key={plan.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => fetchPlanDetail(plan.id)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${seasonConfig?.color || 'bg-muted'}`}>
                      <SeasonIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{plan.name}</span>
                        <Badge className={`text-[10px] ${STATUS_COLOR[plan.status as CropPlanStatus]}`}>
                          {plan.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {seasonConfig?.label} {plan.year} · {plan.item_count || 0} crops
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={e => { e.stopPropagation(); deletePlan(plan.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlanForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [season, setSeason] = useState<CropPlanSeason>('spring');
  const [year, setYear] = useState(new Date().getFullYear());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), season, year });
  };

  return (
    <Card className="mb-4 border-primary/30">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4 space-y-3">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Plan name (e.g., Spring Garden 2026)"
            autoFocus
          />
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(SEASON_CONFIG) as [CropPlanSeason, typeof SEASON_CONFIG[CropPlanSeason]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSeason(key)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    season === key ? config.color + ' ring-1 ring-current/20' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year:</span>
            <Input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              min={2020}
              max={2100}
              className="w-24 h-9"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>Create Plan</Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function AddCropItemForm({
  onSubmit,
  onCancel,
  species,
  zones,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  species: any[];
  zones: any[];
}) {
  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [transplantDate, setTransplantDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('plants');
  const [expectedYield, setExpectedYield] = useState('');
  const [yieldUnit, setYieldUnit] = useState('lbs');
  const [speciesSearch, setSpeciesSearch] = useState('');

  const filteredSpecies = useMemo(() => {
    if (!speciesSearch) return species.slice(0, 20);
    const q = speciesSearch.toLowerCase();
    return species.filter(s =>
      s.common_name.toLowerCase().includes(q) ||
      s.scientific_name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [species, speciesSearch]);

  const handleSpeciesSelect = (s: any) => {
    setSpeciesId(s.id);
    setName(s.common_name);
    setSpeciesSearch(s.common_name);
  };

  const toEpoch = (dateStr: string) => dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      species_id: speciesId || null,
      zone_id: zoneId || null,
      planned_sow_date: toEpoch(sowDate),
      planned_transplant_date: toEpoch(transplantDate),
      planned_harvest_date: toEpoch(harvestDate),
      quantity: quantity ? Number(quantity) : null,
      unit: quantity ? unit : null,
      expected_yield: expectedYield ? Number(expectedYield) : null,
      expected_yield_unit: expectedYield ? yieldUnit : null,
    });
  };

  return (
    <Card className="mb-4 border-primary/30">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4 space-y-3">
          {/* Species search */}
          <div className="relative">
            <Input
              value={speciesSearch}
              onChange={e => { setSpeciesSearch(e.target.value); setSpeciesId(''); setName(e.target.value); }}
              placeholder="Search species or enter custom name..."
              autoFocus
            />
            {speciesSearch && !speciesId && filteredSpecies.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSpecies.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSpeciesSelect(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{s.common_name}</span>
                    <span className="text-muted-foreground ml-1 italic text-xs">{s.scientific_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Sow Date</label>
              <input type="date" value={sowDate} onChange={e => setSowDate(e.target.value)}
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Transplant</label>
              <input type="date" value={transplantDate} onChange={e => setTransplantDate(e.target.value)}
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Harvest</label>
              <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)}
                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background" />
            </div>
          </div>

          {/* Quantity + Zone */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex gap-1">
              <Input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" min="0" placeholder="Qty" className="flex-1 h-9" />
              <select value={unit} onChange={e => setUnit(e.target.value)} className="text-sm border rounded-md px-2 bg-background h-9">
                <option value="plants">plants</option>
                <option value="seeds">seeds</option>
                <option value="rows">rows</option>
                <option value="beds">beds</option>
                <option value="sq_ft">sq ft</option>
              </select>
            </div>
            <select value={zoneId} onChange={e => setZoneId(e.target.value)} className="text-sm border rounded-md px-2 bg-background h-9">
              <option value="">Zone (optional)</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name || z.zone_type}</option>)}
            </select>
          </div>

          {/* Expected yield */}
          <div className="flex gap-1 items-center">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Expected yield:</span>
            <Input value={expectedYield} onChange={e => setExpectedYield(e.target.value)} type="number" min="0" placeholder="0" className="w-20 h-9" />
            <select value={yieldUnit} onChange={e => setYieldUnit(e.target.value)} className="text-sm border rounded-md px-2 bg-background h-9">
              <option value="lbs">lbs</option>
              <option value="oz">oz</option>
              <option value="bushels">bushels</option>
              <option value="bunches">bunches</option>
              <option value="heads">heads</option>
              <option value="pieces">pieces</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>Add Crop</Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus, Footprints, Trash2, Loader2, Star, Clock,
} from 'lucide-react';
import type { TourRoute, TourPoi } from '@/lib/db/schema';

export function TourAdminRoutes() {
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [routes, setRoutes] = useState<TourRoute[]>([]);
  const [pois, setPois] = useState<TourPoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // New route form
  const [newName, setNewName] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('easy');
  const [newDuration, setNewDuration] = useState('');
  const [selectedPoiIds, setSelectedPoiIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/farms')
      .then(r => r.json())
      .then(data => {
        setFarms(data.farms || []);
        if (data.farms?.length > 0) setSelectedFarmId(data.farms[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;
    Promise.all([
      fetch(`/api/admin/tour/routes?farm_id=${selectedFarmId}`).then(r => r.json()),
      fetch(`/api/admin/tour/pois?farm_id=${selectedFarmId}`).then(r => r.json()),
    ]).then(([routeData, poiData]) => {
      setRoutes(routeData.routes || []);
      setPois(poiData.pois || []);
    }).catch(console.error);
  }, [selectedFarmId]);

  const createRoute = async () => {
    if (!newName || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/tour/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          name: newName,
          difficulty: newDifficulty,
          duration_minutes: newDuration ? parseInt(newDuration) : null,
          poi_sequence: selectedPoiIds,
          is_default: routes.length === 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoutes(prev => [...prev, data.route]);
        setNewName('');
        setNewDuration('');
        setSelectedPoiIds([]);
        setShowCreate(false);
      }
    } catch (error) {
      console.error('Failed to create route:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteRoute = async (id: string) => {
    if (!confirm('Delete this route?')) return;
    try {
      await fetch(`/api/admin/tour/routes/${id}`, { method: 'DELETE' });
      setRoutes(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete route:', error);
    }
  };

  const togglePoiSelection = (poiId: string) => {
    setSelectedPoiIds(prev =>
      prev.includes(poiId) ? prev.filter(id => id !== poiId) : [...prev, poiId]
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {farms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Create Route</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Tour Route</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Route Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Full Farm Loop" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Difficulty</Label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="challenging">Challenging</option>
                  </select>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} placeholder="30" />
                </div>
              </div>
              <div>
                <Label>Select POIs (in order)</Label>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {pois.filter(p => p.active === 1).map(poi => (
                    <div
                      key={poi.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedPoiIds.includes(poi.id)
                          ? 'bg-green-50 dark:bg-green-950 border border-green-200'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => togglePoiSelection(poi.id)}
                    >
                      {selectedPoiIds.includes(poi.id) && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedPoiIds.indexOf(poi.id) + 1}
                        </Badge>
                      )}
                      <span className="text-sm">{poi.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={createRoute} disabled={creating || !newName} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Route
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Footprints className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No routes yet. Create your first tour route.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {routes.map(route => {
            const poiSequence: string[] = JSON.parse(route.poi_sequence || '[]');
            return (
              <Card key={route.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    <Footprints className="w-4 h-4 text-green-700 dark:text-green-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{route.name}</span>
                      {route.is_default === 1 && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-0.5" />Default
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">{route.difficulty}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{poiSequence.length} stops</span>
                      {route.duration_minutes && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{route.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => deleteRoute(route.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

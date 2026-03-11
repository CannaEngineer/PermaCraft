'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPin, Plus, Edit, Trash2, QrCode, Loader2, Eye, EyeOff,
} from 'lucide-react';
import { POI_CATEGORIES } from '@/lib/tour/utils';
import type { TourPoi } from '@/lib/db/schema';

export function TourAdminPois() {
  const router = useRouter();
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [pois, setPois] = useState<TourPoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // New POI form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
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
    fetch(`/api/admin/tour/pois?farm_id=${selectedFarmId}`)
      .then(r => r.json())
      .then(data => setPois(data.pois || []))
      .catch(console.error);
  }, [selectedFarmId]);

  const createPoi = async () => {
    if (!newName || !newLat || !newLng || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/tour/pois', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          name: newName,
          category: newCategory,
          lat: parseFloat(newLat),
          lng: parseFloat(newLng),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPois(prev => [...prev, data.poi]);
        setNewName('');
        setNewLat('');
        setNewLng('');
        setShowCreate(false);
      }
    } catch (error) {
      console.error('Failed to create POI:', error);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (poi: TourPoi) => {
    try {
      await fetch(`/api/admin/tour/pois/${poi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: poi.active === 1 ? 0 : 1 }),
      });
      setPois(prev => prev.map(p =>
        p.id === poi.id ? { ...p, active: poi.active === 1 ? 0 : 1 } : p
      ));
    } catch (error) {
      console.error('Failed to toggle POI:', error);
    }
  };

  const deletePoi = async (id: string) => {
    if (!confirm('Delete this point of interest?')) return;
    try {
      await fetch(`/api/admin/tour/pois/${id}`, { method: 'DELETE' });
      setPois(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete POI:', error);
    }
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
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add POI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Point of Interest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Herb Spiral" />
              </div>
              <div>
                <Label>Category</Label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {Object.entries(POI_CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Latitude</Label>
                  <Input type="number" step="any" value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="37.7749" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input type="number" step="any" value={newLng} onChange={(e) => setNewLng(e.target.value)} placeholder="-122.4194" />
                </div>
              </div>
              <Button onClick={createPoi} disabled={creating || !newName || !newLat || !newLng} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create POI
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pois.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No points of interest yet. Add your first POI to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pois.map(poi => {
            const category = POI_CATEGORIES[poi.category] || POI_CATEGORIES.general;
            return (
              <Card key={poi.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <MapPin className="w-4 h-4" style={{ color: category.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{poi.name}</span>
                      <Badge variant="outline" className="text-xs">{category.label}</Badge>
                      {poi.active === 0 && (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      QR: {poi.qr_code_id} | {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(poi)}
                      title={poi.active === 1 ? 'Hide' : 'Show'}
                    >
                      {poi.active === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push(`/admin/tour/pois/${poi.id}`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => deletePoi(poi.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

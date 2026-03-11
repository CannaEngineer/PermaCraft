'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Flower2,
  Droplets,
  Home,
  TreePine,
  Dog,
  Recycle,
  Flag,
  Star,
  Waypoints,
  Save,
} from 'lucide-react';
import type { TourStop, TourStopType } from '@/lib/db/schema';

const STOP_TYPES: { value: TourStopType; label: string; icon: typeof MapPin }[] = [
  { value: 'point_of_interest', label: 'Point of Interest', icon: Star },
  { value: 'garden_bed', label: 'Garden Bed', icon: Flower2 },
  { value: 'water_feature', label: 'Water Feature', icon: Droplets },
  { value: 'structure', label: 'Structure', icon: Home },
  { value: 'food_forest', label: 'Food Forest', icon: TreePine },
  { value: 'animal_area', label: 'Animal Area', icon: Dog },
  { value: 'composting', label: 'Composting', icon: Recycle },
  { value: 'welcome', label: 'Welcome Point', icon: Flag },
  { value: 'farewell', label: 'Farewell Point', icon: Waypoints },
  { value: 'custom', label: 'Custom', icon: MapPin },
];

interface TourStopEditorProps {
  farmId: string;
  tourId: string;
  stopId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function TourStopEditor({ farmId, tourId, stopId, onSaved, onCancel }: TourStopEditorProps) {
  const isNew = !stopId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stopType, setStopType] = useState<TourStopType>('point_of_interest');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('3');
  const [isOptional, setIsOptional] = useState(false);
  const [seasonalNotes, setSeasonalNotes] = useState('');

  useEffect(() => {
    if (!isNew && stopId) {
      (async () => {
        try {
          const res = await fetch(`/api/farms/${farmId}/tours/${tourId}`);
          if (res.ok) {
            const data = await res.json();
            const stop = data.stops.find((s: TourStop) => s.id === stopId);
            if (stop) {
              setTitle(stop.title);
              setDescription(stop.description || '');
              setStopType(stop.stop_type);
              setLat(stop.lat != null ? String(stop.lat) : '');
              setLng(stop.lng != null ? String(stop.lng) : '');
              setEstimatedMinutes(String(stop.estimated_time_minutes));
              setIsOptional(stop.is_optional === 1);
              setSeasonalNotes(stop.seasonal_visibility || '');
            }
          }
        } catch (err) {
          console.error('Failed to fetch stop:', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isNew, stopId, farmId, tourId]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      stop_type: stopType,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      estimated_time_minutes: parseInt(estimatedMinutes) || 3,
      is_optional: isOptional ? 1 : 0,
      seasonal_visibility: seasonalNotes.trim() || null,
    };

    try {
      const url = isNew
        ? `/api/farms/${farmId}/tours/${tourId}/stops`
        : `/api/farms/${farmId}/tours/${tourId}/stops/${stopId}`;

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`Failed to save: ${text}`);
        return;
      }

      onSaved();
    } catch {
      alert('Failed to save stop');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold tracking-tight">
          {isNew ? 'Add Tour Stop' : 'Edit Stop'}
        </h2>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="stop-title">Stop Name</Label>
        <Input
          id="stop-title"
          placeholder="e.g., The Herb Spiral, Main Pond, Apple Guild"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          maxLength={100}
        />
      </div>

      {/* Stop Type */}
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STOP_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => setStopType(type.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                stopType === type.value
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <type.icon className={`h-4 w-4 shrink-0 ${stopType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="truncate">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="stop-desc">Description</Label>
        <Textarea
          id="stop-desc"
          placeholder="What will visitors see here? Share the story behind this spot."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">{description.length}/1000</p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label>Map Location (optional)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Add coordinates to show this stop on the tour map. You can get these from the farm editor.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="stop-lat" className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              id="stop-lat"
              type="number"
              step="any"
              placeholder="e.g., 37.7749"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stop-lng" className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              id="stop-lng"
              type="number"
              step="any"
              placeholder="e.g., -122.4194"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Estimated Time */}
      <div className="space-y-2">
        <Label htmlFor="stop-time">Estimated Time at Stop</Label>
        <div className="flex items-center gap-2">
          <Input
            id="stop-time"
            type="number"
            min="1"
            max="60"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">minutes</span>
        </div>
      </div>

      {/* Optional toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Optional Stop</Label>
          <p className="text-xs text-muted-foreground">Visitors can skip this stop</p>
        </div>
        <Switch checked={isOptional} onCheckedChange={setIsOptional} />
      </div>

      {/* Seasonal Notes */}
      <div className="space-y-2">
        <Label htmlFor="stop-season">Seasonal Notes (optional)</Label>
        <Input
          id="stop-season"
          placeholder="e.g., Best in spring, Skip in winter"
          value={seasonalNotes}
          onChange={(e) => setSeasonalNotes(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !title.trim()} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isNew ? 'Add Stop' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

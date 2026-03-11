'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Save, Loader2, QrCode, MapPin, Printer,
} from 'lucide-react';
import { POI_CATEGORIES, getPoiQrUrl } from '@/lib/tour/utils';
import type { TourPoi, TourConfig } from '@/lib/db/schema';

interface TourAdminPoiEditorProps {
  poiId: string;
}

export function TourAdminPoiEditor({ poiId }: TourAdminPoiEditorProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [poi, setPoi] = useState<TourPoi | null>(null);
  const [config, setConfig] = useState<TourConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [speciesList, setSpeciesList] = useState('');

  useEffect(() => {
    fetch(`/api/admin/tour/pois/${poiId}`)
      .then(r => r.json())
      .then(async (data) => {
        if (data.poi) {
          const p = data.poi;
          setPoi(p);
          setName(p.name);
          setCategory(p.category);
          setLat(String(p.lat));
          setLng(String(p.lng));
          setDescription(p.description || '');
          setSpeciesList(
            p.species_list ? JSON.parse(p.species_list).join(', ') : ''
          );

          // Fetch tour config for QR URL
          const configRes = await fetch(`/api/admin/tour/config?farm_id=${p.farm_id}`);
          const configData = await configRes.json();
          if (configData.config) {
            setConfig(configData.config);
            generateQrCode(configData.config.slug, p.id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [poiId]);

  // Initialize mini map
  useEffect(() => {
    if (!poi || !mapContainer.current || mapRef.current) return;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      const map = new maplibregl.Map({
        container: mapContainer.current!,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [poi.lng, poi.lat],
        zoom: 18,
      });

      const marker = new maplibregl.Marker({ draggable: true })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setLat(String(lngLat.lat));
        setLng(String(lngLat.lng));
      });

      map.on('click', (e: any) => {
        marker.setLngLat(e.lngLat);
        setLat(String(e.lngLat.lat));
        setLng(String(e.lngLat.lng));
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [poi]);

  const generateQrCode = async (slug: string, id: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const url = getPoiQrUrl(slug, id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('QR generation failed:', error);
    }
  };

  const save = async () => {
    if (!name || !lat || !lng || saving) return;
    setSaving(true);
    try {
      const species = speciesList
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await fetch(`/api/admin/tour/pois/${poiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          description: description || null,
          species_list: species.length > 0 ? species : null,
        }),
      });
    } catch (error) {
      console.error('Failed to save POI:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!poi) {
    return <div className="text-center py-12 text-muted-foreground">POI not found</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tour/pois')}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to POIs
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Editor form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Edit POI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description (Markdown)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Describe what visitors will see at this stop..."
              />
            </div>
            <div>
              <Label>Species (comma-separated)</Label>
              <Input
                value={speciesList}
                onChange={(e) => setSpeciesList(e.target.value)}
                placeholder="Red Maple, White Oak, Eastern Redbud"
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Map */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Location</CardTitle>
              <p className="text-xs text-muted-foreground">Click the map or drag the marker to reposition</p>
            </CardHeader>
            <CardContent>
              <div ref={mapContainer} className="w-full h-64 rounded-lg" />
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Badge variant="outline" className="mb-2">ID: {poi.qr_code_id}</Badge>
              {qrDataUrl ? (
                <div>
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto mb-2" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `poi-${poi.qr_code_id}.png`;
                      link.href = qrDataUrl;
                      link.click();
                    }}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Download QR
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Configure tour slug to generate QR code
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

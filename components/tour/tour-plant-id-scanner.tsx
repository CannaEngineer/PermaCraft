'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Camera, Loader2, Leaf, AlertCircle } from 'lucide-react';

interface PlantIdResult {
  common_name: string;
  scientific_name: string;
  confidence: 'high' | 'medium' | 'low';
  permaculture_role: string;
  edibility: string;
  note: string;
}

interface TourPlantIdScannerProps {
  onClose: () => void;
}

export function TourPlantIdScanner({ onClose }: TourPlantIdScannerProps) {
  const [result, setResult] = useState<PlantIdResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Track event
    const sessionId = sessionStorage.getItem('tour_session_id');
    const farmId = sessionStorage.getItem('tour_farm_id');
    if (sessionId && farmId) {
      fetch('/api/tour/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          events: [{
            session_id: sessionId,
            farm_id: farmId,
            event_type: 'plant_id_scan',
          }],
        }),
      }).catch(console.error);
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPreview(base64);

      const response = await fetch('/api/tour/ai/plant-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        throw new Error('Plant identification service unavailable');
      }

      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      } else {
        setError('Could not identify this plant. Try a clearer photo.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to identify plant');
    } finally {
      setLoading(false);
    }
  }, []);

  const edibilityColors: Record<string, string> = {
    edible: 'bg-green-100 text-green-800',
    edible_with_caution: 'bg-yellow-100 text-yellow-800',
    not_edible: 'bg-gray-100 text-gray-800',
    toxic: 'bg-red-100 text-red-800',
  };

  const confidenceColors: Record<string, string> = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800',
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Plant Identifier</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Camera input */}
        {!preview && !loading && (
          <div className="text-center py-12">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Take a photo of a plant to identify it
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCapture(file);
              }}
            />
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
        )}

        {/* Preview + Loading */}
        {preview && (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Plant photo"
              className="w-full max-h-64 object-cover rounded-lg"
            />

            {loading && (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Identifying plant...</p>
              </div>
            )}

            {error && (
              <Card className="border-red-200">
                <CardContent className="p-3 flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{result.common_name}</CardTitle>
                  <p className="text-sm text-muted-foreground italic">{result.scientific_name}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={confidenceColors[result.confidence] || ''}>
                      {result.confidence} confidence
                    </Badge>
                    <Badge className={edibilityColors[result.edibility] || ''}>
                      {result.edibility.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {result.permaculture_role && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Permaculture Role</p>
                      <p className="text-sm">{result.permaculture_role}</p>
                    </div>
                  )}

                  {result.note && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Did You Know?</p>
                      <p className="text-sm">{result.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Try again */}
            {(result || error) && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    setResult(null);
                    setError(null);
                  }}
                >
                  Scan Another Plant
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, FileImage, FileText } from 'lucide-react';
import { captureMapSnapshot, downloadSnapshot } from '@/lib/export/snapshot';
import maplibregl from 'maplibre-gl';

interface ExportPanelProps {
  farmId: string;
  farmName: string;
  mapInstance: maplibregl.Map | null;
}

export function ExportPanel({ farmId, farmName, mapInstance }: ExportPanelProps) {
  const [includeZones, setIncludeZones] = useState(true);
  const [includePlantings, setIncludePlantings] = useState(true);
  const [includePhases, setIncludePhases] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  async function handleExportPNG() {
    if (!mapInstance) {
      toast({ title: 'Map not ready', variant: 'destructive' });
      return;
    }

    setExporting(true);

    try {
      const dataUrl = await captureMapSnapshot(mapInstance, {
        format: 'png',
        width: 1920,
        height: 1080
      });

      const filename = `${farmName.replace(/\s+/g, '-')}-${Date.now()}.png`;
      downloadSnapshot(dataUrl, filename);

      toast({ title: 'Map exported as PNG' });
    } catch (error) {
      console.error('Failed to export PNG:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    if (!mapInstance) {
      toast({ title: 'Map not ready', variant: 'destructive' });
      return;
    }

    setExporting(true);

    try {
      // Capture map
      const mapImageDataUrl = await captureMapSnapshot(mapInstance, {
        format: 'jpeg',
        quality: 0.9
      });

      // Load data
      const [zonesData, plantingsData, phasesData] = await Promise.all([
        includeZones ? fetch(`/api/farms/${farmId}/zones`).then(r => r.json()) : null,
        includePlantings ? fetch(`/api/farms/${farmId}/plantings`).then(r => r.json()) : null,
        includePhases ? fetch(`/api/farms/${farmId}/phases`).then(r => r.json()) : null
      ]);

      // Call server-side PDF generation API
      const response = await fetch(`/api/farms/${farmId}/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapImageDataUrl,
          includeZones,
          includePlantings,
          includePhases,
          zones: zonesData?.zones || [],
          plantings: plantingsData?.plantings || [],
          phases: phasesData?.phases || []
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${farmName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Farm plan exported as PDF' });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Farm Plan
        </CardTitle>
        <CardDescription>
          Download professional farm plan documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 border-b pb-4">
          <Label>Include in PDF:</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-zones"
              checked={includeZones}
              onCheckedChange={(checked) => setIncludeZones(checked as boolean)}
            />
            <Label htmlFor="include-zones" className="cursor-pointer">
              Zones list
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-plantings"
              checked={includePlantings}
              onCheckedChange={(checked) => setIncludePlantings(checked as boolean)}
            />
            <Label htmlFor="include-plantings" className="cursor-pointer">
              Plantings list
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-phases"
              checked={includePhases}
              onCheckedChange={(checked) => setIncludePhases(checked as boolean)}
            />
            <Label htmlFor="include-phases" className="cursor-pointer">
              Implementation phases
            </Label>
          </div>
        </div>

        <Button
          onClick={handleExportPNG}
          disabled={exporting}
          className="w-full"
          variant="outline"
        >
          <FileImage className="h-4 w-4 mr-2" />
          Export Map as PNG
        </Button>

        <Button
          onClick={handleExportPDF}
          disabled={exporting}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Farm Plan as PDF'}
        </Button>
      </CardContent>
    </Card>
  );
}

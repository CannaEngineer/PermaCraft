"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FarmMap } from "@/components/map/farm-map";
import { EnhancedChatPanel } from "@/components/ai/enhanced-chat-panel";
import { Button } from "@/components/ui/button";
import { SaveIcon, MessageSquare, Trash2 } from "lucide-react";
import type { Farm, Zone } from "@/lib/db/schema";
import type maplibregl from "maplibre-gl";
import { calculateGridCoordinates, formatGridRange } from "@/lib/map/zone-grid-calculator";
import { toPng } from "html-to-image";
import { DeleteFarmDialog } from "@/components/shared/delete-farm-dialog";

interface FarmEditorClientProps {
  farm: Farm;
  initialZones: Zone[];
  isOwner: boolean;
}

export function FarmEditorClient({
  farm,
  initialZones,
  isOwner,
}: FarmEditorClientProps) {
  const router = useRouter();
  const [zones, setZones] = useState<any[]>(initialZones);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentMapLayer, setCurrentMapLayer] = useState<string>("satellite");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleCloseChat = () => {
      setIsChatOpen(false);
    };
    window.addEventListener("close-chat", handleCloseChat);
    return () => {
      window.removeEventListener("close-chat", handleCloseChat);
    };
  }, []);

  const handleSave = async (showAlert = true) => {
    setSaving(true);

    try {
      const res = await fetch(`/api/farms/${farm.id}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones }),
      });

      if (!res.ok) {
        throw new Error("Failed to save zones");
      }

      setHasUnsavedChanges(false);
      if (showAlert) {
        alert("Zones saved successfully!");
      }
    } catch (error) {
      if (showAlert) {
        alert("Failed to save zones");
      }
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges) {
      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      // Auto-save after 2 seconds of inactivity
      autoSaveTimer.current = setTimeout(() => {
        handleSave(false);
      }, 2000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [zones, hasUnsavedChanges]);

  // Handle zones change with unsaved flag
  const handleZonesChange = (newZones: any[]) => {
    setZones(newZones);
    setHasUnsavedChanges(true);
  };

  const handleAnalyze = useCallback(
    async (
      query: string,
      conversationId?: string
    ): Promise<{
      response: string;
      conversationId: string;
      analysisId: string;
      screenshot: string;
    }> => {
      // Capture screenshot from map container
      if (!mapContainerRef.current || !mapRef.current) {
        throw new Error("Map not ready");
      }

      // Wait for map to be fully loaded and ALL tiles rendered
      await new Promise<void>((resolve) => {
        let tilesLoaded = false;
        let idleCount = 0;

        const checkReady = () => {
          // Check if all source tiles are loaded
          const style = mapRef.current!.getStyle();
          const sourcesLoaded = Object.keys(style.sources).every(sourceId => {
            const source = mapRef.current!.getSource(sourceId);
            // @ts-ignore - MapLibre internal property
            return !source || !source._tiles || Object.keys(source._tiles).length === 0 ||
                   // @ts-ignore
                   Object.values(source._tiles).every((tile: any) => tile.state === 'loaded');
          });

          if (sourcesLoaded && mapRef.current!.loaded() && !mapRef.current!.isMoving()) {
            idleCount++;
            console.log(`Map ready check ${idleCount}/3, tiles loaded: ${sourcesLoaded}`);

            // Wait for 3 consecutive idle+loaded checks
            if (idleCount >= 3) {
              tilesLoaded = true;
              console.log("Map is fully ready for screenshot");
              setTimeout(() => resolve(), 500); // Final delay
            } else {
              setTimeout(checkReady, 200);
            }
          } else {
            idleCount = 0;
            mapRef.current!.once("idle", checkReady);
          }
        };

        checkReady();

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!tilesLoaded) {
            console.warn("Map screenshot timeout - capturing anyway");
            resolve();
          }
        }, 10000);
      });

      let screenshotData: string;
      try {
        console.log("Starting screenshot capture - will capture on next render...");

        if (!mapContainerRef.current || !mapRef.current) {
          throw new Error("Map container not available");
        }

        // NEW APPROACH: Capture canvas immediately after render event
        // preserveDrawingBuffer doesn't work reliably, so we capture during the render cycle
        const canvas = mapRef.current.getCanvas();

        const captureCanvasOnRender = (): Promise<string> => {
          return new Promise((resolve, reject) => {
            let captured = false;

            const captureHandler = () => {
              if (captured) return;
              captured = true;

              // Capture immediately during this render frame
              try {
                const dataUrl = canvas.toDataURL("image/png", 1.0);
                console.log("Canvas captured on render:", {
                  width: canvas.width,
                  height: canvas.height,
                  dataSize: dataUrl.length,
                  isBlank: dataUrl.length < 50000,
                });

                if (dataUrl.length < 50000) {
                  reject(new Error("Canvas is still blank after render"));
                } else {
                  resolve(dataUrl);
                }
              } catch (error) {
                reject(error);
              }
            };

            // Trigger a render and capture on the very next render event
            mapRef.current!.once('render', captureHandler);
            mapRef.current!.triggerRepaint();

            // Timeout after 3 seconds
            setTimeout(() => {
              if (!captured) {
                captured = true;
                reject(new Error("Screenshot capture timed out"));
              }
            }, 3000);
          });
        };

        const canvasDataUrl = await captureCanvasOnRender();

        console.log("Canvas successfully captured!");

        // Step 2: Create a temporary image element to hold the canvas content
        const tempImg = document.createElement('img');
        tempImg.src = canvasDataUrl;
        tempImg.style.position = 'absolute';
        tempImg.style.top = '0';
        tempImg.style.left = '0';
        tempImg.style.width = '100%';
        tempImg.style.height = '100%';
        tempImg.style.pointerEvents = 'none';
        tempImg.style.zIndex = '0';
        tempImg.className = 'temp-screenshot-canvas';

        // Wait for image to load
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.onerror = resolve;
        });

        // Insert the temp image
        const mapCanvas = mapContainerRef.current.querySelector('canvas');
        if (mapCanvas && mapCanvas.parentElement) {
          mapCanvas.parentElement.insertBefore(tempImg, mapCanvas);
          (mapCanvas as HTMLElement).style.opacity = '0';
        }

        console.log("Capturing composite with overlays...");

        // Temporarily show legend for screenshot (for LLM context)
        const legendContent = mapContainerRef.current.querySelector('[data-legend-content]') as HTMLElement;
        const wasLegendHidden = legendContent && legendContent.style.display === 'none';
        if (legendContent && wasLegendHidden) {
          legendContent.style.display = 'block';
        }

        // Step 3: Capture the entire container with html-to-image
        screenshotData = await toPng(mapContainerRef.current, {
          quality: 0.9,
          pixelRatio: 1,
          cacheBust: false,
          skipFonts: true,
          filter: (node) => {
            if (node.classList) {
              if (node.classList.contains('temp-screenshot-canvas')) return true;
              return !node.classList.contains('maplibregl-ctrl') &&
                     !node.classList.contains('mapboxgl-ctrl');
            }
            return true;
          },
        });

        // Step 4: Clean up
        tempImg.remove();
        if (mapCanvas) {
          (mapCanvas as HTMLElement).style.opacity = '1';
        }

        // Restore legend state
        if (legendContent && wasLegendHidden) {
          legendContent.style.display = 'none';
        }

        console.log("Cleanup complete");

        // Verify screenshot
        if (!screenshotData || screenshotData === "data:,") {
          throw new Error("Screenshot is empty");
        }

        const base64Length = screenshotData.replace(/^data:image\/\w+;base64,/, "").length;

        console.log("Screenshot captured successfully:", {
          totalSize: screenshotData.length,
          base64Size: base64Length,
          preview: screenshotData.substring(0, 100),
        });

        if (base64Length < 1000) {
          throw new Error("Screenshot appears to be blank.");
        }

      } catch (error) {
        console.error("Screenshot capture error:", error);
        // Clean up in case of error
        const tempImg = mapContainerRef.current?.querySelector('.temp-screenshot-canvas');
        if (tempImg) tempImg.remove();
        const mapCanvas = mapContainerRef.current?.querySelector('canvas');
        if (mapCanvas) (mapCanvas as HTMLElement).style.opacity = '1';

        // Restore legend state even on error
        const legendContent = mapContainerRef.current?.querySelector('[data-legend-content]') as HTMLElement;
        if (legendContent && legendContent.style.display === 'block') {
          // Check if it should be hidden (data-collapsed attribute)
          const legendContainer = mapContainerRef.current?.querySelector('[data-legend-container]');
          if (legendContainer?.getAttribute('data-collapsed') === 'true') {
            legendContent.style.display = 'none';
          }
        }

        throw new Error(
          "Failed to capture map screenshot. Please ensure the map is fully loaded and try again."
        );
      }

      // Calculate farm bounds for grid coordinate calculations
      const allCoords: number[][] = [];
      zones.forEach((zone) => {
        const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
        if (geom.type === 'Point') {
          allCoords.push(geom.coordinates);
        } else if (geom.type === 'LineString') {
          allCoords.push(...geom.coordinates);
        } else if (geom.type === 'Polygon') {
          allCoords.push(...geom.coordinates[0]);
        }
      });

      const farmBounds = allCoords.length > 0 ? {
        north: Math.max(...allCoords.map(c => c[1])),
        south: Math.min(...allCoords.map(c => c[1])),
        east: Math.max(...allCoords.map(c => c[0])),
        west: Math.min(...allCoords.map(c => c[0])),
      } : {
        north: farm.center_lat + 0.001,
        south: farm.center_lat - 0.001,
        east: farm.center_lng + 0.001,
        west: farm.center_lng - 0.001,
      };

      // Get AI analysis - send image data, zones with grid coordinates, and map layer context
      const analyzeRes = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: farm.id,
          conversationId,
          query,
          imageData: screenshotData,
          mapLayer: currentMapLayer,
          zones: zones.map((zone) => {
            const geom = typeof zone.geometry === 'string' ? JSON.parse(zone.geometry) : zone.geometry;
            const gridCells = calculateGridCoordinates(geom, farmBounds, 'imperial');
            const gridRange = formatGridRange(gridCells);

            return {
              type: zone.zone_type,
              name:
                zone.name ||
                (zone.properties ? JSON.parse(zone.properties).name : null) ||
                "Unlabeled",
              geometryType: geom.type,
              gridCoordinates: gridRange,
              gridCells: gridCells,
            };
          }),
        }),
      });

      if (!analyzeRes.ok) {
        throw new Error("Analysis failed");
      }

      const data = await analyzeRes.json();
      return {
        response: data.response,
        conversationId: data.conversationId,
        analysisId: data.analysisId,
        screenshot: screenshotData,
      };
    },
    [farm.id, currentMapLayer, zones, mapContainerRef, mapRef]
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold flex items-center gap-2">
            {farm.name}
            {hasUnsavedChanges && (
              <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {farm.description || "No description"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              {saving && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Auto-saving...
                </span>
              )}
              <Button onClick={() => handleSave(true)} disabled={saving}>
                <SaveIcon className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Now"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                title="Delete Farm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div
          ref={mapContainerRef}
          className="flex-1 min-h-[400px] md:min-h-0 relative"
        >
          <FarmMap
            farm={farm}
            zones={zones}
            onZonesChange={handleZonesChange}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            onMapLayerChange={setCurrentMapLayer}
          />
        </div>
        <div
          className={`w-full md:w-96 border-t md:border-t-0 md:border-l border-border max-h-[400px] md:max-h-none overflow-y-auto transition-transform duration-300 ease-in-out ${
            isChatOpen
              ? "translate-x-0"
              : "translate-x-full md:translate-x-0"
          } fixed md:static top-0 right-0 h-full bg-card z-50`}
        >
          <EnhancedChatPanel farmId={farm.id} onAnalyze={handleAnalyze} />
        </div>
      </div>

      {/* Delete Farm Dialog */}
      <DeleteFarmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        farmName={farm.name}
        farmId={farm.id}
        onDeleteSuccess={() => {
          router.push("/dashboard");
        }}
      />
    </div>
  );
}

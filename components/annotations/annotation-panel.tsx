'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import { DeleteFeatureDialog } from '@/components/shared/delete-feature-dialog';
import { MediaGallery } from '@/components/annotations/media-gallery';
import { MediaUploadButton } from '@/components/annotations/media-upload-button';
import { AnnotationEditForm } from '@/components/annotations/annotation-edit-form';

interface AnnotationPanelProps {
  farmId: string;
  featureId: string;
  featureType: 'zone' | 'planting' | 'line';
  onClose?: () => void;
}

export function AnnotationPanel({
  farmId,
  featureId,
  featureType,
  onClose
}: AnnotationPanelProps) {
  const [annotation, setAnnotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [featureName, setFeatureName] = useState<string>();

  useEffect(() => {
    loadAnnotation();
    loadFeatureDetails();
  }, [farmId, featureId, featureType]);

  async function loadAnnotation() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/farms/${farmId}/annotations?feature_id=${featureId}&feature_type=${featureType}`
      );
      const data = await response.json();

      if (data.annotations.length > 0) {
        setAnnotation(data.annotations[0]);
      } else {
        // No annotation yet, show create form
        setAnnotation(null);
      }
    } catch (error) {
      console.error('Failed to load annotation:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeatureDetails() {
    try {
      let endpoint = '';
      if (featureType === 'zone') {
        endpoint = `/api/farms/${farmId}/zones`;
      } else if (featureType === 'planting') {
        endpoint = `/api/farms/${farmId}/plantings`;
      }

      if (endpoint) {
        const response = await fetch(endpoint);
        const data = await response.json();
        const features = featureType === 'zone' ? data.zones : data.plantings;
        const feature = features?.find((f: any) => f.id === featureId);
        if (feature) {
          setFeatureName(feature.name || feature.common_name);
        }
      }
    } catch (error) {
      console.error('Failed to load feature details:', error);
    }
  }

  const handleDeleteSuccess = () => {
    if (onClose) {
      onClose();
    }
    // The parent should refresh the map
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {featureName || 'Feature Details'}
        </h3>
        <div className="flex items-center gap-2">
          {annotation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {annotation ? (
        editing ? (
          <AnnotationEditForm
            farmId={farmId}
            featureId={featureId}
            featureType={featureType}
            existingAnnotation={annotation}
            onSaved={(savedAnnotation) => {
              setAnnotation(savedAnnotation);
              setEditing(false);
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Design Rationale */}
            <div>
              <h4 className="text-sm font-medium mb-2">Why is this here?</h4>
              <p className="text-sm text-muted-foreground">
                {annotation.design_rationale}
              </p>
            </div>

            {/* Rich Notes */}
            {annotation.rich_notes && (
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <div className="text-sm prose prose-sm max-w-none">
                  {annotation.rich_notes}
                </div>
              </div>
            )}

            {/* Tags */}
            {annotation.tags && annotation.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {annotation.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Media Gallery */}
            <MediaGallery annotationId={annotation.id} editable />

            {/* Media Upload */}
            <MediaUploadButton
              annotationId={annotation.id}
              onUploaded={loadAnnotation}
            />
          </div>
        )
      ) : (
        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground text-center mb-2">
            No details added yet. Add annotation details below.
          </p>
          <AnnotationEditForm
            farmId={farmId}
            featureId={featureId}
            featureType={featureType}
            onSaved={(savedAnnotation) => {
              setAnnotation(savedAnnotation);
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteFeatureDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        farmId={farmId}
        featureId={featureId}
        featureType={featureType}
        featureName={featureName}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api/fetch-with-retry';
import { getOperationError } from '@/lib/api/error-messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { Feature, Polygon } from 'geojson';

const BoundaryDrawer = dynamic(
  () => import('@/components/map/boundary-drawer').then((mod) => mod.BoundaryDrawer),
  { ssr: false }
);

export default function NewPracticeFarmPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [boundary, setBoundary] = useState<{ feature: Feature<Polygon>; areaAcres: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { isOffline } = useOnlineStatus();

  const handleBoundaryComplete = useCallback((feature: Feature<Polygon>, areaAcres: number) => {
    setBoundary({ feature, areaAcres });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name for your practice farm',
        variant: 'destructive',
      });
      return;
    }

    if (!boundary) {
      toast({
        title: 'Validation Error',
        description: 'Please draw your practice farm boundary on the map',
        variant: 'destructive',
      });
      return;
    }

    // Check if offline - can't queue this operation because we need the ID to redirect
    if (isOffline) {
      toast({
        title: 'You\'re Offline',
        description: 'Creating a practice farm requires an internet connection. Please check your connection and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create practice farm with boundary
      const data = await apiFetch<{ id: string }>(
        '/api/learning/practice-farms',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            boundary_geometry: JSON.stringify(boundary.feature.geometry),
            acres: boundary.areaAcres,
          }),
          maxRetries: 2,
        }
      );

      toast({
        title: 'Success!',
        description: 'Practice farm created successfully',
      });

      // Redirect to the practice farm editor
      router.push(`/learn/practice-farms/${data.id}`);
    } catch (error: any) {
      const friendlyError = getOperationError('create-practice-farm', error);
      toast({
        title: friendlyError.title,
        description: friendlyError.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Create Practice Farm</h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Set up a sandbox environment to practice permaculture design
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Practice Farm Details</CardTitle>
            <CardDescription>
              Give your practice farm a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Farm Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Zone 1 Kitchen Garden Practice"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what you're practicing or experimenting with..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 characters
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Boundary Drawing Card */}
        <Card>
          <CardHeader>
            <CardTitle>Draw Farm Boundary *</CardTitle>
            <CardDescription>
              Draw the boundary of your practice farm on the map. This defines the land area that
              the AI will use to understand your design.
              {boundary && (
                <span className="block mt-2 text-green-600 dark:text-green-400 font-medium">
                  ✓ Boundary set: {boundary.areaAcres.toFixed(2)} acres
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-lg overflow-hidden border">
              <BoundaryDrawer onBoundaryComplete={handleBoundaryComplete} />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            className="min-h-[44px] sm:min-w-[100px] touch-manipulation"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !boundary || isOffline}
            className="flex-1 min-h-[44px] touch-manipulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : isOffline ? (
              <>
                <WifiOff className="h-5 w-5 mr-2 opacity-50" />
                Offline - Connection Required
              </>
            ) : !boundary ? (
              <>
                <MapPin className="h-5 w-5 mr-2" />
                Draw Boundary First
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5 mr-2" />
                Create Practice Farm
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <Card className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-primary font-semibold">1.</span>
              <span>
                <strong>Name your practice farm</strong> - Give it a descriptive name
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">2.</span>
              <span>
                <strong>Draw your boundary</strong> - Use the map to define your practice area. The AI
                needs this to understand your land boundaries.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">3.</span>
              <span>
                <strong>Design your farm</strong> - Add zones and plantings in the editor
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-semibold">4.</span>
              <span>
                <strong>Submit for AI review</strong> - Get feedback and earn 100-500 XP!
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

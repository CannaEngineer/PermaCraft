'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  Loader2,
  Lock,
  Footprints,
  TreePine,
  Mountain,
  ArrowLeft,
  Send,
  User,
  Navigation,
  Flower2,
  Droplets,
  Home,
  Dog,
  Recycle,
  Flag,
  Waypoints,
  Share2,
  Sun,
} from 'lucide-react';
import Link from 'next/link';

interface TourData {
  tour: any;
  stops: any[];
  farm: {
    name: string;
    lat: number;
    lng: number;
    zoom: number;
    acres: number | null;
    description: string | null;
    owner_name: string;
    owner_image: string | null;
  };
}

const STOP_ICONS: Record<string, typeof MapPin> = {
  point_of_interest: Star,
  garden_bed: Flower2,
  water_feature: Droplets,
  structure: Home,
  food_forest: TreePine,
  animal_area: Dog,
  composting: Recycle,
  welcome: Flag,
  farewell: Waypoints,
  custom: MapPin,
};

const DIFFICULTY_ICONS: Record<string, typeof Footprints> = {
  easy: Footprints,
  moderate: TreePine,
  challenging: Mountain,
};

interface TourVisitorExperienceProps {
  slug: string;
}

export function TourVisitorExperience({ slug }: TourVisitorExperienceProps) {
  const [tourData, setTourData] = useState<TourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password protection
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordPreview, setPasswordPreview] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Tour state
  const [started, setStarted] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [visitedStops, setVisitedStops] = useState<string[]>([]);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  // Feedback
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const fetchTour = useCallback(async (pw?: string) => {
    setLoading(true);
    try {
      const url = pw
        ? `/api/tours/${slug}?password=${encodeURIComponent(pw)}`
        : `/api/tours/${slug}`;
      const res = await fetch(url);

      if (res.status === 401) {
        const data = await res.json();
        if (data.requires_password) {
          setNeedsPassword(true);
          setPasswordPreview(data.tour);
          if (pw) setPasswordError(true);
          setLoading(false);
          return;
        }
      }

      if (res.status === 404) {
        setError('Tour not found');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError('Failed to load tour');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setTourData(data);
      setNeedsPassword(false);
    } catch {
      setError('Failed to load tour');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  const handlePasswordSubmit = () => {
    setPasswordError(false);
    fetchTour(password);
  };

  const handleStartTour = async () => {
    if (!tourData) return;
    setStarted(true);

    // Register visit
    try {
      const deviceType = /Mobi|Android/i.test(navigator.userAgent)
        ? 'mobile'
        : /Tablet|iPad/i.test(navigator.userAgent)
          ? 'tablet' : 'desktop';

      const res = await fetch(`/api/farms/${tourData.tour.farm_id}/tours/${tourData.tour.id}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_type: deviceType,
          referrer: document.referrer || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessionToken(data.session_token);
      }
    } catch {
      // Silent fail - don't block the tour
    }
  };

  const handleVisitStop = (stopId: string) => {
    if (!visitedStops.includes(stopId)) {
      const newVisited = [...visitedStops, stopId];
      setVisitedStops(newVisited);

      // Update visit progress
      if (sessionToken && tourData) {
        fetch(`/api/farms/${tourData.tour.farm_id}/tours/${tourData.tour.id}/visits`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken,
            last_stop_id: stopId,
            stops_visited: newVisited,
          }),
        }).catch(() => {});
      }
    }
  };

  const handleNextStop = () => {
    if (!tourData) return;
    const nextIdx = currentStopIndex + 1;
    if (nextIdx < tourData.stops.length) {
      setCurrentStopIndex(nextIdx);
      handleVisitStop(tourData.stops[nextIdx].id);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrevStop = () => {
    if (currentStopIndex > 0) {
      setCurrentStopIndex(currentStopIndex - 1);
    }
  };

  const handleCompleteTour = () => {
    setCompleted(true);
    if (sessionToken && tourData) {
      fetch(`/api/farms/${tourData.tour.farm_id}/tours/${tourData.tour.id}/visits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, completed: true }),
      }).catch(() => {});
    }
  };

  const handleSendFeedback = async () => {
    if (!sessionToken || !tourData) return;
    try {
      await fetch(`/api/farms/${tourData.tour.farm_id}/tours/${tourData.tour.id}/visits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          rating: rating > 0 ? rating : null,
          feedback: feedback.trim() || null,
        }),
      });
      setFeedbackSent(true);
    } catch {
      alert('Failed to send feedback');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <MapPin className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h1 className="text-xl font-bold mb-2">{error}</h1>
        <p className="text-muted-foreground text-sm mb-6">This tour may have been removed or isn't published yet.</p>
        <Link href="/gallery">
          <Button variant="outline">Explore Farms</Button>
        </Link>
      </div>
    );
  }

  // Password gate
  if (needsPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-1">{passwordPreview?.title || 'Protected Tour'}</h1>
        <p className="text-muted-foreground text-sm mb-6 text-center max-w-md">
          {passwordPreview?.description || 'This tour requires a password to access.'}
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Input
            type="password"
            placeholder="Enter tour password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            autoFocus
          />
          {passwordError && (
            <p className="text-xs text-destructive">Incorrect password. Please try again.</p>
          )}
          <Button className="w-full" onClick={handlePasswordSubmit} disabled={!password.trim()}>
            Enter Tour
          </Button>
        </div>
      </div>
    );
  }

  if (!tourData) return null;

  const { tour, stops, farm } = tourData;
  const DiffIcon = DIFFICULTY_ICONS[tour.difficulty] || Footprints;

  // Share handler
  const handleShareTour = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: tour.title, text: tour.description || `Tour of ${farm.name}`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  // Landing / Welcome Screen
  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        {/* Cover Image */}
        {tour.cover_image_url && (
          <div className="relative h-48 sm:h-64 w-full overflow-hidden">
            <img
              src={tour.cover_image_url}
              alt={tour.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>
        )}

        {/* Hero */}
        <div className={`relative bg-gradient-to-b from-primary/10 to-background ${tour.cover_image_url ? 'pt-6' : 'pt-16'} pb-12 px-4`}>
          <div className="max-w-xl mx-auto text-center">
            <p className="text-sm text-muted-foreground mb-2">
              A tour of <span className="font-medium text-foreground">{farm.name}</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{tour.title}</h1>
            {tour.description && (
              <p className="text-muted-foreground max-w-md mx-auto mb-4">{tour.description}</p>
            )}

            {/* Seasonal Notes */}
            {tour.seasonal_notes && (
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-full px-3 py-1 mb-4">
                <Sun className="h-3 w-3" />
                {tour.seasonal_notes}
              </div>
            )}

            {/* Tour Info */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {stops.length} stops
              </span>
              {tour.estimated_duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{tour.estimated_duration_minutes} min
                </span>
              )}
              <span className="flex items-center gap-1 capitalize">
                <DiffIcon className="h-4 w-4" />
                {tour.difficulty}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button size="lg" onClick={handleStartTour} className="gap-2 px-8">
                <Navigation className="h-5 w-5" />
                Start Tour
              </Button>
              <Button size="lg" variant="outline" onClick={handleShareTour} title="Share this tour">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        {tour.welcome_message && (
          <div className="max-w-xl mx-auto px-4 py-6">
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm">{tour.welcome_message}</p>
            </div>
          </div>
        )}

        {/* Stop Preview */}
        <div className="max-w-xl mx-auto px-4 pb-12">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            What You'll See
          </h2>
          <div className="space-y-2">
            {stops.map((stop: any, idx: number) => {
              const Icon = STOP_ICONS[stop.stop_type] || MapPin;
              return (
                <div key={stop.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{stop.title}</span>
                  {stop.is_optional === 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">
                      optional
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Farm info footer */}
        <div className="border-t py-6 px-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{farm.name}</p>
              <p className="text-xs text-muted-foreground">by {farm.owner_name}</p>
            </div>
            <Link href="/gallery">
              <Button variant="ghost" size="sm" className="text-xs">
                Explore More Farms
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (completed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tour Complete!</h1>
        <p className="text-muted-foreground text-center max-w-md mb-2">
          {tour.completion_message || `Thanks for visiting ${farm.name}. We hope you enjoyed the tour!`}
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          You visited {visitedStops.length} of {stops.length} stops
        </p>

        {/* Feedback */}
        {!feedbackSent ? (
          <div className="w-full max-w-md space-y-4 border rounded-xl p-4">
            <h3 className="font-semibold text-sm">How was your experience?</h3>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className="p-1"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      n <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Any comments or suggestions? (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            <Button className="w-full gap-2" onClick={handleSendFeedback}>
              <Send className="h-4 w-4" />
              Send Feedback
            </Button>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 max-w-md w-full text-center">
            <p className="text-sm text-green-800 dark:text-green-300">
              Thank you for your feedback!
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-8 flex-wrap justify-center">
          <Button variant="outline" onClick={() => { setCompleted(false); setCurrentStopIndex(0); setStarted(false); }}>
            Restart Tour
          </Button>
          <Button variant="outline" onClick={handleShareTour} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            Share Tour
          </Button>
          <Link href="/gallery">
            <Button variant="ghost">Explore More Farms</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Active Tour - Stop View
  const currentStop = stops[currentStopIndex];
  const StopIcon = STOP_ICONS[currentStop?.stop_type] || MapPin;
  const isFirst = currentStopIndex === 0;
  const isLast = currentStopIndex === stops.length - 1;

  // Mark current stop as visited
  if (currentStop && !visitedStops.includes(currentStop.id)) {
    handleVisitStop(currentStop.id);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { setStarted(false); setCompleted(false); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {tour.title}
            </button>
            <span className="text-xs text-muted-foreground">
              {currentStopIndex + 1} / {stops.length}
            </span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentStopIndex + 1) / stops.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stop Content */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        {/* Stop Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
            {currentStopIndex + 1}
          </span>
          <StopIcon className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">
            {currentStop.stop_type.replace(/_/g, ' ')}
          </span>
          {currentStop.estimated_time_minutes && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5 ml-auto">
              <Clock className="h-3 w-3" />
              {currentStop.estimated_time_minutes} min
            </span>
          )}
        </div>

        <h2 className="text-2xl font-bold tracking-tight mb-3">{currentStop.title}</h2>

        {currentStop.description && (
          <p className="text-muted-foreground leading-relaxed mb-4">{currentStop.description}</p>
        )}

        {currentStop.rich_content && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
            {currentStop.rich_content}
          </div>
        )}

        {currentStop.seasonal_visibility && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {currentStop.seasonal_visibility}
            </p>
          </div>
        )}

        {/* Stop dot indicators */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {stops.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => { setCurrentStopIndex(i); handleVisitStop(stops[i].id); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStopIndex
                  ? 'bg-primary w-4'
                  : visitedStops.includes(stops[i].id)
                    ? 'bg-primary/40'
                    : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevStop}
            disabled={isFirst}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLast ? (
            <Button onClick={handleCompleteTour} className="gap-1.5">
              Complete Tour
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleNextStop} className="gap-1.5">
              Next Stop
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

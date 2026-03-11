'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Navigation,
  Flower2,
  Droplets,
  Home,
  Dog,
  Recycle,
  Flag,
  Milestone,
  Monitor,
  Map,
  Share2,
  Router,
  HelpCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Facebook,
  Twitter,
  MessageCircle,
  Copy,
  Check,
  Compass,
} from 'lucide-react';
import Link from 'next/link';
import { TourNavigationView } from './tour-navigation-view';

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
  farewell: Milestone,
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

  // Navigation mode (in-person)
  const [navigationMode, setNavigationMode] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [showQuizResult, setShowQuizResult] = useState<string | null>(null);

  // Share
  const [showShare, setShowShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const handleStartTour = async (withNavigation = false) => {
    if (!tourData) return;
    setStarted(true);
    setNavigationMode(withNavigation);

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
      // Silent fail
    }
  };

  const handleVisitStop = (stopId: string) => {
    if (!visitedStops.includes(stopId)) {
      const newVisited = [...visitedStops, stopId];
      setVisitedStops(newVisited);

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
      setShowQuizResult(null);
    } else {
      handleCompleteTour();
    }
  };

  const handlePrevStop = () => {
    if (currentStopIndex > 0) {
      setCurrentStopIndex(currentStopIndex - 1);
      setShowQuizResult(null);
    }
  };

  const handleCompleteTour = () => {
    setCompleted(true);
    setNavigationMode(false);
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

  const handleQuizAnswer = (stopId: string, answerIndex: number) => {
    setQuizAnswers(prev => ({ ...prev, [stopId]: answerIndex }));
    setShowQuizResult(stopId);
  };

  const handleShare = () => {
    const tourUrl = typeof window !== 'undefined' ? `${window.location.origin}/tour/${slug}` : '';
    if (navigator.share) {
      navigator.share({
        title: tourData?.tour.title || 'Farm Tour',
        text: tourData?.tour.description || 'Check out this farm tour!',
        url: tourUrl,
      }).catch(() => {});
    } else {
      setShowShare(true);
    }
  };

  const handleCopyLink = () => {
    const tourUrl = `${window.location.origin}/tour/${slug}`;
    navigator.clipboard.writeText(tourUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
  const isInPerson = (tour.tour_type || 'in_person') === 'in_person';
  const isVirtual = (tour.tour_type || 'in_person') === 'virtual';
  const tourUrl = typeof window !== 'undefined' ? `${window.location.origin}/tour/${slug}` : '';

  // Landing / Welcome Screen
  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="relative bg-gradient-to-b from-primary/10 to-background pt-16 pb-12 px-4">
          <div className="max-w-xl mx-auto text-center">
            {/* Tour type badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                isVirtual
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {isVirtual ? <Monitor className="h-3 w-3" /> : <Map className="h-3 w-3" />}
                {isVirtual ? 'Virtual Tour' : 'In-Person Tour'}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              A tour of <span className="font-medium text-foreground">{farm.name}</span>
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">{tour.title}</h1>
            {tour.description && (
              <p className="text-muted-foreground max-w-md mx-auto mb-6">{tour.description}</p>
            )}

            {/* Tour Info */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-8 flex-wrap">
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
              <span className="flex items-center gap-1">
                <DiffIcon className="h-4 w-4" />
                {tour.difficulty}
              </span>
              {isInPerson && tour.total_distance_meters && (
                <span className="flex items-center gap-1">
                  <Router className="h-4 w-4" />
                  {tour.total_distance_meters < 1000
                    ? `${Math.round(tour.total_distance_meters)}m`
                    : `${(tour.total_distance_meters / 1000).toFixed(1)}km`}
                </span>
              )}
              {isInPerson && tour.route_mode && (
                <span className="flex items-center gap-1 capitalize">
                  <Compass className="h-4 w-4" />
                  {tour.route_mode}
                </span>
              )}
            </div>

            {/* Start buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isInPerson ? (
                <>
                  <Button size="lg" onClick={() => handleStartTour(true)} className="gap-2 px-8">
                    <Navigation className="h-5 w-5" />
                    Start with Navigation
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => handleStartTour(false)} className="gap-2 px-6">
                    <Footprints className="h-5 w-5" />
                    Self-Guided
                  </Button>
                </>
              ) : (
                <Button size="lg" onClick={() => handleStartTour(false)} className="gap-2 px-8">
                  <Monitor className="h-5 w-5" />
                  Start Virtual Tour
                </Button>
              )}
            </div>

            {/* Share button */}
            <Button variant="ghost" size="sm" className="mt-4 gap-1.5 text-muted-foreground" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              Share this tour
            </Button>
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
            What You'll {isVirtual ? 'Explore' : 'See'}
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
                  <span className="text-sm font-medium flex-1">{stop.title}</span>
                  <div className="flex items-center gap-2">
                    {stop.quiz_question && (
                      <HelpCircle className="h-3.5 w-3.5 text-amber-500" title="Has quiz" />
                    )}
                    {stop.is_optional === 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        optional
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        {tour.tags && (() => {
          try {
            const tags = JSON.parse(tour.tags);
            if (Array.isArray(tags) && tags.length > 0) {
              return (
                <div className="max-w-xl mx-auto px-4 pb-8">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }
          } catch { /* ignore */ }
          return null;
        })()}

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

        {/* Share overlay */}
        {showShare && (
          <ShareOverlay
            tourUrl={tourUrl}
            tourTitle={tour.title}
            tourDesc={tour.description}
            onClose={() => setShowShare(false)}
          />
        )}
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
        <p className="text-sm text-muted-foreground mb-2">
          You visited {visitedStops.length} of {stops.length} stops
        </p>

        {/* Quiz Score */}
        {Object.keys(quizAnswers).length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 max-w-md w-full mb-4 text-center">
            <HelpCircle className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="font-semibold text-sm">
              Quiz Score: {
                Object.entries(quizAnswers).filter(([stopId, answer]) => {
                  const stop = stops.find((s: any) => s.id === stopId);
                  return stop && answer === stop.quiz_answer_index;
                }).length
              } / {Object.keys(quizAnswers).length} correct
            </p>
          </div>
        )}

        {/* Feedback */}
        {!feedbackSent ? (
          <div className="w-full max-w-md space-y-4 border rounded-xl p-4">
            <h3 className="font-semibold text-sm">How was your experience?</h3>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} className="p-1">
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
            <p className="text-sm text-green-800 dark:text-green-300">Thank you for your feedback!</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <Button variant="outline" onClick={() => { setCompleted(false); setCurrentStopIndex(0); setStarted(false); setQuizAnswers({}); }}>
            Restart Tour
          </Button>
          <Button variant="ghost" onClick={handleShare} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            Share Tour
          </Button>
          <Link href="/gallery">
            <Button variant="ghost">Explore More Farms</Button>
          </Link>
        </div>

        {showShare && (
          <ShareOverlay
            tourUrl={tourUrl}
            tourTitle={tour.title}
            tourDesc={tour.description}
            onClose={() => setShowShare(false)}
          />
        )}
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
    <div className={`min-h-screen bg-background flex flex-col ${navigationMode ? 'pb-48' : ''}`}>
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { setStarted(false); setCompleted(false); setNavigationMode(false); }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {tour.title}
            </button>
            <div className="flex items-center gap-2">
              {isInPerson && !navigationMode && (
                <button
                  onClick={() => setNavigationMode(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Navigation className="h-3 w-3" />
                  Navigate
                </button>
              )}
              {navigationMode && (
                <button
                  onClick={() => setNavigationMode(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Monitor className="h-3 w-3" />
                  Read Mode
                </button>
              )}
              <button onClick={handleShare} className="text-xs text-muted-foreground hover:text-foreground">
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-muted-foreground">
                {currentStopIndex + 1} / {stops.length}
              </span>
            </div>
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
        {/* Navigation directions for in-person tours */}
        {isInPerson && currentStop?.direction_from_previous && currentStopIndex > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4 flex items-start gap-2.5">
            <Router className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-0.5">
                Getting Here
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {currentStop.direction_from_previous}
              </p>
            </div>
          </div>
        )}

        {/* Navigation hint */}
        {isInPerson && currentStop?.navigation_hint && (
          <div className="bg-muted/50 rounded-lg p-2.5 mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{currentStop.navigation_hint}</p>
          </div>
        )}

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

        {/* Virtual tour media */}
        {isVirtual && currentStop.virtual_media_url && (
          <div className="mb-4 rounded-xl overflow-hidden border">
            {currentStop.virtual_media_type === 'embed' ? (
              <iframe
                src={currentStop.virtual_media_url}
                className="w-full aspect-video"
                allowFullScreen
                loading="lazy"
              />
            ) : currentStop.virtual_media_type?.includes('video') ? (
              <video
                src={currentStop.virtual_media_url}
                controls
                className="w-full"
                playsInline
              />
            ) : (
              <img
                src={currentStop.virtual_media_url}
                alt={currentStop.title}
                className="w-full object-cover max-h-80"
                loading="lazy"
              />
            )}
          </div>
        )}

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

        {/* Quiz */}
        {currentStop.quiz_question && (
          <div className="border rounded-xl p-4 mb-4 bg-amber-50/30 dark:bg-amber-950/10">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-sm">Quick Quiz</p>
            </div>
            <p className="text-sm mb-3">{currentStop.quiz_question}</p>
            <div className="space-y-2">
              {(() => {
                let options: string[] = [];
                try {
                  options = JSON.parse(currentStop.quiz_options || '[]');
                } catch { /* ignore */ }
                return options.map((opt: string, i: number) => {
                  const answered = quizAnswers[currentStop.id] != null;
                  const isSelected = quizAnswers[currentStop.id] === i;
                  const isCorrect = i === currentStop.quiz_answer_index;
                  const showResult = showQuizResult === currentStop.id;

                  return (
                    <button
                      key={i}
                      onClick={() => !answered && handleQuizAnswer(currentStop.id, i)}
                      disabled={answered}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        showResult && isCorrect
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                          : showResult && isSelected && !isCorrect
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                            : answered
                              ? 'border-muted bg-muted/30 text-muted-foreground'
                              : 'border-border hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 ${
                          showResult && isCorrect ? 'border-green-500 bg-green-500 text-white' :
                          showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-500 text-white' :
                          'border-muted-foreground/30'
                        }`}>
                          {showResult && isCorrect ? <CheckCircle className="h-3 w-3" /> :
                           showResult && isSelected && !isCorrect ? <XCircle className="h-3 w-3" /> :
                           String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            {showQuizResult === currentStop.id && (
              <p className={`text-xs mt-2 font-medium ${
                quizAnswers[currentStop.id] === currentStop.quiz_answer_index
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {quizAnswers[currentStop.id] === currentStop.quiz_answer_index
                  ? 'Correct! Well done.'
                  : 'Not quite, but now you know!'}
              </p>
            )}
          </div>
        )}

        {/* "Open in Maps" for in-person */}
        {isInPerson && currentStop.lat && currentStop.lng && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${currentStop.lat},${currentStop.lng}&travelmode=${tour.route_mode === 'driving' ? 'driving' : tour.route_mode === 'cycling' ? 'bicycling' : 'walking'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mb-4"
          >
            <Navigation className="h-3.5 w-3.5" />
            Open in Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Stop dot indicators */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {stops.map((_: any, i: number) => (
            <button
              key={i}
              onClick={() => { setCurrentStopIndex(i); handleVisitStop(stops[i].id); setShowQuizResult(null); }}
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

      {/* Navigation Footer (standard mode) */}
      {!navigationMode && (
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
      )}

      {/* Navigation View (in-person navigation mode) */}
      {navigationMode && (
        <TourNavigationView
          stops={stops}
          currentStopIndex={currentStopIndex}
          routeMode={tour.route_mode || 'walking'}
          onNavigateToStop={(idx) => {
            setCurrentStopIndex(idx);
            handleVisitStop(stops[idx].id);
            setShowQuizResult(null);
          }}
          onClose={handleCompleteTour}
          farmLat={farm.lat}
          farmLng={farm.lng}
        />
      )}

      {/* Share overlay */}
      {showShare && (
        <ShareOverlay
          tourUrl={tourUrl}
          tourTitle={tour.title}
          tourDesc={tour.description}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function ShareOverlay({
  tourUrl,
  tourTitle,
  tourDesc,
  onClose,
}: {
  tourUrl: string;
  tourTitle: string;
  tourDesc: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tourUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-background rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-lg">Share Tour</h3>

        {/* Copy link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 border rounded-lg text-sm truncate bg-muted/50">
            {tourUrl}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1 shrink-0">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tourUrl)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Facebook className="h-4 w-4" /> Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(tourUrl)}&text=${encodeURIComponent(tourTitle)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm hover:bg-sky-50 dark:hover:bg-sky-950/30"
          >
            <Twitter className="h-4 w-4" /> Twitter
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${tourTitle}\n${tourUrl}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm hover:bg-green-50 dark:hover:bg-green-950/30"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(tourTitle)}&body=${encodeURIComponent(`${tourUrl}`)}`}
            className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Send className="h-4 w-4" /> Email
          </a>
        </div>

        <Button variant="ghost" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

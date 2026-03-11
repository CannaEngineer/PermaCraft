'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, MapPin, MessageCircle, Share2, Send,
  Loader2, Leaf, ChevronRight,
} from 'lucide-react';
import { TourChat } from './tour-chat';
import { POI_CATEGORIES } from '@/lib/tour/utils';
import type { TourPoi, TourComment } from '@/lib/db/schema';

interface TourPoiClientProps {
  farmSlug: string;
  poiId: string;
}

export function TourPoiClient({ farmSlug, poiId }: TourPoiClientProps) {
  const router = useRouter();
  const [poi, setPoi] = useState<TourPoi | null>(null);
  const [comments, setComments] = useState<TourComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('tour_session_id') : null;
  const farmId = typeof window !== 'undefined' ? sessionStorage.getItem('tour_farm_id') : null;

  useEffect(() => {
    Promise.all([
      fetch(`/api/tour/pois/${poiId}`).then(r => r.json()),
      fetch(`/api/tour/pois/${poiId}/comments`).then(r => r.json()),
    ])
      .then(([poiData, commentData]) => {
        setPoi(poiData.poi || null);
        setComments(commentData.comments || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [poiId]);

  const submitComment = useCallback(async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tour/pois/${poiId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText.trim(),
          session_id: sessionId,
        }),
      });
      if (res.ok) {
        setCommentText('');
        // Track event
        if (sessionId && farmId) {
          fetch('/api/tour/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              events: [{
                session_id: sessionId,
                farm_id: farmId,
                poi_id: poiId,
                event_type: 'comment_submitted',
              }],
            }),
          }).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  }, [commentText, submitting, poiId, sessionId, farmId]);

  const handleShare = async () => {
    const url = `${window.location.origin}/tour/${farmSlug}/poi/${poiId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: poi?.name || 'Farm Tour POI', url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }

    if (sessionId && farmId) {
      fetch('/api/tour/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          farm_id: farmId,
          platform: typeof navigator.share === 'function' ? 'native' : 'copy_link',
        }),
      }).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!poi) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Stop Not Found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const category = POI_CATEGORIES[poi.category] || POI_CATEGORIES.general;
  const speciesList: string[] = poi.species_list ? JSON.parse(poi.species_list) : [];
  const mediaUrls: string[] = poi.media_urls ? JSON.parse(poi.media_urls) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold truncate">{poi.name}</h1>
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: category.color, color: category.color }}
          >
            {category.label}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Media gallery */}
        {mediaUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {mediaUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${poi.name} photo ${i + 1}`}
                className="w-64 h-48 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* Description */}
        {poi.description && (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            {poi.description.split('\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {/* Species */}
        {speciesList.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-600" />
                Species at this Stop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {speciesList.map((species, i) => (
                  <Badge key={i} variant="secondary">{species}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Chat prompt */}
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Have a question about this spot?</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Ask our AI tour guide about what you&apos;re seeing
                </p>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowChat(true)}
                >
                  Ask a Question <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div>
          <h3 className="font-semibold mb-3">Visitor Comments</h3>
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="p-3">
                    <p className="text-sm">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at * 1000).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
          )}

          {/* Add comment */}
          <div className="mt-3 flex gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave a comment..."
              className="min-h-[60px]"
              maxLength={1000}
            />
            <Button
              size="icon"
              className="flex-shrink-0"
              disabled={!commentText.trim() || submitting}
              onClick={submitComment}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Chat overlay */}
      {showChat && (
        <TourChat
          farmSlug={farmSlug}
          currentPoiId={poiId}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

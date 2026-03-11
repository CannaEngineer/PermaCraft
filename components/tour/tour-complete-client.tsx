'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Share2, Mail, MapPin, CheckCircle2, ExternalLink, Loader2,
} from 'lucide-react';

export function TourCompleteClient({ farmSlug }: { farmSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [visitedCount, setVisitedCount] = useState(0);

  const sessionId = typeof window !== 'undefined' ? sessionStorage.getItem('tour_session_id') : null;
  const farmId = typeof window !== 'undefined' ? sessionStorage.getItem('tour_farm_id') : null;

  useEffect(() => {
    // Track session end
    if (sessionId && farmId) {
      fetch('/api/tour/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          events: [{
            session_id: sessionId,
            farm_id: farmId,
            event_type: 'route_completed',
          }],
        }),
      }).catch(console.error);
    }
  }, [sessionId, farmId]);

  const handleShare = async (platform: string) => {
    const url = `${window.location.origin}/tour/${farmSlug}`;
    const text = `I just completed a self-guided farm tour! Check it out:`;

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({ title: 'Farm Tour', text, url });
      } catch {}
    } else if (platform === 'copy') {
      await navigator.clipboard.writeText(`${text} ${url}`);
    }

    if (sessionId && farmId) {
      fetch('/api/tour/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          farm_id: farmId,
          platform,
        }),
      }).catch(console.error);
    }
  };

  const handleEmailSummary = async () => {
    if (!email || sending) return;
    setSending(true);

    try {
      await fetch('/api/tour/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          farm_id: farmId,
          platform: 'email',
          email,
        }),
      });
      setEmailSent(true);
    } catch {
      // Silently handle
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-background">
      <div className="max-w-md mx-auto p-4 pt-12">
        {/* Completion card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Tour Complete!</h1>
          <p className="text-muted-foreground">
            Thanks for visiting! We hope you enjoyed exploring the farm.
          </p>
        </div>

        {/* Share card */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Your Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleShare('native')}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Tour Link
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleShare('copy')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </CardContent>
        </Card>

        {/* Email summary card */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Get a Visit Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <p className="text-sm text-green-600">
                Summary requested! When email is configured, you&apos;ll receive it shortly.
              </p>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  onClick={handleEmailSummary}
                  disabled={!email || sending}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return visit */}
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium mb-2">Come back anytime!</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/tour/${farmSlug}`)}
            >
              Start New Tour
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

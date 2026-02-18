'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Lightbulb, ThumbsUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { STORY_TYPOGRAPHY } from '@/lib/design/plant-story-tokens';
import type { Species, SpeciesTip } from '@/lib/db/schema';

interface CommunityData {
  tips: SpeciesTip[];
  farm_count: number;
  farms: { id: string; name: string }[];
}

export function InTheCommunityCard({ species }: { species: Species }) {
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [newTip, setNewTip] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommunity() {
      try {
        const [tipsRes, communityRes] = await Promise.all([
          fetch(`/api/species/${species.id}/tips`),
          fetch(`/api/species/${species.id}/community`),
        ]);

        const tips = tipsRes.ok ? (await tipsRes.json()).tips || [] : [];
        const communityData = communityRes.ok ? await communityRes.json() : { farm_count: 0, farms: [] };

        setCommunity({
          tips,
          farm_count: communityData.farm_count || 0,
          farms: communityData.farms || [],
        });
      } catch {
        setCommunity({ tips: [], farm_count: 0, farms: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchCommunity();
  }, [species.id]);

  const submitTip = async () => {
    if (!newTip.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/species/${species.id}/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newTip.trim() }),
      });
      if (res.ok) {
        const tip = await res.json();
        setCommunity((prev) => prev ? {
          ...prev,
          tips: [tip, ...prev.tips],
        } : prev);
        setNewTip('');
      }
    } catch {
      // Silent fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (tipId: string) => {
    try {
      await fetch(`/api/species/${species.id}/tips/${tipId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: 'upvote' }),
      });
      setCommunity((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tips: prev.tips.map(t =>
            t.id === tipId ? { ...t, upvote_count: t.upvote_count + 1 } : t
          ),
        };
      });
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-6 h-6 text-rose-600" />
          <span className={STORY_TYPOGRAPHY.label}>Community</span>
        </div>
        <h2 className={STORY_TYPOGRAPHY.cardTitle}>
          In the Community
        </h2>
      </div>

      {/* Farms Using This Species */}
      {community && community.farm_count > 0 && (
        <div className="rounded-xl border p-4">
          <p className="text-sm font-medium mb-2">
            {community.farm_count} farm{community.farm_count !== 1 ? 's' : ''} growing {species.common_name}
          </p>
          <div className="flex flex-wrap gap-2">
            {community.farms.slice(0, 5).map((farm) => (
              <Link key={farm.id} href={`/farm/${farm.id}`}>
                <Badge variant="outline" className="hover:bg-muted cursor-pointer">
                  {farm.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Growing Tips
        </h3>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : community?.tips && community.tips.length > 0 ? (
          <div className="space-y-2">
            {community.tips.slice(0, 5).map((tip) => (
              <div key={tip.id} className="rounded-lg border p-3 flex gap-3">
                <div className="flex-1">
                  <p className="text-sm">{tip.content}</p>
                </div>
                <button
                  onClick={() => handleVote(tip.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {tip.upvote_count}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No tips yet. Be the first to share!
          </p>
        )}

        {/* Add Tip Form */}
        <div className="flex gap-2">
          <Textarea
            placeholder={`Share a tip about growing ${species.common_name}...`}
            value={newTip}
            onChange={(e) => setNewTip(e.target.value)}
            className="min-h-[60px] text-sm"
            rows={2}
          />
          <Button
            size="icon"
            onClick={submitTip}
            disabled={submitting || !newTip.trim()}
            className="flex-shrink-0 self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Code2,
  Share2,
  Facebook,
  Twitter,
  Mail,
  MessageCircle,
  Link as LinkIcon,
} from 'lucide-react';
import type { FarmTour } from '@/lib/db/schema';

interface TourSharePanelProps {
  tour: FarmTour;
  onBack: () => void;
}

export function TourSharePanel({ tour, onBack }: TourSharePanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const tourUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tour/${tour.share_slug}`
    : `/tour/${tour.share_slug}`;

  const tourTitle = tour.title;
  const tourDesc = tour.description || 'Check out this farm tour!';

  const embedCode = `<iframe src="${tourUrl}?embed=1" width="100%" height="600" frameborder="0" style="border-radius:12px;border:1px solid #e5e7eb;" allowfullscreen></iframe>`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const shareLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(tourUrl)}`,
      color: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30',
    },
    {
      name: 'Twitter / X',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${tourTitle} - ${tourDesc}`)}&url=${encodeURIComponent(tourUrl)}`,
      color: 'hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      url: `https://wa.me/?text=${encodeURIComponent(`${tourTitle}\n${tourUrl}`)}`,
      color: 'hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/30',
    },
    {
      name: 'Email',
      icon: Mail,
      url: `mailto:?subject=${encodeURIComponent(tourTitle)}&body=${encodeURIComponent(`Check out this farm tour:\n\n${tourTitle}\n${tourDesc}\n\n${tourUrl}`)}`,
      color: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30',
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Share Tour</h2>
          <p className="text-sm text-muted-foreground">{tour.title}</p>
        </div>
      </div>

      {/* Direct Link */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Tour Link</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/50">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{tourUrl}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => handleCopy(tourUrl, 'link')}
          >
            {copiedField === 'link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedField === 'link' ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Social Sharing */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Share on Social</Label>
        <div className="grid grid-cols-2 gap-2">
          {shareLinks.map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 px-4 py-3 border rounded-xl text-sm font-medium transition-colors ${link.color}`}
            >
              <link.icon className="h-4 w-4" />
              {link.name}
            </a>
          ))}
        </div>
      </div>

      {/* Native Share (mobile) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            navigator.share({
              title: tourTitle,
              text: tourDesc,
              url: tourUrl,
            }).catch(() => {});
          }}
        >
          <Share2 className="h-4 w-4" />
          Share via device
        </Button>
      )}

      {/* QR Code */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Label>
        <div className="border rounded-xl p-6 flex flex-col items-center gap-3 bg-white dark:bg-zinc-900">
          {/* SVG QR Code - simple representation using Google Charts API */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tourUrl)}&format=svg`}
            alt="Tour QR Code"
            className="w-48 h-48"
            loading="lazy"
          />
          <p className="text-xs text-muted-foreground text-center">
            Print this QR code and place it at your farm entrance for visitors to scan
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const link = document.createElement('a');
              link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(tourUrl)}&format=png`;
              link.download = `${tour.share_slug}-qr.png`;
              link.click();
            }}
          >
            Download QR Code
          </Button>
        </div>
      </div>

      {/* Embed Code */}
      {tour.embed_enabled !== 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Embed on Your Website
          </Label>
          <div className="relative">
            <Textarea
              value={embedCode}
              readOnly
              rows={3}
              className="font-mono text-xs resize-none bg-muted/50"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 gap-1 text-xs"
              onClick={() => handleCopy(embedCode, 'embed')}
            >
              {copiedField === 'embed' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copiedField === 'embed' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste this code into your website's HTML to embed this tour
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="pt-2">
        <a href={tourUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            Preview Tour Page
          </Button>
        </a>
      </div>
    </div>
  );
}

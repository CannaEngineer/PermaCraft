// components/shared/register-cta.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sprout, BookOpen, Store } from 'lucide-react';

const VARIANTS = {
  blog: {
    icon: BookOpen,
    headline: 'Earn XP for every article you read',
    body: 'Sign up to track your reading progress and unlock farm design tools.',
  },
  plants: {
    icon: Sprout,
    headline: 'Add plants to your farm design',
    body: 'Sign up to build your farm layout with the full plant database.',
  },
  shops: {
    icon: Store,
    headline: 'Sell your own produce',
    body: 'Sign up to create your farm shop and reach your community.',
  },
} as const;

interface RegisterCTAProps {
  variant: keyof typeof VARIANTS;
}

export function RegisterCTA({ variant }: RegisterCTAProps) {
  const { icon: Icon, headline, body } = VARIANTS[variant];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 pb-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <p className="font-semibold text-sm">{headline}</p>
        </div>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button asChild size="sm" className="w-fit">
          <Link href="/register">Get Started Free</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

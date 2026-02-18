interface PriceDisplayProps {
  cents: number;
  compareAtCents?: number | null;
  className?: string;
}

export function PriceDisplay({ cents, compareAtCents, className }: PriceDisplayProps) {
  const price = `$${(cents / 100).toFixed(2)}`;
  const compareAt = compareAtCents ? `$${(compareAtCents / 100).toFixed(2)}` : null;
  return (
    <span className={className}>
      <span className="font-semibold">{price}</span>
      {compareAt && <span className="ml-2 text-muted-foreground line-through text-sm">{compareAt}</span>}
    </span>
  );
}

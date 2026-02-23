'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CartIconButtonProps {
  onClick: () => void;
  className?: string;
}

export function CartIconButton({ onClick, className }: CartIconButtonProps) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    fetch('/api/cart')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) setCount(data.items.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    // Listen for cart updates
    const handler = () => fetchCount();
    window.addEventListener('cart-updated', handler);
    return () => window.removeEventListener('cart-updated', handler);
  }, [fetchCount]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors',
        className
      )}
      aria-label={`Cart${count > 0 ? ` (${count} items)` : ''}`}
    >
      <ShoppingCart className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

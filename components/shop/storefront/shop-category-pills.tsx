'use client';

import { Badge } from '@/components/ui/badge';

const CATEGORY_LABELS: Record<string, string> = {
  nursery_stock: 'Nursery Stock',
  seeds: 'Seeds',
  vegetable_box: 'Veg Box',
  cut_flowers: 'Cut Flowers',
  teas_herbs: 'Teas & Herbs',
  value_added: 'Value-Added',
  tour: 'Tours',
  event: 'Events',
  digital: 'Digital',
  other: 'Other',
};

interface ShopCategoryPillsProps {
  categories: string[];
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
  productCounts: Record<string, number>;
}

export function ShopCategoryPills({ categories, activeCategory, onSelect, productCounts }: ShopCategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className="shrink-0"
      >
        <Badge
          variant={activeCategory === null ? 'default' : 'outline'}
          className={`text-sm py-1.5 px-3 cursor-pointer transition-colors ${
            activeCategory === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          All
        </Badge>
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className="shrink-0"
        >
          <Badge
            variant={activeCategory === cat ? 'default' : 'outline'}
            className={`text-sm py-1.5 px-3 cursor-pointer transition-colors ${
              activeCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
            <span className="ml-1 opacity-70">({productCounts[cat] || 0})</span>
          </Badge>
        </button>
      ))}
    </div>
  );
}
